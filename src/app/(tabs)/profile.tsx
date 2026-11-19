import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';

import {
  AppIcon,
  Button,
  Screen,
  Text,
} from '@/components/ui';
import { useSession } from '@/features/auth';
import { useCatCollection } from '@/features/collection';
import { useWalkHistory } from '@/features/walk';
import { DEMO_AVATARS } from '@/lib/demo-data';
import { formatDistance } from '@/lib/format';

const SETTINGS_ITEMS = [
  {
    icon: 'walk' as const,
    title: 'Walk History',
    subtitle: 'Browse past walks, routes, and offline uploads',
    href: '/history' as const,
  },
  {
    icon: 'chart' as const,
    title: 'Activity Progress',
    subtitle: 'Weekly and 30-day personal walking summaries',
    href: '/history/progress' as const,
  },
  {
    icon: 'pin' as const,
    title: 'Permissions',
    subtitle: 'Manage Location and Health access',
    href: '/settings/permissions' as const,
  },
  {
    icon: 'lock' as const,
    title: 'Privacy',
    subtitle: 'Route trimming, friends feed & sharing defaults',
    href: '/settings/privacy' as const,
  },
  {
    icon: 'settings' as const,
    title: 'Account & Data',
    subtitle: 'Export or delete walks, sightings, and account data',
    href: '/settings/account' as const,
  },
  {
    icon: 'paw' as const,
    title: 'Cat Welfare Guide',
    subtitle: 'Respectful cat spotting and distance photography ethics',
    href: '/settings/welfare' as const,
  },
  {
    icon: 'mail' as const,
    title: 'Send Beta Feedback',
    subtitle: 'Report a bug, suggest features, or share thoughts',
    href: '/settings/feedback' as const,
  },
] as const;

function getInitials(displayName?: string | null, username?: string | null): string {
  const source = (displayName || username || 'W').trim();
  const parts = source.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function formatMemberSince(isoDate?: string | null): string {
  if (!isoDate) return 'Neighborhood Cat Spotter';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'Neighborhood Cat Spotter';
  return `Member since ${date.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  })}`;
}

export default function ProfileScreen() {
  const { user, profile, signOut } = useSession();
  const { data: collectionCards = [] } = useCatCollection('most_seen');
  const { walks } = useWalkHistory();

  const totalDistanceMeters = useMemo(
    () => walks.reduce((sum, w) => sum + (w.distance_m ?? 0), 0),
    [walks]
  );

  const displayName = profile?.display_name || profile?.username || 'Walker';
  const username = profile?.username ? `@${profile.username}` : user?.email ?? '';
  const initials = getInitials(profile?.display_name, profile?.username);
  const avatarUri = profile?.avatar_url || DEMO_AVATARS.mina;

  return (
    <Screen scroll padded={false} contentContainerClassName="bg-white dark:bg-[#12131C] pb-32">
      {/* 1. Deep Midnight-Ink Top Header with White Arched Dome */}
      <View className="bg-[#191A26] pt-3">
        <View className="flex-row items-center justify-between px-5 pb-4">
          <View className="w-12" />
          <Text className="text-lg font-extrabold text-white">
            {displayName}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
            onPress={() => router.push('/settings/edit-profile')}
            className="min-h-[34px] items-center justify-center rounded-pill border border-white/25 bg-[#252738] px-3.5">
            <Text className="text-xs font-bold text-[#F4A97B]">Edit</Text>
          </Pressable>
        </View>

        <View className="items-center pt-2">
          <View className="w-full items-center rounded-t-[200px] bg-white pt-6 dark:bg-[#12131C]">
            <View
              accessibilityLabel={`Avatar for ${displayName}`}
              className="h-32 w-32 items-center justify-center overflow-hidden rounded-pill border-[3px] border-[#191A26] bg-[#FAF8F5]">
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                />
              ) : (
                <Text variant="heading" className="text-3xl font-extrabold text-[#191A26]">
                  {initials}
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Main Content */}
      <View className="gap-5 px-5 pt-3">
        {/* 2. Username & Member Info */}
        <View className="items-center gap-0.5">
          <Text className="text-base font-extrabold text-[#191A26] dark:text-white">
            {username}
          </Text>
          <Text variant="caption" className="text-xs text-[#6E7085]">
            {formatMemberSince(profile?.created_at)}
          </Text>
        </View>

        {/* 3. Real Personal Stats (Cats Found | Walks | Total Distance) */}
        <View className="flex-row items-center justify-between gap-2.5">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View cats found"
            onPress={() => router.push('/collection')}
            className="flex-1 items-center rounded-[20px] border-[1.5px] border-[#191A26] bg-white py-3 dark:border-[#35384F] dark:bg-[#232536]">
            <Text className="font-display text-lg font-extrabold text-[#191A26] dark:text-white">
              {collectionCards.length}
            </Text>
            <Text className="text-[11px] font-semibold text-[#6E7085] dark:text-[#9EA1B8]">
              Cats Found
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View walk history"
            onPress={() => router.push('/history')}
            className="flex-1 items-center rounded-[20px] border-[1.5px] border-[#191A26] bg-white py-3 dark:border-[#35384F] dark:bg-[#232536]">
            <Text className="font-display text-lg font-extrabold text-[#191A26] dark:text-white">
              {walks.length}
            </Text>
            <Text className="text-[11px] font-semibold text-[#6E7085] dark:text-[#9EA1B8]">
              Walks
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View activity progress"
            onPress={() => router.push('/history/progress')}
            className="flex-1 items-center rounded-[20px] border-[1.5px] border-[#191A26] bg-white py-3 dark:border-[#35384F] dark:bg-[#232536]">
            <Text className="font-display text-lg font-extrabold text-[#191A26] dark:text-white">
              {formatDistance(totalDistanceMeters)}
            </Text>
            <Text className="text-[11px] font-semibold text-[#6E7085] dark:text-[#9EA1B8]">
              Total Dist
            </Text>
          </Pressable>
        </View>

        {/* 4. Midnight-Ink Settings Section */}
        <View className="gap-2.5 rounded-[28px] bg-[#191A26] p-4">
          <Text className="px-1 text-xs font-extrabold uppercase tracking-wider text-[#F4A97B]">
            Settings & Tools
          </Text>
          {SETTINGS_ITEMS.map((item) => (
            <Pressable
              key={item.title}
              accessibilityRole="button"
              accessibilityLabel={item.title}
              onPress={() => router.push(item.href as never)}
              className="active:opacity-80">
              <View className="flex-row items-center gap-3 rounded-pill border border-white/15 bg-[#232536] px-4 py-3">
                <View className="h-9 w-9 items-center justify-center rounded-pill bg-[#191A26]">
                  <AppIcon name={item.icon} size={16} color="#F4A97B" />
                </View>
                <View className="flex-1">
                  <Text
                    numberOfLines={1}
                    className="text-xs font-extrabold text-white">
                    {item.title}
                  </Text>
                  <Text
                    numberOfLines={1}
                    className="text-[10px] text-white/65">
                    {item.subtitle}
                  </Text>
                </View>
                <AppIcon name="chevronRight" size={14} color="#F4A97B" />
              </View>
            </Pressable>
          ))}
        </View>

        <Button
          label="Sign Out"
          variant="danger"
          onPress={() => {
            signOut().catch(() => {});
          }}
        />
      </View>
    </Screen>
  );
}
