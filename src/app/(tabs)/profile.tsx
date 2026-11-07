import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Button, Card, Screen, Text } from '@/components/ui';
import { useSession } from '@/features/auth';
import {
  getProfileBannerTokens,
  getProfileTitleLabel,
  useCosmeticsOverview,
} from '@/features/cosmetics';

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

  const displayName = profile?.display_name || profile?.username || 'Walker';
  const username = profile?.username ? `@${profile.username}` : user?.email ?? '';
  const initials = getInitials(profile?.display_name, profile?.username);
  const banner = getProfileBannerTokens(
    cosmeticsOverview?.equippedBannerId ?? profile?.equipped_banner_id
  );
  const titleLabel = getProfileTitleLabel(
    cosmeticsOverview?.equippedTitleId ?? profile?.equipped_title_id
  );

  return (
    <Screen scroll contentContainerClassName="gap-6 pb-10">
      <View className="mt-2">
        <Text variant="label">Account</Text>
        <Text variant="title" className="mt-1">
          Profile
        </Text>
      </View>

      <Card className={`gap-3 border ${banner.bannerClass}`}>
        <View className="flex-row items-center gap-4">
          <View
            accessibilityLabel={`Avatar for ${displayName}`}
            className="h-16 w-16 items-center justify-center rounded-pill bg-primary-muted dark:bg-surface-elevated-dark">
            <Text variant="heading" className="text-primary-dark dark:text-primary-light">
              {initials}
            </Text>
          </View>

          <View className="flex-1">
            <Text variant="heading" numberOfLines={1}>
              {displayName}
            </Text>
            <Text variant="caption" numberOfLines={1}>
              {username}
            </Text>
            <Text variant="caption" className="mt-0.5 text-xs">
              {formatMemberSince(profile?.created_at)}
            </Text>
          </View>

          <Button
            label="Edit"
            size="sm"
            variant="ghost"
            onPress={() => router.push('/settings/edit-profile')}
          />
        </View>

        <View className="flex-row items-center justify-between border-t border-border/60 pt-2.5 dark:border-border-dark/60">
          <View className="rounded-pill bg-primary/15 px-3 py-1">
            <Text variant="caption" className="text-xs font-bold text-primary">
              {titleLabel}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Customize banner and title"
            onPress={() => router.push('/cosmetics' as never)}>
            <Text variant="caption" className="text-xs font-semibold text-primary">
              🎨 Customize →
            </Text>
          </Pressable>
        </View>
      </Card>

      <View className="gap-3">
        <Text variant="label">Settings</Text>
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
            <Card className="flex-row items-center gap-3">
              <Text className="text-2xl">{item.emoji}</Text>
              <View className="flex-1">
                <Text variant="body" className="font-semibold">
                  {item.title}
                </Text>
                <Text variant="caption" className="text-xs">
                  {item.subtitle}
                </Text>
              </View>
            </Card>
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
    </Screen>
  );
}
