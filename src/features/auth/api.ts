import { supabase } from '@/lib/supabase';

import { mapAuthError } from './errors';
import type { Profile, ProfileUpdate } from './types';

export interface SignUpResult {
  requiresEmailConfirmation: boolean;
}

export async function signUp(email: string, password: string): Promise<SignUpResult> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
  });

  if (error) {
    throw new Error(mapAuthError(error));
  }

  return {
    requiresEmailConfirmation: Boolean(data.user && !data.session),
  };
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    throw new Error(mapAuthError(error));
  }
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(mapAuthError(error));
  }
}

export async function resetPassword(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim());

  if (error) {
    throw new Error(mapAuthError(error));
  }
}

export async function getMyProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(mapAuthError(error));
  }

  return data;
}

export async function updateMyProfile(
  userId: string,
  updates: ProfileUpdate
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select('*')
    .single();

  if (error) {
    throw new Error(mapAuthError(error));
  }

  return data;
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const trimmed = username.trim().toLowerCase();
  if (trimmed.length < 3 || trimmed.length > 20 || !/^[a-z0-9_]+$/.test(trimmed)) {
    return false;
  }

  const { data, error } = await supabase.rpc('is_username_available', {
    p_username: trimmed,
  });

  if (error) {
    throw new Error(mapAuthError(error));
  }

  return Boolean(data);
}
