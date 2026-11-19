import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, View } from 'react-native';

import {
  AppIcon,
  Button,
  Card,
  EmptyState,
  Input,
  Screen,
  SegmentedControl,
  Text,
} from '@/components/ui';
import { useSession } from '@/features/auth';
import {
  ReportModal,
  type ReportTargetType,
} from '@/features/privacy';
import {
  buildInviteDeepLink,
  formatLeaderboardValue,
  useCreateInviteMutation,
  useFriendActivityEvents,
  useFriendshipsOverview,
  useFriendsLeaderboard,
  useRedeemInviteMutation,
  useRemoveFriendshipMutation,
  useRespondFriendRequestMutation,
  useSendFriendRequestMutation,
  useShowOnLeaderboardSetting,
  useToggleReactionMutation,
  useUsernameSearch,
  type ActivityEventItem,
  type LeaderboardWeekPeriod,
} from '@/features/social';
import { DEMO_AVATARS, demoState } from '@/lib/demo-data';

type FriendsSection = 'discovery' | 'ranking' | 'manage';

// Clean dark route map SVG for friend discovery carousels
function makeFriendRouteSvgUri(variant: number): string {
  const paths = [
    'M28,175 C55,165 65,125 95,120 C125,115 135,148 160,122 C180,100 165,65 190,48',
    'M35,168 C48,132 82,136 104,104 C126,72 152,96 178,62',
    'M26,148 C64,158 76,100 112,92 C148,84 156,120 188,70',
  ];
  const path = paths[variant % paths.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="240" viewBox="0 0 220 240">
    <rect width="220" height="240" rx="22" fill="#191A26" />
    <path d="M0,48 L220,48 M0,96 L220,96 M0,144 L220,144 M0,192 L220,192 M44,0 L44,240 M88,0 L88,240 M132,0 L132,240 M176,0 L176,240" stroke="#FFFFFF" stroke-opacity="0.06" stroke-width="1" />
    <path d="${path}" fill="none" stroke="#F4A97B" stroke-width="5" stroke-linecap="round" />
    <circle cx="95" cy="120" r="8" fill="#F4A97B" stroke="#191A26" stroke-width="2.5" />
    <circle cx="160" cy="122" r="8" fill="#F4A97B" stroke="#191A26" stroke-width="2.5" />
    <circle cx="190" cy="48" r="6" fill="#FFFFFF" stroke="#191A26" stroke-width="2" />
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const DEMO_CAT_PHOTOS = [
  '/demo/marmalade.jpg',
  '/demo/whiskers.jpg',
  '/demo/mochi.jpg',
  '/demo/boots.jpg',
];

function getInitials(
  displayName?: string | null,
  username?: string | null
): string {
  const source = (displayName || username || 'W').trim();
  const parts = source.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function formatTimeAgo(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) return 'Just now';
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getAvatarForUser(userId: string, avatarUrl?: string | null): string {
  if (avatarUrl) return avatarUrl;
  if (userId === demoState.userId) return DEMO_AVATARS.mina;
  if (userId.includes('2')) return DEMO_AVATARS.layla;
  if (userId.includes('1')) return DEMO_AVATARS.tariq;
  if (userId.includes('3')) return DEMO_AVATARS.omar;
  return DEMO_AVATARS.nadia;
}

export default function FriendsScreen() {
  const { profile } = useSession();
  const [section, setSection] = useState<FriendsSection>('discovery');
  const [weekPeriod, setWeekPeriod] =
    useState<LeaderboardWeekPeriod>('this_week');
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [redeemInput, setRedeemInput] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<{
    type: ReportTargetType;
    id: string;
    title?: string;
  } | null>(null);

  const { data: friendships } = useFriendshipsOverview();
  const { data: catRanking = [], isLoading: isLoadingRanking } =
    useFriendsLeaderboard('cats', weekPeriod);
  const { data: activityEvents = [], isLoading: isLoadingActivity } =
    useFriendActivityEvents();
  const { data: searchResults = [], isFetching: isSearching } =
    useUsernameSearch(searchQuery);

  const {
    showOnLeaderboard,
    setShowOnLeaderboard,
    isUpdating: isUpdatingOptIn,
  } = useShowOnLeaderboardSetting();

  const sendRequestMutation = useSendFriendRequestMutation();
  const respondRequestMutation = useRespondFriendRequestMutation();
  const removeFriendshipMutation = useRemoveFriendshipMutation();
  const createInviteMutation = useCreateInviteMutation();
  const redeemInviteMutation = useRedeemInviteMutation();
  const toggleReactionMutation = useToggleReactionMutation();

  const acceptedFriends = friendships?.acceptedFriends ?? [];
  const incomingRequests = friendships?.incomingRequests ?? [];
  const outgoingRequests = friendships?.outgoingRequests ?? [];

  const filteredEvents = useMemo<ActivityEventItem[]>(() => {
    if (!selectedFriendId) return activityEvents;
    return activityEvents.filter((ev) => ev.actor.id === selectedFriendId);
  }, [activityEvents, selectedFriendId]);

  const topSpotter = catRanking[0] ?? null;

  const handleShareInviteLink = async () => {
    setErrorMsg(null);
    setFeedbackMsg(null);
    try {
      const invite = await createInviteMutation.mutateAsync();
      const link = buildInviteDeepLink(invite.code);
      setFeedbackMsg(`Your invite code: ${invite.code}`);
      await Share.share({
        message: `Join me on StrayCat Walk to share cat sightings and see who finds more cats! Code: ${invite.code} or ${link}`,
      }).catch(() => {});
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Could not create invite link.'
      );
    }
  };

  const handleRedeemCode = async () => {
    setErrorMsg(null);
    setFeedbackMsg(null);
    try {
      await redeemInviteMutation.mutateAsync(redeemInput);
      setRedeemInput('');
      setFeedbackMsg('Invite accepted! You are now friends.');
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Could not redeem invite code.'
      );
    }
  };

  return (
    <Screen scroll padded={false} contentContainerClassName="gap-4 pb-32">
      {/* 1. Midnight-Ink Header + Strava-Style Friend Story Avatars */}
      <View className="bg-[#191A26] pb-4 pt-3">
        <View className="flex-row items-center justify-between px-5 pb-3">
          <Text className="font-display text-xl font-extrabold tracking-tight text-white">
            Friends
          </Text>

          <View className="flex-row items-center gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Invite a friend"
              onPress={handleShareInviteLink}
              className="min-h-[36px] flex-row items-center gap-1.5 rounded-pill border border-white/20 bg-white/10 px-3">
              <AppIcon name="share" size={13} color="#F4A97B" />
              <Text className="text-xs font-bold text-white">Invite</Text>
            </Pressable>
          </View>
        </View>

        {/* Horizontal Friends Story Strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 18, gap: 14 }}>
          {/* Your quick-walk bubble */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start a walk to share with friends"
            onPress={() => router.push('/walk')}
            className="items-center gap-1">
            <View className="relative h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-white/40 bg-[#252738] p-0.5">
              <Image
                source={{ uri: profile?.avatar_url || DEMO_AVATARS.mina }}
                style={{ width: '100%', height: '100%', borderRadius: 999 }}
                contentFit="cover"
              />
              <View className="absolute -bottom-0.5 -right-0.5 h-5 w-5 items-center justify-center rounded-full border-2 border-[#191A26] bg-[#F4A97B]">
                <Text className="text-[11px] font-extrabold leading-none text-[#191A26]">
                  +
                </Text>
              </View>
            </View>
            <Text className="text-[11px] font-semibold text-white/80">You</Text>
          </Pressable>

          {/* Friends bubbles */}
          {acceptedFriends.map((item) => {
            const isSelected = selectedFriendId === item.friend.id;
            const firstName = (
              item.friend.display_name || item.friend.username
            ).split(' ')[0];
            return (
              <Pressable
                key={item.friendshipId}
                accessibilityRole="button"
                accessibilityLabel={`Filter feed by ${firstName}`}
                onPress={() => {
                  setSection('discovery');
                  setSelectedFriendId((prev) =>
                    prev === item.friend.id ? null : item.friend.id
                  );
                }}
                className="items-center gap-1">
                <View
                  className={`h-14 w-14 rounded-full p-0.5 ${
                    isSelected
                      ? 'border-[2.5px] border-white bg-[#F4A97B]'
                      : 'border-2 border-[#F4A97B]'
                  }`}>
                  <View className="h-full w-full overflow-hidden rounded-full bg-[#252738]">
                    <Image
                      source={{
                        uri: getAvatarForUser(
                          item.friend.id,
                          item.friend.avatar_url
                        ),
                      }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                    />
                  </View>
                </View>
                <Text
                  numberOfLines={1}
                  className={`max-w-[58px] text-[11px] font-semibold ${
                    isSelected ? 'text-[#F4A97B]' : 'text-white/80'
                  }`}>
                  {firstName}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View className="gap-4 px-4">
        {/* 2. Section Switch: Discovery | Most Cats | Friends */}
        <SegmentedControl<FriendsSection>
          value={section}
          onChange={setSection}
          options={[
            { key: 'discovery', label: 'Discovery' },
            { key: 'ranking', label: 'Most Cats' },
            {
              key: 'manage',
              label: 'Friends',
              badge: incomingRequests.length || undefined,
            },
          ]}
        />

        {feedbackMsg ? (
          <View className="rounded-2xl border border-[#191A26] bg-[#FCE8D5] px-4 py-2.5">
            <Text className="text-xs font-bold text-[#191A26]">{feedbackMsg}</Text>
          </View>
        ) : null}

        {errorMsg ? (
          <View className="rounded-2xl border border-danger bg-danger-muted px-4 py-2.5">
            <Text className="text-xs font-bold text-danger">{errorMsg}</Text>
          </View>
        ) : null}

        {/* 3A. DISCOVERY FEED (Friends-Only Strava-Style Photo & Route Carousels) */}
        {section === 'discovery' ? (
          <View className="gap-5">
            {selectedFriendId ? (
              <View className="flex-row items-center justify-between rounded-pill border border-[#191A26]/15 bg-white px-4 py-2 dark:bg-[#191A26]">
                <Text variant="caption" className="font-semibold">
                  Showing walks from selected friend
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setSelectedFriendId(null)}>
                  <Text className="text-xs font-extrabold text-[#F4A97B]">
                    Show All
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {isLoadingActivity ? (
              <Card className="items-center py-8">
                <Text variant="caption">Loading friends&apos; walks…</Text>
              </Card>
            ) : filteredEvents.length === 0 ? (
              <EmptyState
                emoji="🐱"
                title="Your Friends Feed is quiet"
                message="Invite a friend or take a neighborhood walk so your cat sightings appear here."
                actionLabel="Invite a Friend"
                onAction={handleShareInviteLink}
              />
            ) : (
              filteredEvents.map((ev, idx) => {
                const actorName = ev.actor.display_name || ev.actor.username;
                const primaryPhoto =
                  ev.sharedCatPhotoUrl ||
                  DEMO_CAT_PHOTOS[idx % DEMO_CAT_PHOTOS.length];
                const secondaryPhoto =
                  DEMO_CAT_PHOTOS[(idx + 1) % DEMO_CAT_PHOTOS.length];
                const routeThumb = makeFriendRouteSvgUri(idx);

                const heartReaction = ev.reactions.find((r) => r.emoji === '❤️');
                const pawReaction = ev.reactions.find((r) => r.emoji === '🐾');
                const heartCount = heartReaction?.count ?? 0;
                const pawCount = pawReaction?.count ?? 0;
                const likedByMe = Boolean(heartReaction?.reactedByMe);
                const pawedByMe = Boolean(pawReaction?.reactedByMe);

                return (
                  <Card key={ev.id} className="gap-3.5 overflow-hidden p-0">
                    {/* Post Author Header */}
                    <View className="flex-row items-center justify-between px-4 pt-4">
                      <View className="flex-row items-center gap-2.5">
                        <View className="h-10 w-10 overflow-hidden rounded-full border-[1.5px] border-[#191A26] bg-[#FAF8F5]">
                          <Image
                            source={{
                              uri: getAvatarForUser(
                                ev.actor.id,
                                ev.actor.avatar_url
                              ),
                            }}
                            style={{ width: '100%', height: '100%' }}
                            contentFit="cover"
                          />
                        </View>
                        <View>
                          <Text className="text-sm font-extrabold text-[#191A26] dark:text-white">
                            {actorName}
                          </Text>
                          <Text className="text-xs font-medium text-[#6E7085] dark:text-[#9EA1B8]">
                            {ev.copy.headline}
                          </Text>
                        </View>
                      </View>

                      <Text className="text-[11px] font-semibold text-[#6E7085] dark:text-[#9EA1B8]">
                        {formatTimeAgo(ev.createdAt)}
                      </Text>
                    </View>

                    {ev.copy.subtitle ? (
                      <Text className="px-4 text-xs font-medium text-[#191A26]/80 dark:text-white/80">
                        {ev.copy.subtitle}
                      </Text>
                    ) : null}

                    {/* Horizontal Swipeable Media Carousel (Cat Photo + Route Map + Extra Cat Photo) */}
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
                      {/* Slide 1: Spotted Cat Photo with Compact Stat Overlay */}
                      <View className="relative h-[230px] w-[205px] overflow-hidden rounded-[20px] border border-[#191A26]/20 bg-[#191A26]">
                        <Image
                          source={{ uri: primaryPhoto }}
                          style={{ width: '100%', height: '100%' }}
                          contentFit="cover"
                        />
                        <View className="absolute bottom-2.5 left-2.5 rounded-pill bg-[#191A26]/85 px-2.5 py-1">
                          <Text className="text-[10px] font-extrabold text-[#F4A97B]">
                            Cat Spotted
                          </Text>
                        </View>
                      </View>

                      {/* Slide 2: Walk Route & Cat Pins Map Card */}
                      <View className="relative h-[230px] w-[205px] overflow-hidden rounded-[20px] border border-[#191A26] bg-[#191A26]">
                        <Image
                          source={{ uri: routeThumb }}
                          style={{ width: '100%', height: '100%' }}
                          contentFit="cover"
                        />
                        <View className="absolute left-3 top-3 rounded-pill bg-white/15 px-2.5 py-1">
                          <Text className="text-[10px] font-bold text-white">
                            Route & Pins
                          </Text>
                        </View>
                      </View>

                      {/* Slide 3: Second Sighting Photo */}
                      <View className="relative h-[230px] w-[170px] overflow-hidden rounded-[20px] border border-[#191A26]/20 bg-[#191A26]">
                        <Image
                          source={{ uri: secondaryPhoto }}
                          style={{ width: '100%', height: '100%' }}
                          contentFit="cover"
                        />
                      </View>
                    </ScrollView>

                    {/* Footer Actions: Heart Kudos + Paw Reaction + Report */}
                    <View className="flex-row items-center justify-between border-t border-[#191A26]/10 px-4 py-3 dark:border-white/10">
                      <View className="flex-row items-center gap-3">
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Like walk"
                          onPress={() =>
                            toggleReactionMutation.mutate({
                              eventId: ev.id,
                              emoji: '❤️',
                              currentMyReaction: ev.myReaction,
                            })
                          }
                          className={`min-h-[36px] flex-row items-center gap-1.5 rounded-pill px-3 ${
                            likedByMe
                              ? 'bg-[#F4A97B]'
                              : 'bg-[#FAF8F5] dark:bg-[#252738]'
                          }`}>
                          <AppIcon
                            name="heart"
                            size={14}
                            color={likedByMe ? '#191A26' : '#6E7085'}
                          />
                          <Text
                            className={`text-xs font-extrabold ${
                              likedByMe
                                ? 'text-[#191A26]'
                                : 'text-[#191A26] dark:text-white'
                            }`}>
                            {heartCount}
                          </Text>
                        </Pressable>

                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Celebrate cat sighting"
                          onPress={() =>
                            toggleReactionMutation.mutate({
                              eventId: ev.id,
                              emoji: '🐾',
                              currentMyReaction: ev.myReaction,
                            })
                          }
                          className={`min-h-[36px] flex-row items-center gap-1.5 rounded-pill px-3 ${
                            pawedByMe
                              ? 'bg-[#191A26]'
                              : 'bg-[#FAF8F5] dark:bg-[#252738]'
                          }`}>
                          <AppIcon
                            name="paw"
                            size={14}
                            color={pawedByMe ? '#F4A97B' : '#6E7085'}
                          />
                          <Text
                            className={`text-xs font-extrabold ${
                              pawedByMe
                                ? 'text-[#F4A97B]'
                                : 'text-[#191A26] dark:text-white'
                            }`}>
                            {pawCount}
                          </Text>
                        </Pressable>
                      </View>

                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Report post"
                        onPress={() =>
                          setReportTarget({
                            type: 'activity_event',
                            id: ev.id,
                            title: `Post by ${actorName}`,
                          })
                        }
                        className="min-h-[36px] justify-center px-2">
                        <Text className="text-[11px] font-semibold text-[#6E7085] dark:text-[#9EA1B8]">
                          Report
                        </Text>
                      </Pressable>
                    </View>
                  </Card>
                );
              })
            )}
          </View>
        ) : null}

        {/* 3B. MOST CATS FOUND (Friends-Only Cat Ranking — Zero Points!) */}
        {section === 'ranking' ? (
          <View className="gap-4">
            <View className="flex-row items-center justify-between">
              <Text variant="heading">Most Cats Found</Text>
              <View className="flex-row rounded-pill border border-[#191A26] bg-white p-0.5 dark:bg-[#191A26]">
                {(
                  [
                    { id: 'this_week', label: 'This Week' },
                    { id: 'last_week', label: 'Last Week' },
                  ] as const
                ).map((period) => {
                  const active = weekPeriod === period.id;
                  return (
                    <Pressable
                      key={period.id}
                      accessibilityRole="button"
                      onPress={() => setWeekPeriod(period.id)}
                      className={`rounded-pill px-3 py-1 ${
                        active ? 'bg-[#191A26]' : 'bg-transparent'
                      }`}>
                      <Text
                        className={`text-[11px] font-bold ${
                          active ? 'text-[#F4A97B]' : 'text-[#6E7085]'
                        }`}>
                        {period.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* #1 Top Cat Spotter Spotlight */}
            {topSpotter ? (
              <View className="flex-row items-center justify-between rounded-[24px] border-[1.5px] border-[#191A26] bg-[#191A26] p-4">
                <View className="flex-row items-center gap-3">
                  <View className="relative h-14 w-14 overflow-hidden rounded-full border-2 border-[#F4A97B] bg-white">
                    <Image
                      source={{
                        uri: getAvatarForUser(
                          topSpotter.userId,
                          topSpotter.avatarUrl
                        ),
                      }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                    />
                  </View>
                  <View>
                    <View className="flex-row items-center gap-1">
                      <AppIcon name="trophy" size={13} color="#F4A97B" />
                      <Text className="text-[11px] font-extrabold uppercase tracking-wider text-[#F4A97B]">
                        Top Cat Spotter
                      </Text>
                    </View>
                    <Text className="text-base font-extrabold text-white">
                      {topSpotter.displayName || topSpotter.username}
                      {topSpotter.isSelf ? ' (You)' : ''}
                    </Text>
                  </View>
                </View>

                <View className="items-end">
                  <Text className="font-display text-2xl font-extrabold text-[#F4A97B]">
                    {topSpotter.value}
                  </Text>
                  <Text className="text-[11px] font-semibold text-white/70">
                    cats found
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Ranked Friends List */}
            {isLoadingRanking ? (
              <Card className="items-center py-8">
                <Text variant="caption">Loading cat rankings…</Text>
              </Card>
            ) : catRanking.length === 0 ? (
              <EmptyState
                emoji="🐱"
                title="No rankings yet"
                message="Add friends and spot cats on your walks to see who finds the most."
                actionLabel="Invite Friends"
                onAction={handleShareInviteLink}
              />
            ) : (
              <Card className="gap-2 p-3">
                {catRanking.map((entry) => (
                  <View
                    key={entry.userId}
                    className={`flex-row items-center justify-between rounded-2xl px-3 py-2.5 ${
                      entry.isSelf
                        ? 'border border-[#191A26] bg-[#FCE8D5]/60 dark:bg-[#252738]'
                        : 'bg-transparent'
                    }`}>
                    <View className="flex-row items-center gap-3">
                      <Text
                        className={`w-6 text-center text-sm font-extrabold ${
                          entry.rank === 1
                            ? 'text-[#F4A97B]'
                            : 'text-[#6E7085] dark:text-[#9EA1B8]'
                        }`}>
                        #{entry.rank}
                      </Text>
                      <View className="h-10 w-10 overflow-hidden rounded-full border border-[#191A26] bg-white">
                        <Image
                          source={{
                            uri: getAvatarForUser(entry.userId, entry.avatarUrl),
                          }}
                          style={{ width: '100%', height: '100%' }}
                          contentFit="cover"
                        />
                      </View>
                      <View>
                        <Text className="text-sm font-extrabold text-[#191A26] dark:text-white">
                          {entry.displayName || entry.username}
                          {entry.isSelf ? ' (You)' : ''}
                        </Text>
                        <Text className="text-[11px] text-[#6E7085] dark:text-[#9EA1B8]">
                          @{entry.username}
                        </Text>
                      </View>
                    </View>

                    <View className="rounded-pill bg-[#191A26] px-3 py-1">
                      <Text className="text-xs font-extrabold text-[#F4A97B]">
                        {formatLeaderboardValue('cats', entry.value)}
                      </Text>
                    </View>
                  </View>
                ))}
              </Card>
            )}

            {/* Privacy Opt-In Toggle */}
            <Card className="flex-row items-center justify-between gap-3">
              <View className="flex-1">
                <Text className="text-sm font-extrabold text-[#191A26] dark:text-white">
                  Show me on friend rankings
                </Text>
                <Text variant="caption">
                  Only accepted friends can see your weekly cat count.
                </Text>
              </View>
              <Button
                label={showOnLeaderboard ? 'Visible' : 'Hidden'}
                size="sm"
                variant={showOnLeaderboard ? 'primary' : 'secondary'}
                loading={isUpdatingOptIn}
                onPress={() => {
                  setShowOnLeaderboard(!showOnLeaderboard);
                }}
              />
            </Card>
          </View>
        ) : null}

        {/* 3C. MANAGE FRIENDS & REQUESTS */}
        {section === 'manage' ? (
          <View className="gap-4">
            {/* Share / Redeem Invite */}
            <Card className="gap-3">
              <Text variant="heading">Add a Friend</Text>
              <Button
                label="Share Invite Link"
                variant="primary"
                loading={createInviteMutation.isPending}
                onPress={handleShareInviteLink}
              />

              <View className="flex-row items-center gap-2">
                <View className="flex-1">
                  <Input
                    value={redeemInput}
                    onChangeText={setRedeemInput}
                    placeholder="Paste invite code"
                    autoCapitalize="none"
                  />
                </View>
                <Button
                  label="Redeem"
                  variant="secondary"
                  loading={redeemInviteMutation.isPending}
                  disabled={!redeemInput.trim()}
                  onPress={handleRedeemCode}
                />
              </View>
            </Card>

            {/* Search by Username */}
            <Card className="gap-3">
              <Text variant="heading">Find by Username</Text>
              <Input
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search @username"
                autoCapitalize="none"
              />
              {isSearching ? (
                <Text variant="caption">Searching…</Text>
              ) : searchResults.length > 0 ? (
                <View className="gap-2">
                  {searchResults.map((user) => (
                    <View
                      key={user.id}
                      className="flex-row items-center justify-between rounded-2xl border border-[#191A26]/10 px-3 py-2">
                      <View>
                        <Text className="text-sm font-bold text-[#191A26] dark:text-white">
                          {user.display_name || user.username}
                        </Text>
                        <Text variant="caption">@{user.username}</Text>
                      </View>
                      <Button
                        label={
                          user.friendship_status === 'accepted'
                            ? 'Friends'
                            : user.friendship_status === 'pending'
                              ? 'Pending'
                              : 'Add'
                        }
                        size="sm"
                        variant={
                          user.friendship_status ? 'ghost' : 'primary'
                        }
                        disabled={Boolean(user.friendship_status)}
                        onPress={() => {
                          sendRequestMutation.mutate(user.id);
                        }}
                      />
                    </View>
                  ))}
                </View>
              ) : null}
            </Card>

            {/* Incoming Requests */}
            {incomingRequests.length > 0 ? (
              <Card className="gap-3">
                <Text variant="heading">
                  Incoming Requests ({incomingRequests.length})
                </Text>
                {incomingRequests.map((req) => (
                  <View
                    key={req.friendshipId}
                    className="flex-row items-center justify-between gap-2">
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-[#191A26] dark:text-white">
                        {req.friend.display_name || req.friend.username}
                      </Text>
                      <Text variant="caption">@{req.friend.username}</Text>
                    </View>
                    <View className="flex-row gap-2">
                      <Button
                        label="Accept"
                        size="sm"
                        variant="primary"
                        onPress={() =>
                          respondRequestMutation.mutate({
                            friendshipId: req.friendshipId,
                            decision: 'accepted',
                          })
                        }
                      />
                      <Button
                        label="Decline"
                        size="sm"
                        variant="ghost"
                        onPress={() =>
                          respondRequestMutation.mutate({
                            friendshipId: req.friendshipId,
                            decision: 'declined',
                          })
                        }
                      />
                    </View>
                  </View>
                ))}
              </Card>
            ) : null}

            {/* Outgoing Requests */}
            {outgoingRequests.length > 0 ? (
              <Card className="gap-2">
                <Text variant="heading">
                  Sent Requests ({outgoingRequests.length})
                </Text>
                {outgoingRequests.map((req) => (
                  <View
                    key={req.friendshipId}
                    className="flex-row items-center justify-between">
                    <Text className="text-sm font-semibold text-[#191A26] dark:text-white">
                      {req.friend.display_name || req.friend.username}
                    </Text>
                    <Button
                      label="Cancel"
                      size="sm"
                      variant="ghost"
                      onPress={() =>
                        removeFriendshipMutation.mutate(req.friendshipId)
                      }
                    />
                  </View>
                ))}
              </Card>
            ) : null}

            {/* Accepted Friends */}
            <Card className="gap-3">
              <Text variant="heading">
                Your Friends ({acceptedFriends.length})
              </Text>
              {acceptedFriends.length === 0 ? (
                <Text variant="caption">
                  No friends connected yet. Share your invite link above!
                </Text>
              ) : (
                acceptedFriends.map((item) => (
                  <View
                    key={item.friendshipId}
                    className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2.5">
                      <View className="h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-[#191A26] bg-[#FAF8F5]">
                        <Image
                          source={{
                            uri: getAvatarForUser(
                              item.friend.id,
                              item.friend.avatar_url
                            ),
                          }}
                          style={{ width: '100%', height: '100%' }}
                          contentFit="cover"
                        />
                      </View>
                      <View>
                        <Text className="text-sm font-bold text-[#191A26] dark:text-white">
                          {item.friend.display_name || item.friend.username}
                        </Text>
                        <Text variant="caption">
                          @{item.friend.username} ·{' '}
                          {getInitials(
                            item.friend.display_name,
                            item.friend.username
                          )}
                        </Text>
                      </View>
                    </View>
                    <Button
                      label="Remove"
                      size="sm"
                      variant="ghost"
                      onPress={() =>
                        removeFriendshipMutation.mutate(item.friendshipId)
                      }
                    />
                  </View>
                ))
              )}
            </Card>
          </View>
        ) : null}
      </View>

      {reportTarget ? (
        <ReportModal
          visible
          targetType={reportTarget.type}
          targetId={reportTarget.id}
          targetTitle={reportTarget.title}
          onClose={() => setReportTarget(null)}
        />
      ) : null}
    </Screen>
  );
}
