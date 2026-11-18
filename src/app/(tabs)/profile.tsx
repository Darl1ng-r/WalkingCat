import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import {
  Button,
  Card,
  getActiveLeagueTier,
  LeagueEmblemRow,
  Screen,
  Text,
} from '@/components/ui';
import { useSession } from '@/features/auth';
import {
  getProfileTitleLabel,
  useCosmeticsOverview,
} from '@/features/cosmetics';
import { PointsChip, usePointsSummary } from '@/features/gamification';
import { DEMO_AVATARS } from '@/lib/demo-data';

const SETTINGS_ITEMS = [
  {
    emoji: '🎨',
    title: 'Themes & Cosmetics',
    subtitle: 'Unlock collectible cat card frames, profile banners, and walker titles',
    href: '/cosmetics' as const,
    enabled: true,
  },
  {
    emoji: '🏅',
    title: 'Achievements',
    subtitle: 'View unlocked badges and personal milestone goals',
    href: '/achievements' as const,
    enabled: true,
  },
  {
    emoji: '🎯',
    title: 'Challenges & Points',
    subtitle: 'Daily and weekly goals, Easy/Standard difficulty toggle',
    href: '/challenges' as const,
    enabled: true,
  },
  {
    emoji: '🥾',
    title: 'Walk History',
    subtitle: 'Browse past walks, routes, and offline uploads',
    href: '/history' as const,
    enabled: true,
  },
  {
    emoji: '📊',
    title: 'Activity Progress',
    subtitle: 'Weekly and 30-day personal walking summaries',
    href: '/history/progress' as const,
    enabled: true,
  },
  {
    emoji: '📍',
    title: 'Permissions',
    subtitle: 'Manage Location, Apple Health / Health Connect access',
    href: '/settings/permissions' as const,
    enabled: true,
  },
  {
    emoji: '🔒',
    title: 'Privacy',
    subtitle: 'Route trimming, leaderboard & sharing defaults',
    href: '/settings/privacy' as const,
    enabled: true,
  },
  {
    emoji: '⚙️',
    title: 'Account & Data',
    subtitle: 'Export or delete walks, sightings, and account data',
    href: '/settings/account' as const,
    enabled: true,
  },
  {
    emoji: '🐾',
    title: 'Cat Welfare Guide',
    subtitle: 'Respectful cat spotting and distance photography ethics',
    href: '/settings/welfare' as const,
    enabled: true,
  },
  {
    emoji: '💌',
    title: 'Send Beta Feedback',
    subtitle: 'Report a bug, suggest features, or share thoughts',
    href: '/settings/feedback' as const,
    enabled: true,
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
  if (!isoDate) return 'Member';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'Member';
  return `Member since ${date.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  })}`;
}

export default function ProfileScreen() {
  const { user, profile, signOut } = useSession();
  const { data: cosmeticsOverview } = useCosmeticsOverview();
  const { data: pointsSummary } = usePointsSummary();
  const pawBalance = pointsSummary?.totalPoints ?? 620;

  const displayName = profile?.display_name || profile?.username || 'Walker';
  const username = profile?.username ? `@${profile.username}` : user?.email ?? '';
  const initials = getInitials(profile?.display_name, profile?.username);
  const avatarUri = profile?.avatar_url || DEMO_AVATARS.mina;
  const titleLabel = getProfileTitleLabel(
    cosmeticsOverview?.equippedTitleId ?? profile?.equipped_title_id
  );
  const activeTier = getActiveLeagueTier(pawBalance);

  // Styled directly after the Reference Image's "Огурец" Profile Screen (Midnight-Ink Header + White Arched Dome + 3 Outlined Attribute Pills + Dark Midnight-Ink Action Rows)
  return (
    <Screen scroll padded={false} contentContainerClassName="bg-white dark:bg-[#12131C] pb-32">
      {/* 1. Deep Midnight-Ink Top Header with Large White Arched Dome */}
      <View className="bg-[#191A26] pt-3">
        <View className="flex-row items-center justify-between px-5 pb-4">
          <PointsChip />
          <Text className="text-lg font-extrabold text-white">
            {displayName}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
            onPress={() => router.push('/settings/edit-profile')}
            className="rounded-pill border border-white/30 bg-[#252738] px-3 py-1">
            <Text className="text-xs font-bold text-[#F4A97B]">Edit</Text>
          </Pressable>
        </View>

        <View className="items-center pt-2">
          <View className="w-full items-center rounded-t-[200px] bg-white pt-6 dark:bg-[#12131C]">
            <View className="flex-row items-center justify-center gap-4">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="View Achievements"
                onPress={() => router.push('/achievements')}
                className="mt-10 h-10 w-10 items-center justify-center rounded-pill border-[1.5px] border-[#191A26] bg-white">
                <Text className="text-sm">🏅</Text>
              </Pressable>

              <View
                accessibilityLabel={`Avatar for ${displayName}`}
                className="h-36 w-36 items-center justify-center overflow-hidden rounded-pill border-[3px] border-[#191A26] bg-[#FAF8F5]">
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

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="View Walk History"
                onPress={() => router.push('/history')}
                className="mt-10 h-10 w-10 items-center justify-center rounded-pill border-[1.5px] border-[#191A26] bg-white">
                <Text className="text-sm">🕒</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      {/* Main Content */}
      <View className="gap-5 px-5 pt-3">
        {/* 2. Centered Midnight-Ink Title Badge & Username */}
        <View className="items-center gap-1">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Customize banner and title"
            onPress={() => router.push('/cosmetics' as never)}
            className="rounded-pill border-[1.5px] border-[#191A26] bg-[#191A26] px-6 py-2">
            <Text className="text-xs font-extrabold text-white">
              {titleLabel} · 🎨
            </Text>
          </Pressable>
          <Text className="mt-1 text-base font-extrabold text-[#191A26] dark:text-white">
            {username}
          </Text>
          <Text variant="caption" className="text-xs text-[#6E7085]">
            {formatMemberSince(profile?.created_at)}
          </Text>
        </View>

        {/* 3. Three Outlined Pill Attribute Chips ("Черный | 10 месяцев | 14 кг" in Reference) */}
        <View className="flex-row items-center justify-between gap-2.5">
          <View className="flex-1 items-center rounded-pill border-[1.5px] border-[#191A26] bg-white py-2.5 dark:bg-[#191A26]">
            <Text className="text-xs font-extrabold text-[#191A26] dark:text-white">
              {activeTier.name}
            </Text>
            <Text className="text-[10px] font-semibold text-[#6E7085]">
              League
            </Text>
          </View>

          <View className="flex-1 items-center rounded-pill border-[1.5px] border-[#191A26] bg-white py-2.5 dark:bg-[#191A26]">
            <Text className="text-xs font-extrabold text-[#191A26] dark:text-white">
              {pawBalance} pts
            </Text>
            <Text className="text-[10px] font-semibold text-[#6E7085]">
              Balance
            </Text>
          </View>

          <View className="flex-1 items-center rounded-pill border-[1.5px] border-[#191A26] bg-white py-2.5 dark:bg-[#191A26]">
            <Text className="text-xs font-extrabold text-[#191A26] dark:text-white">
              {profile?.weight_kg ? `${profile.weight_kg} kg` : 'Standard'}
            </Text>
            <Text className="text-[10px] font-semibold text-[#6E7085]">
              Pace Mode
            </Text>
          </View>
        </View>

        {/* 4. Circular Blob-Cat League Progression */}
        <Card className="gap-2">
          <View className="flex-row items-center justify-between">
            <Text variant="label">League Progression</Text>
            <Text className="text-xs font-extrabold uppercase text-[#F4A97B]">
              {activeTier.name} League
            </Text>
          </View>
          <LeagueEmblemRow totalPoints={pawBalance} />
        </Card>

        {/* 5. Deep Midnight-Ink Settings Section ("Прививки 2 > / Посещение врача 3 >" in Reference Middle-Left Screen) */}
        <View className="gap-2.5 rounded-[28px] bg-[#191A26] p-4">
          <Text className="px-1 text-xs font-extrabold uppercase tracking-wider text-[#F4A97B]">
            Settings & Tools
          </Text>
          {SETTINGS_ITEMS.map((item) => (
            <Pressable
              key={item.title}
              accessibilityRole="button"
              accessibilityLabel={item.title}
              disabled={!item.enabled}
              onPress={() => {
                if (item.href) {
                  router.push(item.href as never);
                }
              }}
              className={item.enabled ? 'active:opacity-80' : 'opacity-70'}>
              <View className="flex-row items-center gap-3 rounded-pill border border-white/25 bg-[#232536] px-4 py-3">
                <View className="h-9 w-9 items-center justify-center rounded-pill bg-[#191A26]">
                  <Text className="text-base">{item.emoji}</Text>
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
                <Text className="text-sm font-black text-[#F4A97B]">›</Text>
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
