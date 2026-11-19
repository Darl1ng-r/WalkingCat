import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, Share, View } from 'react-native';

import {
  AppIcon,
  Screen,
  Text,
  type AppIconName,
} from '@/components/ui';
import { useSession } from '@/features/auth';
import { useCatCollection } from '@/features/collection';
import {
  buildInviteDeepLink,
  useCreateInviteMutation,
  useFriendshipsOverview,
} from '@/features/social';
import { useWalkHistory } from '@/features/walk';
import { DEMO_AVATARS } from '@/lib/demo-data';
import { formatDistance } from '@/lib/format';

interface SettingsRowItem {
  icon: AppIconName;
  title: string;
  subtitle: string;
  href: string;
}

const PRIVACY_ACCOUNT_ITEMS: readonly SettingsRowItem[] = [
  {
    icon: 'lock',
    title: 'Privacy & Sharing',
    subtitle: 'Route trimming, friends feed & visibility',
    href: '/settings/privacy',
  },
  {
    icon: 'pin',
    title: 'Location & Health',
    subtitle: 'GPS tracking and Health app access',
    href: '/settings/permissions',
  },
  {
    icon: 'settings',
    title: 'Account & Data',
    subtitle: 'Export or delete your walks and account',
    href: '/settings/account',
  },
] as const;

const COMMUNITY_ITEMS: readonly SettingsRowItem[] = [
  {
    icon: 'paw',
    title: 'Cat Welfare Guide',
    subtitle: 'Respectful cat spotting & distance ethics',
    href: '/settings/welfare',
  },
  {
    icon: 'mail',
    title: 'Send Feedback',
    subtitle: 'Report a bug or suggest a feature',
    href: '/settings/feedback',
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
  return `Joined ${date.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  })}`;
}

function SettingsGroup({
  title,
  items,
}: {
  title: string;
  items: readonly SettingsRowItem[];
}) {
  return (
    <View className="gap-2">
      <Text className="px-1 text-xs font-extrabold uppercase tracking-wider text-[#6E7085] dark:text-[#9EA1B8]">
        {title}
      </Text>
      <View className="overflow-hidden rounded-[22px] border border-[#191A26]/12 bg-white dark:border-white/10 dark:bg-[#191A26]">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <Pressable
              key={item.title}
              accessibilityRole="button"
              accessibilityLabel={item.title}
              onPress={() => router.push(item.href as never)}
              className={`flex-row items-center gap-3.5 px-4 py-3.5 active:bg-[#FAF8F5] dark:active:bg-[#232536] ${
                isLast ? '' : 'border-b border-[#191A26]/8 dark:border-white/8'
              }`}>
              {/* Clean bare icon — no circle background */}
              <AppIcon name={item.icon} size={19} color="#191A26" />
              <View className="flex-1">
                <Text
                  numberOfLines={1}
                  className="text-sm font-bold text-[#191A26] dark:text-white">
                  {item.title}
                </Text>
                <Text
                  numberOfLines={1}
                  className="mt-0.5 text-xs text-[#6E7085] dark:text-[#9EA1B8]">
                  {item.subtitle}
                </Text>
              </View>
              <AppIcon name="chevronRight" size={14} color="#9EA1B8" />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, profile, signOut } = useSession();
  const { data: collectionCards = [] } = useCatCollection('most_seen');
  const { data: friendships } = useFriendshipsOverview();
  const { walks } = useWalkHistory();
  const createInviteMutation = useCreateInviteMutation();

  const totalDistanceMeters = useMemo(
    () => walks.reduce((sum, w) => sum + (w.distance_m ?? 0), 0),
    [walks]
  );

  const friendsCount = friendships?.acceptedFriends.length ?? 0;
  const displayName = profile?.display_name || profile?.username || 'Walker';
  const username = profile?.username ? `@${profile.username}` : user?.email ?? '';
  const initials = getInitials(profile?.display_name, profile?.username);
  const avatarUri = profile?.avatar_url || DEMO_AVATARS.mina;

  const handleShareProfile = async () => {
    try {
      const invite = await createInviteMutation.mutateAsync();
      const link = buildInviteDeepLink(invite.code);
      await Share.share({
        message: `Add me on StrayCat Walk! Use my invite code ${invite.code} or open ${link}`,
      }).catch(() => {});
    } catch {
      // Fallback: navigate to Friends tab
      router.push('/social');
    }
  };

  return (
    <Screen
      scroll
      padded={false}
      contentContainerClassName="bg-[#FAF8F5] dark:bg-[#12131C] pb-32">
      {/* 1. Compact Midnight-Ink Top Bar */}
      <View className="flex-row items-center justify-between bg-[#191A26] px-5 py-3.5">
        <Text className="font-display text-lg font-extrabold text-white">
          Profile
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit profile"
          onPress={() => router.push('/settings/edit-profile')}
          className="min-h-[34px] flex-row items-center gap-1.5 rounded-pill border border-white/20 bg-white/10 px-3.5">
          <AppIcon name="edit" size={13} color="#F4A97B" />
          <Text className="text-xs font-bold text-white">Edit</Text>
        </Pressable>
      </View>

      <View className="gap-5 px-4 pt-5">
        {/* 2. Clean Identity Card (Avatar + Name + Handle + Quick Share Invite) */}
        <View className="items-center gap-3 rounded-[24px] border border-[#191A26]/12 bg-white px-5 py-5 dark:border-white/10 dark:bg-[#191A26]">
          <View
            accessibilityLabel={`Avatar for ${displayName}`}
            className="h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-[#191A26] bg-[#FAF8F5]">
            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
            ) : (
              <Text variant="heading" className="text-2xl font-extrabold text-[#191A26]">
                {initials}
              </Text>
            )}
          </View>

          <View className="items-center gap-0.5">
            <Text className="font-display text-xl font-extrabold text-[#191A26] dark:text-white">
              {displayName}
            </Text>
            <Text className="text-xs font-semibold text-[#6E7085] dark:text-[#9EA1B8]">
              {username} · {formatMemberSince(profile?.created_at)}
            </Text>
          </View>

          {/* Unified 4-Stat Summary Row (Cats | Friends | Walks | Distance) */}
          <View className="mt-1 w-full flex-row items-center justify-between border-t border-[#191A26]/8 pt-4 dark:border-white/10">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View cats found"
              onPress={() => router.push('/collection')}
              className="flex-1 items-center">
              <Text className="font-display text-lg font-extrabold text-[#191A26] dark:text-white">
                {collectionCards.length}
              </Text>
              <Text className="text-[11px] font-medium text-[#6E7085] dark:text-[#9EA1B8]">
                Cats
              </Text>
            </Pressable>

            <View className="h-7 w-[1px] bg-[#191A26]/10 dark:bg-white/10" />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View friends"
              onPress={() => router.push('/social')}
              className="flex-1 items-center">
              <Text className="font-display text-lg font-extrabold text-[#191A26] dark:text-white">
                {friendsCount}
              </Text>
              <Text className="text-[11px] font-medium text-[#6E7085] dark:text-[#9EA1B8]">
                Friends
              </Text>
            </Pressable>

            <View className="h-7 w-[1px] bg-[#191A26]/10 dark:bg-white/10" />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View walk history"
              onPress={() => router.push('/history')}
              className="flex-1 items-center">
              <Text className="font-display text-lg font-extrabold text-[#191A26] dark:text-white">
                {walks.length}
              </Text>
              <Text className="text-[11px] font-medium text-[#6E7085] dark:text-[#9EA1B8]">
                Walks
              </Text>
            </Pressable>

            <View className="h-7 w-[1px] bg-[#191A26]/10 dark:bg-white/10" />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View activity progress"
              onPress={() => router.push('/history/progress')}
              className="flex-1 items-center">
              <Text className="font-display text-lg font-extrabold text-[#191A26] dark:text-white">
                {(totalDistanceMeters / 1000).toFixed(1)}
              </Text>
              <Text className="text-[11px] font-medium text-[#6E7085] dark:text-[#9EA1B8]">
                km
              </Text>
            </Pressable>
          </View>

          {/* Quick Invite Friend CTA */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Invite a friend to StrayCat Walk"
            onPress={handleShareProfile}
            className="mt-1 min-h-[42px] w-full flex-row items-center justify-center gap-2 rounded-pill border-[1.5px] border-[#191A26] bg-[#F4A97B] px-4 py-2 active:opacity-90">
            <AppIcon name="share" size={15} color="#191A26" />
            <Text className="text-xs font-extrabold text-[#191A26]">
              Invite Friends to Spot Cats
            </Text>
          </Pressable>
        </View>

        {/* 3. Personal Activity Shortcut Card (Clean, Light, No Duplicate Clutter) */}
        <View className="gap-2">
          <Text className="px-1 text-xs font-extrabold uppercase tracking-wider text-[#6E7085] dark:text-[#9EA1B8]">
            Your Activity
          </Text>
          <View className="flex-row gap-3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Walk History"
              onPress={() => router.push('/history')}
              className="flex-1 flex-row items-center gap-3 rounded-[20px] border border-[#191A26]/12 bg-white px-4 py-3.5 active:bg-[#FAF8F5] dark:border-white/10 dark:bg-[#191A26]">
              <AppIcon name="walk" size={19} color="#191A26" />
              <View className="flex-1">
                <Text className="text-sm font-bold text-[#191A26] dark:text-white">
                  Walks
                </Text>
                <Text className="text-[11px] text-[#6E7085] dark:text-[#9EA1B8]">
                  {formatDistance(totalDistanceMeters)}
                </Text>
              </View>
              <AppIcon name="chevronRight" size={13} color="#9EA1B8" />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Activity Progress"
              onPress={() => router.push('/history/progress')}
              className="flex-1 flex-row items-center gap-3 rounded-[20px] border border-[#191A26]/12 bg-white px-4 py-3.5 active:bg-[#FAF8F5] dark:border-white/10 dark:bg-[#191A26]">
              <AppIcon name="chart" size={19} color="#191A26" />
              <View className="flex-1">
                <Text className="text-sm font-bold text-[#191A26] dark:text-white">
                  Stats
                </Text>
                <Text className="text-[11px] text-[#6E7085] dark:text-[#9EA1B8]">
                  30-day trend
                </Text>
              </View>
              <AppIcon name="chevronRight" size={13} color="#9EA1B8" />
            </Pressable>
          </View>
        </View>

        {/* 4. Grouped Settings — Privacy & Account */}
        <SettingsGroup title="Privacy & Account" items={PRIVACY_ACCOUNT_ITEMS} />

        {/* 5. Grouped Settings — Community & Support */}
        <SettingsGroup title="Community & Support" items={COMMUNITY_ITEMS} />

        {/* 6. Calm, Subtle Sign Out Action */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign Out"
          onPress={() => {
            signOut().catch(() => {});
          }}
          className="min-h-[46px] items-center justify-center rounded-[20px] border border-danger/25 bg-white py-3 active:bg-danger-muted dark:bg-[#191A26]">
          <Text className="text-sm font-bold text-danger">Sign Out</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
