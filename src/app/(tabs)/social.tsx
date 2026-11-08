import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Share, View } from 'react-native';

import {
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
    return { label: 'Diamond', color: '#4F46E5', bg: '#EEF2FF', icon: '💎' };
  }
  if (rank === 2) {
    return { label: 'Gold', color: '#B45309', bg: '#FEF3C7', icon: '🥇' };
  }
  if (rank === 3) {
    return { label: 'Silver', color: '#475569', bg: '#F1F5F9', icon: '🥈' };
  }
  return { label: 'Bronze', color: '#9A3412', bg: '#FFEDD5', icon: '🛡️' };
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
      {/* 1. Six-Tier Pentagon League Shield Row (Reference Image 1 Top Header) */}
      <LeagueEmblemRow
        totalPoints={pawBalance}
        showAllUnlocked={section === 'leaderboard'}
      />

      {/* 2. Bold Editorial League Title + Invite CTA */}
      <View className="flex-row items-center justify-between gap-3">
        <View>
          <Text variant="title" className="text-[28px] leading-8">
            {section === 'leaderboard'
              ? 'Friend’s League'
              : section === 'activity'
                ? 'Clubhouse Feed'
                : section === 'friends'
                  ? 'Friends Circle'
                  : 'Friend Requests'}
          </Text>
        </View>
        <Button
          label="🔗 Invite"
          size="sm"
          variant="secondary"
          loading={createInviteMutation.isPending}
          onPress={() => {
            handleShareInviteLink().catch(() => {});
          }}
        />
      </View>

      {/* 3. Charcoal Segmented Pill Control (Reference Image 1) */}
      <SegmentedControl
        value={section}
        onChange={(next) => {
          setSection(next);
          setErrorMsg(null);
        }}
        options={[
          { key: 'leaderboard', label: 'Friends League' },
          { key: 'activity', label: 'Activity' },
          { key: 'friends', label: `Friends (${acceptedFriends.length})` },
          {
            key: 'requests',
            label: 'Requests',
            badge: incomingRequests.length,
          },
        ]}
      />

      {feedbackMsg ? (
        <Card className="border-secondary/60 bg-secondary/10 py-2.5">
          <Text variant="caption" className="font-semibold">
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

      {/* SECTION 1: FRIENDS LEAGUE PODIUM & RANKINGS (Reference Image 1) */}
      {section === 'leaderboard' ? (
        <View className="gap-4">
          {/* "MY PROGRESS" 3-Bar Horizontal Bento Strip (Reference Image 1) */}
          <ProgressStripBento
            title="MY PROGRESS"
            metrics={[
              {
                id: 'points',
                label: 'Paw Points',
                current: pawBalance,
                target: 750,
                color: 'coral',
                icon: '🐾',
              },
              {
                id: 'cats',
                label: 'Cat Cards',
                current: collectionCards.length || 4,
                target: 10,
                color: 'primary',
                icon: '🃏',
              },
              {
                id: 'steps',
                label: 'Weekly Goal',
                current: 428,
                target: 500,
                color: 'secondary',
                icon: '🔥',
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
                  className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-pill border py-2 ${
                    active
                      ? 'border-charcoal bg-charcoal'
                      : 'border-border bg-surface dark:border-border-dark dark:bg-surface-dark'
                  }`}>
                  <Text className="text-xs">{m.emoji}</Text>
                  <Text
                    variant="caption"
                    className={`text-xs font-bold ${
                      active
                        ? 'text-white'
                        : 'text-text-primary dark:text-text-primary-dark'
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
              {/* 3-Pillar Podium Bento Card (Reference Image 1 Left Screen) */}
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

              {/* Ranked List Card with League Sub-Badges & Floating "You #Rank" Pill (Reference Image 1 Right Screen) */}
              <View className="relative">
                <Card className="gap-0 divide-y divide-border/60 overflow-hidden p-0 dark:divide-border-dark">
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
                        className={`flex-row items-center gap-3.5 px-4 py-3.5 ${
                          entry.isSelf ? 'bg-primary-muted/25' : ''
                        }`}>
                        {/* Two-digit Rank Number */}
                        <Text className="w-6 text-center text-xs font-bold text-text-secondary">
                          {paddedRank}
                        </Text>

                        {/* Circular Illustrated Avatar */}
                        <View className="h-11 w-11 items-center justify-center overflow-hidden rounded-pill border border-border bg-primary-muted">
                          {entry.avatarUrl ? (
                            <Image
                              source={{ uri: entry.avatarUrl }}
                              style={{ width: '100%', height: '100%' }}
                              contentFit="cover"
                            />
                          ) : (
                            <Text className="text-xs font-extrabold text-primary-dark">
                              {initials}
                            </Text>
                          )}
                        </View>

                        {/* Name + League Tier Sub-Badge */}
                        <View className="flex-1">
                          <View className="flex-row items-center gap-1.5">
                            <Text
                              variant="body"
                              numberOfLines={1}
                              className="text-sm font-extrabold">
                              {name}
                            </Text>
                            {entry.isSelf ? (
                              <View className="rounded-pill bg-primary px-2 py-0.5">
                                <Text className="text-[9px] font-extrabold text-white">
                                  YOU
                                </Text>
                              </View>
                            ) : null}
                          </View>

                          <View className="mt-1 flex-row items-center gap-1.5">
                            <View
                              style={{ backgroundColor: tierBadge.bg }}
                              className="flex-row items-center gap-1 rounded-pill px-2 py-0.5">
                              <Text className="text-[9px]">{tierBadge.icon}</Text>
                              <Text
                                style={{ color: tierBadge.color }}
                                className="text-[10px] font-bold">
                                {tierBadge.label}
                              </Text>
                            </View>
                            <Text variant="caption" className="text-[11px]">
                              @{entry.username}
                            </Text>
                          </View>
                        </View>

                        {/* Right Score + Orange Star Coin Badge */}
                        <View className="flex-row items-center gap-1.5">
                          <Text className="text-sm font-extrabold text-text-primary dark:text-text-primary-dark">
                            {formatLeaderboardValue(metric, entry.value)}
                          </Text>
                          <View className="h-4 w-4 items-center justify-center rounded-pill bg-[#E9806E]">
                            <Text className="text-[9px] font-bold text-white">
                              ★
                            </Text>
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </Card>

                {/* Floating "You #2 ↓" Pill Overlay (Reference Image 1 Bottom Center) */}
                {selfEntry ? (
                  <View className="mt-3 items-center">
                    <View className="flex-row items-center gap-2.5 rounded-pill border border-border bg-surface px-3.5 py-2 shadow-card dark:border-border-dark dark:bg-surface-dark">
                      <View className="h-7 w-7 overflow-hidden rounded-pill bg-primary-muted">
                        <Image
                          source={{
                            uri: selfEntry.avatarUrl || DEMO_AVATARS.mina,
                          }}
                          style={{ width: '100%', height: '100%' }}
                          contentFit="cover"
                        />
                      </View>
                      <View>
                        <Text className="text-xs font-extrabold leading-tight text-text-primary dark:text-text-primary-dark">
                          You
                        </Text>
                        <Text className="text-[10px] font-bold leading-tight text-text-secondary">
                          #{selfEntry.rank} in Gold League
                        </Text>
                      </View>
                      <Text className="ml-1 text-xs font-extrabold text-text-secondary">
                        ↑
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
              <Text variant="label">👀 Show me on Friends Leaderboard</Text>
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
              emoji="✨"
              title="No recent milestones yet"
              message="Completed walks, unlocked badges, challenge completions, and shared cat cards from you and your friends will appear here."
            />
          ) : (
            activityEvents.map((ev) => (
              <Card key={ev.id} className="gap-3 p-4">
                <View className="flex-row items-start gap-3">
                  <View className="h-11 w-11 items-center justify-center overflow-hidden rounded-pill border border-border bg-primary-muted">
                    {ev.actor.avatar_url ? (
                      <Image
                        source={{ uri: ev.actor.avatar_url }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                      />
                    ) : (
                      <Text className="text-xl">{ev.copy.emoji}</Text>
                    )}
                  </View>

                  <View className="flex-1 gap-0.5">
                    <Text variant="body" className="font-bold">
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
                      className="text-sm font-bold text-text-secondary dark:text-text-secondary-dark">
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
                      <View
                        className={`relative overflow-hidden rounded-2xl border p-1.5 ${sharedTheme.surfaceClass} ${sharedTheme.borderClass}`}>
                        <Image
                          source={{ uri: ev.sharedCatPhotoUrl }}
                          style={{ width: '100%', height: 210, borderRadius: 14 }}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                          accessibilityLabel="Shared cat card photo"
                        />
                        {sharedTheme.accentLabel ? (
                          <View className="absolute bottom-3 left-3 rounded-pill bg-black/70 px-2.5 py-0.5">
                            <Text
                              variant="caption"
                              className="text-[10px] font-semibold text-white">
                              {sharedTheme.accentLabel}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    );
                  })()
                ) : null}

                {/* Reactions Row (👏 🐾 ❤️ 🔥) */}
                <View className="flex-row items-center gap-2 border-t border-border pt-2.5 dark:border-border-dark">
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
                        className={`flex-row items-center gap-1 rounded-pill border px-3 py-1 ${
                          active
                            ? 'border-primary bg-primary-muted dark:bg-surface-elevated-dark'
                            : 'border-border bg-background dark:border-border-dark dark:bg-background-dark'
                        }`}>
                        <Text className="text-sm">{emoji}</Text>
                        {count > 0 ? (
                          <Text
                            variant="caption"
                            className="text-xs font-bold">
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
          <Card className="gap-3">
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-1">
                <Text variant="label">🔗 Invite by Link or Code</Text>
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
                      className="flex-row items-center justify-between rounded-card border border-border p-2.5 dark:border-border-dark">
                      <View className="flex-1">
                        <Text variant="body" className="font-semibold">
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
                        <View className="h-11 w-11 items-center justify-center overflow-hidden rounded-pill border border-border bg-primary-muted">
                          {item.friend.avatar_url ? (
                            <Image
                              source={{ uri: item.friend.avatar_url }}
                              style={{ width: '100%', height: '100%' }}
                              contentFit="cover"
                            />
                          ) : (
                            <Text
                              variant="caption"
                              className="font-bold text-primary-dark">
                              {initials}
                            </Text>
                          )}
                        </View>
                        <View className="flex-1">
                          <Text variant="body" className="font-bold">
                            {name}
                          </Text>
                          <Text variant="caption" className="text-xs">
                            @{item.friend.username}
                          </Text>
                        </View>
                      </View>
                      <Text
                        variant="caption"
                        className="text-xs font-semibold text-primary">
                        Profile →
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
