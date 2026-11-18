import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Share, View } from 'react-native';

import {
  AppIcon,
  Button,
  Card,
  EmptyState,
  Input,
  LeagueEmblemRow,
  LeaguePodium,
  ProgressStripBento,
  Screen,
  SegmentedControl,
  Text,
} from '@/components/ui';
import { useCatCollection } from '@/features/collection';
import { getCardThemeTokens } from '@/features/cosmetics';
import { usePointsSummary } from '@/features/gamification';
import {
  ReportModal,
  type ReportTargetType,
} from '@/features/privacy';
import {
  buildInviteDeepLink,
  formatLeaderboardValue,
  LEADERBOARD_METRICS,
  REACTION_EMOJIS,
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
  type LeaderboardMetric,
  type LeaderboardWeekPeriod,
} from '@/features/social';
import { DEMO_AVATARS } from '@/lib/demo-data';

type SocialSection = 'leaderboard' | 'activity' | 'friends' | 'requests';

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

function formatRelativeDate(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getLeagueBadgeForRank(rank: number): {
  label: string;
  color: string;
  bg: string;
  icon: string;
} {
  if (rank === 1) {
    return { label: 'Diamond', color: '#FFFFFF', bg: '#191A26', icon: 'gem' };
  }
  if (rank === 2) {
    return { label: 'Gold', color: '#191A26', bg: '#F4A97B', icon: 'award' };
  }
  if (rank === 3) {
    return { label: 'Silver', color: '#191A26', bg: '#FCE8D5', icon: 'award' };
  }
  return { label: 'Bronze', color: '#191A26', bg: '#FAF8F5', icon: 'shield' };
}

export default function SocialScreen() {
  const [section, setSection] = useState<SocialSection>('leaderboard');
  const [metric, setMetric] = useState<LeaderboardMetric>('steps');
  const [weekPeriod, setWeekPeriod] =
    useState<LeaderboardWeekPeriod>('this_week');

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
  const { data: leaderboard = [], isLoading: isLoadingLeaderboard } =
    useFriendsLeaderboard(metric, weekPeriod);
  const { data: activityEvents = [], isLoading: isLoadingActivity } =
    useFriendActivityEvents();
  const { data: searchResults = [], isFetching: isSearching } =
    useUsernameSearch(searchQuery);
  const { data: pointsSummary } = usePointsSummary();
  const pawBalance = pointsSummary?.totalPoints ?? 620;
  const { data: collectionCards = [] } = useCatCollection('newest');

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

  const selfEntry = leaderboard.find((e) => e.isSelf);

  const handleShareInviteLink = async () => {
    setErrorMsg(null);
    setFeedbackMsg(null);
    try {
      const invite = await createInviteMutation.mutateAsync();
      const link = buildInviteDeepLink(invite.code);
      setFeedbackMsg(`Your invite code: ${invite.code}`);
      await Share.share({
        message: `Join me for a friendly walking race on StrayCat Walk! Use my invite code ${invite.code} or open ${link}`,
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
      const friendId = await redeemInviteMutation.mutateAsync(redeemInput);
      setRedeemInput('');
      setFeedbackMsg('Invite accepted! You are now connected.');
      if (friendId) {
        router.push(`/friend/${friendId}`);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Could not redeem invite code.'
      );
    }
  };

  return (
    <Screen scroll contentContainerClassName="gap-4 pb-32 pt-2">
      {/* 1. Top Segmented Switcher ("Календарь | Трекеры" style in Reference Right-Column Screens) */}
      <SegmentedControl
        value={section}
        onChange={(next) => {
          setSection(next);
          setErrorMsg(null);
        }}
        options={[
          { key: 'leaderboard', label: 'League' },
          { key: 'activity', label: 'Events' },
          { key: 'friends', label: `Friends (${acceptedFriends.length})` },
          {
            key: 'requests',
            label: 'Requests',
            badge: incomingRequests.length,
          },
        ]}
      />

      {/* 2. Dark Midnight-Ink Filter Pill Bar ("Кто: [ Все ]" in Reference Right-Column Screen) */}
      <View className="flex-row items-center justify-between gap-2.5">
        <Text className="text-xs font-extrabold text-[#191A26] dark:text-white">
          Who:
        </Text>
        <View className="flex-1 flex-row items-center justify-between rounded-pill bg-[#191A26] px-4 py-2">
          <Text className="text-xs font-extrabold text-white">
            {section === 'leaderboard'
              ? 'All Friends League'
              : section === 'activity'
                ? 'Clubhouse Milestones'
                : section === 'friends'
                  ? 'Connected Walkers'
                  : 'Pending Invites'}
          </Text>
          <Text className="text-xs font-bold text-[#F4A97B]">▾</Text>
        </View>
        <Button
          label="Invite"
          size="sm"
          variant="primary"
          loading={createInviteMutation.isPending}
          onPress={() => {
            handleShareInviteLink().catch(() => {});
          }}
        />
      </View>

      {/* 3. Circular Blob-Cat League Emblem Row */}
      <LeagueEmblemRow
        totalPoints={pawBalance}
        showAllUnlocked={section === 'leaderboard'}
      />

      {feedbackMsg ? (
        <Card elevated className="py-2.5">
          <Text variant="caption" className="font-bold text-[#191A26]">
            {feedbackMsg}
          </Text>
        </Card>
      ) : null}

      {errorMsg ? (
        <Card className="border-danger bg-danger-muted py-2.5">
          <Text variant="caption" className="font-semibold text-danger">
            {errorMsg}
          </Text>
        </Card>
      ) : null}

      {/* SECTION 1: FRIENDS LEAGUE PODIUM & RANKINGS */}
      {section === 'leaderboard' ? (
        <View className="gap-4">
          {/* 3-Pill Progress Strip */}
          <ProgressStripBento
            title="My Progress"
            metrics={[
              {
                id: 'points',
                label: 'Paw Points',
                current: pawBalance,
                target: 750,
                color: 'coral',
                icon: 'paw',
              },
              {
                id: 'cats',
                label: 'Cat Cards',
                current: collectionCards.length || 4,
                target: 10,
                color: 'primary',
                icon: 'cards',
              },
              {
                id: 'steps',
                label: 'Weekly Goal',
                current: 428,
                target: 500,
                color: 'secondary',
                icon: 'flame',
              },
            ]}
          />

          {/* Metric Filter Pills */}
          <View className="flex-row gap-1.5">
            {LEADERBOARD_METRICS.map((m) => {
              const active = metric === m.key;
              return (
                <Pressable
                  key={m.key}
                  accessibilityRole="button"
                  accessibilityLabel={`Leaderboard metric ${m.label}`}
                  onPress={() => setMetric(m.key)}
                  className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-pill border-[1.5px] border-[#191A26] py-2 ${
                    active ? 'bg-[#191A26]' : 'bg-white'
                  }`}>
                  <AppIcon
                    name={m.emoji}
                    size={13}
                    color={active ? '#F4A97B' : '#191A26'}
                  />
                  <Text
                    variant="caption"
                    className={`text-xs font-bold ${
                      active ? 'text-white' : 'text-[#191A26]'
                    }`}>
                    {m.shortLabel}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {acceptedFriends.length === 0 ? (
            <EmptyState
              emoji="🏆"
              title="Invite a friend to start a friendly race"
              message="Weekly leaderboards are strictly friends-only and reset every Monday. Add a friend by username or share an invite link to compare steps, distance, walks, and challenge points."
              actionLabel="Add or Invite Friends"
              onAction={() => setSection('friends')}
            />
          ) : isLoadingLeaderboard ? (
            <Card className="items-center py-8">
              <Text variant="caption">Loading weekly leaderboard…</Text>
            </Card>
          ) : (
            <>
              <LeaguePodium
                periodLabel={
                  weekPeriod === 'this_week' ? 'This Week' : 'Last Week'
                }
                onTogglePeriod={() =>
                  setWeekPeriod((prev) =>
                    prev === 'this_week' ? 'last_week' : 'this_week'
                  )
                }
                entries={leaderboard.slice(0, 3).map((entry) => ({
                  userId: entry.userId,
                  rank: entry.rank,
                  displayName: entry.displayName || entry.username,
                  username: entry.username,
                  avatarUrl: entry.avatarUrl ?? null,
                  value: entry.value,
                  formattedValue: formatLeaderboardValue(metric, entry.value),
                  isSelf: entry.isSelf,
                }))}
                onPressUser={(userId, isSelf) => {
                  if (!isSelf) {
                    router.push(`/friend/${userId}`);
                  }
                }}
              />

              {/* Warm Peach/Cream Tracker-Style Ranked List Card (Matching Reference Right-Column Cards) */}
              <View className="relative">
                <Card elevated className="gap-2.5 p-3.5">
                  <View className="flex-row items-center justify-between px-1">
                    <Text className="text-xs font-extrabold uppercase tracking-wider text-[#191A26]">
                      Weekly Standings
                    </Text>
                    <Text className="text-xs font-bold text-[#191A26]/70">
                      {leaderboard.length} walkers ⌄
                    </Text>
                  </View>

                  {leaderboard.map((entry) => {
                    const name = entry.displayName || entry.username;
                    const initials = getInitials(
                      entry.displayName,
                      entry.username
                    );
                    const tierBadge = getLeagueBadgeForRank(entry.rank);
                    const paddedRank = String(entry.rank).padStart(2, '0');

                    return (
                      <Pressable
                        key={entry.userId}
                        disabled={entry.isSelf}
                        accessibilityRole={entry.isSelf ? undefined : 'button'}
                        accessibilityLabel={`${name}, rank ${entry.rank}, ${formatLeaderboardValue(
                          metric,
                          entry.value
                        )}`}
                        onPress={() => {
                          if (!entry.isSelf) {
                            router.push(`/friend/${entry.userId}`);
                          }
                        }}
                        className={`flex-row items-center gap-3 rounded-pill border-[1.5px] border-[#191A26] px-3.5 py-2.5 ${
                          entry.isSelf ? 'bg-[#191A26]' : 'bg-white'
                        }`}>
                        <View
                          className={`h-7 w-7 items-center justify-center rounded-pill border border-[#191A26] ${
                            entry.rank === 1
                              ? 'bg-[#F4A97B]'
                              : entry.isSelf
                                ? 'bg-white'
                                : 'bg-[#FCE8D5]'
                          }`}>
                          <Text className="text-[11px] font-extrabold text-[#191A26]">
                            {paddedRank}
                          </Text>
                        </View>

                        <View className="h-10 w-10 items-center justify-center overflow-hidden rounded-pill border-[1.5px] border-[#191A26] bg-white">
                          {entry.avatarUrl ? (
                            <Image
                              source={{ uri: entry.avatarUrl }}
                              style={{ width: '100%', height: '100%' }}
                              contentFit="cover"
                            />
                          ) : (
                            <Text className="text-xs font-extrabold text-[#191A26]">
                              {initials}
                            </Text>
                          )}
                        </View>

                        <View className="flex-1">
                          <View className="flex-row items-center gap-1.5">
                            <Text
                              numberOfLines={1}
                              className={`text-sm font-extrabold ${
                                entry.isSelf ? 'text-white' : 'text-[#191A26]'
                              }`}>
                              {name}
                            </Text>
                            {entry.isSelf ? (
                              <View className="rounded-pill bg-[#F4A97B] px-2 py-0.5">
                                <Text className="text-[9px] font-extrabold text-[#191A26]">
                                  YOU
                                </Text>
                              </View>
                            ) : null}
                          </View>

                          <View className="mt-0.5 flex-row items-center gap-1.5">
                            <View
                              style={{ backgroundColor: tierBadge.bg }}
                              className="flex-row items-center gap-1 rounded-pill border border-[#191A26] px-2 py-0.5">
                              <AppIcon
                                name={tierBadge.icon}
                                size={10}
                                color={tierBadge.color}
                              />
                              <Text
                                style={{ color: tierBadge.color }}
                                className="text-[9px] font-bold">
                                {tierBadge.label}
                              </Text>
                            </View>
                            <Text
                              className={`text-[11px] font-semibold ${
                                entry.isSelf ? 'text-white/75' : 'text-[#6E7085]'
                              }`}>
                              @{entry.username}
                            </Text>
                          </View>
                        </View>

                        <View className="flex-row items-center gap-1.5">
                          <Text
                            className={`text-xs font-extrabold ${
                              entry.isSelf ? 'text-[#F4A97B]' : 'text-[#191A26]'
                            }`}>
                            {formatLeaderboardValue(metric, entry.value)}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </Card>

                {selfEntry ? (
                  <View className="mt-3 items-center">
                    <View className="flex-row items-center gap-2.5 rounded-pill border-[1.5px] border-[#191A26] bg-white px-4 py-2">
                      <View className="h-7 w-7 overflow-hidden rounded-pill border border-[#191A26] bg-[#FCE8D5]">
                        <Image
                          source={{
                            uri: selfEntry.avatarUrl || DEMO_AVATARS.mina,
                          }}
                          style={{ width: '100%', height: '100%' }}
                          contentFit="cover"
                        />
                      </View>
                      <Text className="text-xs font-extrabold text-[#191A26]">
                        You · #{selfEntry.rank} in Gold League ↑
                      </Text>
                    </View>
                  </View>
                ) : null}
              </View>
            </>
          )}

          {/* Opt-in / Opt-out toggle */}
          <Card className="flex-row items-center justify-between gap-3 py-3">
            <View className="flex-1">
              <Text variant="label">Show me on Friends Leaderboard</Text>
              <Text variant="caption" className="mt-0.5 text-xs">
                {showOnLeaderboard
                  ? 'Visible to your accepted friends. Turn off anytime to hide your stats.'
                  : 'Hidden — your weekly stats are not shown to friends.'}
              </Text>
            </View>
            <Button
              label={showOnLeaderboard ? 'Visible' : 'Hidden'}
              size="sm"
              variant={showOnLeaderboard ? 'secondary' : 'ghost'}
              loading={isUpdatingOptIn}
              onPress={() => setShowOnLeaderboard(!showOnLeaderboard)}
            />
          </Card>
        </View>
      ) : null}

      {/* SECTION 2: FRIEND ACTIVITY (MILESTONES & SHARED CAT CARDS) */}
      {section === 'activity' ? (
        <View className="gap-3">
          <Text variant="caption" className="text-xs leading-5">
            Milestone updates and shared cat cards from the last 14 days—routes and locations are
            never shared.
          </Text>

          {isLoadingActivity ? (
            <Card className="items-center py-8">
              <Text variant="caption">Loading friend milestones…</Text>
            </Card>
          ) : activityEvents.length === 0 ? (
            <EmptyState
              emoji="sparkles"
              title="No recent milestones yet"
              message="Completed walks, unlocked badges, challenge completions, and shared cat cards from you and your friends will appear here."
            />
          ) : (
            activityEvents.map((ev) => (
              <Card key={ev.id} className="gap-3 p-4">
                <View className="flex-row items-start gap-3">
                  <View className="h-11 w-11 items-center justify-center overflow-hidden rounded-pill border-[1.5px] border-[#191A26] bg-[#FCE8D5]">
                    {ev.actor.avatar_url ? (
                      <Image
                        source={{ uri: ev.actor.avatar_url }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                      />
                    ) : (
                      <AppIcon name={ev.copy.emoji} size={20} color="#191A26" />
                    )}
                  </View>

                  <View className="flex-1 gap-0.5">
                    <Text variant="body" className="font-extrabold">
                      {ev.copy.headline}
                    </Text>
                    <Text variant="caption" className="text-xs">
                      {ev.copy.subtitle} · {formatRelativeDate(ev.createdAt)}
                    </Text>
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Report milestone"
                    hitSlop={12}
                    onPress={() =>
                      setReportTarget({
                        type: 'activity_event',
                        id: ev.id,
                        title: ev.copy.headline,
                      })
                    }
                    className="p-1">
                    <Text
                      variant="caption"
                      className="text-sm font-bold text-[#191A26]">
                      ⋯
                    </Text>
                  </Pressable>
                </View>

                {ev.sharedCatPhotoUrl ? (
                  (() => {
                    const sharedTheme = getCardThemeTokens(
                      ev.copy.sharedCatCard?.themeId
                    );
                    return (
                      <View className="relative overflow-hidden rounded-2xl border-[1.5px] border-[#191A26] bg-[#FAF8F5] p-1.5">
                        <Image
                          source={{ uri: ev.sharedCatPhotoUrl }}
                          style={{ width: '100%', height: 210, borderRadius: 12 }}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                          accessibilityLabel="Shared cat card photo"
                        />
                        {sharedTheme.accentLabel ? (
                          <View className="absolute bottom-3 left-3 rounded-pill border border-[#191A26] bg-[#FCE8D5] px-2.5 py-0.5">
                            <Text
                              variant="caption"
                              className="text-[10px] font-extrabold text-[#191A26]">
                              {sharedTheme.accentLabel}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    );
                  })()
                ) : null}

                {/* Reactions Row */}
                <View className="flex-row items-center gap-2 border-t border-[#191A26]/15 pt-2.5">
                  {REACTION_EMOJIS.map((emoji) => {
                    const found = ev.reactions.find((r) => r.emoji === emoji);
                    const count = found?.count ?? 0;
                    const active = ev.myReaction === emoji;

                    return (
                      <Pressable
                        key={emoji}
                        accessibilityRole="button"
                        accessibilityLabel={`React with ${emoji}`}
                        onPress={() => {
                          toggleReactionMutation.mutate({
                            eventId: ev.id,
                            emoji,
                            currentMyReaction: ev.myReaction,
                          });
                        }}
                        className={`flex-row items-center gap-1.5 rounded-pill border-[1.5px] border-[#191A26] px-3 py-1 ${
                          active ? 'bg-[#F4A97B]' : 'bg-white'
                        }`}>
                        <AppIcon name={emoji} size={13} color="#191A26" />
                        {count > 0 ? (
                          <Text
                            variant="caption"
                            className="font-display text-xs font-bold text-[#191A26]">
                            {count}
                          </Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </Card>
            ))
          )}
        </View>
      ) : null}

      {/* SECTION 3: FRIENDS, SEARCH & INVITES */}
      {section === 'friends' ? (
        <View className="gap-4">
          <Card elevated className="gap-3">
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-1">
                <Text variant="label">Invite by Link or Code</Text>
                <Text variant="caption" className="mt-0.5 text-xs">
                  Share a `walkingcat://invite/...` link or enter a friend&apos;s invite code.
                </Text>
              </View>
              <Button
                label="Share Link"
                size="sm"
                loading={createInviteMutation.isPending}
                onPress={() => {
                  handleShareInviteLink().catch(() => {});
                }}
              />
            </View>

            <View className="flex-row items-end gap-2">
              <View className="flex-1">
                <Input
                  label="Have an invite code?"
                  placeholder="e.g. AB23CD45"
                  value={redeemInput}
                  onChangeText={setRedeemInput}
                  autoCapitalize="characters"
                />
              </View>
              <Button
                label="Redeem"
                variant="secondary"
                disabled={!redeemInput.trim()}
                loading={redeemInviteMutation.isPending}
                onPress={() => {
                  handleRedeemCode().catch(() => {});
                }}
              />
            </View>
          </Card>

          <Card className="gap-3">
            <Input
              label="Find Friends by Username"
              placeholder="Type at least 3 characters (e.g. @maya)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {searchQuery.trim().replace(/^@/, '').length >= 3 ? (
              isSearching ? (
                <Text variant="caption" className="text-xs">
                  Searching…
                </Text>
              ) : searchResults.length === 0 ? (
                <Text variant="caption" className="text-xs">
                  No discoverable users found matching &quot;{searchQuery.trim()}&quot;.
                </Text>
              ) : (
                <View className="gap-2">
                  {searchResults.map((user) => (
                    <View
                      key={user.id}
                      className="flex-row items-center justify-between rounded-pill border-[1.5px] border-[#191A26] px-4 py-2.5">
                      <View className="flex-1">
                        <Text variant="body" className="font-bold">
                          {user.display_name || user.username}
                        </Text>
                        <Text variant="caption" className="text-xs">
                          @{user.username}
                        </Text>
                      </View>

                      {user.friendship_status === 'accepted' ? (
                        <Button
                          label="Friends ✓"
                          size="sm"
                          variant="ghost"
                          onPress={() => router.push(`/friend/${user.id}`)}
                        />
                      ) : user.friendship_status === 'pending' ? (
                        <Text variant="caption" className="text-xs font-semibold">
                          Pending
                        </Text>
                      ) : (
                        <Button
                          label="Add Friend"
                          size="sm"
                          loading={sendRequestMutation.isPending}
                          onPress={() => {
                            sendRequestMutation
                              .mutateAsync(user.id)
                              .then(() => {
                                setFeedbackMsg(
                                  `Sent friend request to @${user.username}`
                                );
                              })
                              .catch((err) => {
                                setErrorMsg(
                                  err instanceof Error
                                    ? err.message
                                    : 'Could not send request.'
                                );
                              });
                          }}
                        />
                      )}
                    </View>
                  ))}
                </View>
              )
            ) : null}
          </Card>

          <View className="gap-2.5">
            <Text variant="label">
              Your Friends ({acceptedFriends.length})
            </Text>
            {acceptedFriends.length === 0 ? (
              <Card className="py-6">
                <Text variant="caption" className="text-center">
                  No friends connected yet. Share an invite link or search by username above!
                </Text>
              </Card>
            ) : (
              acceptedFriends.map((item) => {
                const name =
                  item.friend.display_name || item.friend.username;
                const initials = getInitials(
                  item.friend.display_name,
                  item.friend.username
                );

                return (
                  <Pressable
                    key={item.friendshipId}
                    accessibilityRole="button"
                    accessibilityLabel={`View profile for ${name}`}
                    onPress={() => router.push(`/friend/${item.friend.id}`)}>
                    <Card className="flex-row items-center justify-between p-3.5">
                      <View className="flex-1 flex-row items-center gap-3">
                        <View className="h-11 w-11 items-center justify-center overflow-hidden rounded-pill border-[1.5px] border-[#191A26] bg-[#FCE8D5]">
                          {item.friend.avatar_url ? (
                            <Image
                              source={{ uri: item.friend.avatar_url }}
                              style={{ width: '100%', height: '100%' }}
                              contentFit="cover"
                            />
                          ) : (
                            <Text
                              variant="caption"
                              className="font-extrabold text-[#191A26]">
                              {initials}
                            </Text>
                          )}
                        </View>
                        <View className="flex-1">
                          <Text variant="body" className="font-extrabold">
                            {name}
                          </Text>
                          <Text variant="caption" className="text-xs">
                            @{item.friend.username}
                          </Text>
                        </View>
                      </View>
                      <Text
                        variant="caption"
                        className="text-xs font-extrabold text-[#191A26] dark:text-[#F4A97B]">
                        Profile ›
                      </Text>
                    </Card>
                  </Pressable>
                );
              })
            )}
          </View>
        </View>
      ) : null}

      {/* SECTION 4: FRIEND REQUESTS */}
      {section === 'requests' ? (
        <View className="gap-4">
          <View className="gap-2.5">
            <Text variant="label">
              Incoming Requests ({incomingRequests.length})
            </Text>
            {incomingRequests.length === 0 ? (
              <Card className="py-6">
                <Text variant="caption" className="text-center">
                  No pending incoming friend requests.
                </Text>
              </Card>
            ) : (
              incomingRequests.map((req) => {
                const name =
                  req.friend.display_name || req.friend.username;
                return (
                  <Card
                    key={req.friendshipId}
                    className="flex-row items-center justify-between gap-3 p-3.5">
                    <View className="flex-1">
                      <Text variant="body" className="font-bold">
                        {name}
                      </Text>
                      <Text variant="caption" className="text-xs">
                        @{req.friend.username}
                      </Text>
                    </View>
                    <View className="flex-row gap-2">
                      <Button
                        label="Decline"
                        size="sm"
                        variant="ghost"
                        loading={respondRequestMutation.isPending}
                        onPress={() => {
                          respondRequestMutation.mutate({
                            friendshipId: req.friendshipId,
                            decision: 'declined',
                          });
                        }}
                      />
                      <Button
                        label="Accept"
                        size="sm"
                        loading={respondRequestMutation.isPending}
                        onPress={() => {
                          respondRequestMutation.mutate({
                            friendshipId: req.friendshipId,
                            decision: 'accepted',
                          });
                        }}
                      />
                    </View>
                  </Card>
                );
              })
            )}
          </View>

          {outgoingRequests.length > 0 ? (
            <View className="gap-2.5">
              <Text variant="label">
                Sent Requests ({outgoingRequests.length})
              </Text>
              {outgoingRequests.map((req) => {
                const name =
                  req.friend.display_name || req.friend.username;
                return (
                  <Card
                    key={req.friendshipId}
                    className="flex-row items-center justify-between gap-3 p-3.5">
                    <View className="flex-1">
                      <Text variant="body" className="font-bold">
                        {name}
                      </Text>
                      <Text variant="caption" className="text-xs">
                        @{req.friend.username} · Waiting for response
                      </Text>
                    </View>
                    <Button
                      label="Cancel"
                      size="sm"
                      variant="ghost"
                      loading={removeFriendshipMutation.isPending}
                      onPress={() => {
                        removeFriendshipMutation.mutate(req.friend.id);
                      }}
                    />
                  </Card>
                );
              })}
            </View>
          ) : null}
        </View>
      ) : null}

      <ReportModal
        visible={Boolean(reportTarget)}
        targetType={reportTarget?.type ?? 'activity_event'}
        targetId={reportTarget?.id ?? ''}
        targetTitle={reportTarget?.title}
        onClose={() => setReportTarget(null)}
      />
    </Screen>
  );
}
