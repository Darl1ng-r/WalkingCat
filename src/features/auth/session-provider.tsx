import { useQueryClient } from '@tanstack/react-query';
import type { Session, User } from '@supabase/supabase-js';
import { createContext, use, useCallback, useEffect, useState, type PropsWithChildren } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { demoState, isDemoMode } from '@/lib/demo-data';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';

import { getMyProfile, signOut as apiSignOut } from './api';
import type { Profile } from './types';

export interface SessionContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isOnboarded: boolean;
  refreshProfile: () => Promise<Profile | null>;
  enterDemoMode: () => void;
  signOut: () => Promise<void>;
}

function buildDemoSessionAndProfile(): { session: Session; profile: Profile } {
  const nowIso = new Date().toISOString();
  const demoUser: User = {
    id: demoState.userId,
    app_metadata: {},
    user_metadata: { display_name: demoState.displayName },
    aud: 'authenticated',
    created_at: '2026-09-15T10:00:00.000Z',
    email: 'mina@walkingcat.app',
  };
  const demoSession: Session = {
    access_token: 'demo-access-token',
    refresh_token: 'demo-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: demoUser,
  };
  const demoProfile: Profile = {
    id: demoState.userId,
    username: demoState.username,
    display_name: demoState.displayName,
    avatar_url: null,
    weight_kg: 64,
    challenge_difficulty: 'standard',
    equipped_banner_id: demoState.equippedBannerId,
    equipped_title_id: demoState.equippedTitleId,
    onboarded_at: '2026-09-15T10:05:00.000Z',
    created_at: '2026-09-15T10:00:00.000Z',
    updated_at: nowIso,
  };
  return { session: demoSession, profile: demoProfile };
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession(): SessionContextValue {
  const value = use(SessionContext);
  if (!value) {
    throw new Error('useSession must be used within a <SessionProvider />');
  }
  return value;
}

export function SessionProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      const fetched = await getMyProfile(userId);
      setProfile(fetched);
      return fetched;
    } catch (err) {
      logger.warn('Failed to load profile', { error: String(err) });
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async (): Promise<Profile | null> => {
    if (isDemoMode) {
      const { profile: demoProf } = buildDemoSessionAndProfile();
      setProfile(demoProf);
      return demoProf;
    }
    if (!session?.user?.id) {
      setProfile(null);
      return null;
    }
    return loadProfile(session.user.id);
  }, [session, loadProfile]);

  const enterDemoMode = useCallback(() => {
    const { session: demoSession, profile: demoProf } = buildDemoSessionAndProfile();
    setSession(demoSession);
    setProfile(demoProf);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      if (isDemoMode) {
        const { session: demoSession, profile: demoProf } =
          buildDemoSessionAndProfile();
        if (mounted) {
          setSession(demoSession);
          setProfile(demoProf);
          setIsLoading(false);
        }
        return;
      }

      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        if (!mounted) return;
        setSession(initialSession);

        if (initialSession?.user?.id) {
          await loadProfile(initialSession.user.id);
        }
      } catch (err) {
        logger.warn('Session bootstrap failed', { error: String(err) });
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    bootstrap();

    if (isDemoMode) {
      return () => {
        mounted = false;
      };
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);

      if (nextSession?.user?.id) {
        await loadProfile(nextSession.user.id);
      } else {
        setProfile(null);
        queryClient.clear();
      }
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile, queryClient]);

  useEffect(() => {
    const handleAppStateChange = (state: AppStateStatus) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

  const handleSignOut = useCallback(async () => {
    await apiSignOut();
    setSession(null);
    setProfile(null);
    queryClient.clear();
  }, [queryClient]);

  const user = session?.user ?? null;
  const isAuthenticated = Boolean(session && user);
  const isOnboarded = Boolean(profile?.onboarded_at);

  return (
    <SessionContext.Provider
      value={{
        session,
        user,
        profile,
        isLoading,
        isAuthenticated,
        isOnboarded,
        refreshProfile,
        enterDemoMode,
        signOut: handleSignOut,
      }}>
      {children}
    </SessionContext.Provider>
  );
}
