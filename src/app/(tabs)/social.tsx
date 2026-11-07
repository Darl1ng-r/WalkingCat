import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Share, View } from 'react-native';

import {
  Button,
  Card,
  EmptyState,
  Input,
  Screen,
  Text,
} from '@/components/ui';
import { getCardThemeTokens } from '@/features/cosmetics';
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
    <Screen scroll contentContainerClassName="gap-5 pb-12 pt-2">
      {/* Header */}
      <View className="flex-row items-center justify-between gap-3">
        <View>
          <Text variant="label">Community</Text>
          <Text variant="title" className="mt-0.5">
            Friends & Leaderboard
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

      {/* Section Tabs: Leaderboard | Activity | Friends | Requests */}
      <View className="flex-row gap-1.5">
        {(
          [
            { key: 'leaderboard', label: 'Leaderboard' },
            { key: 'activity', label: 'Activity' },
            {
              key: 'friends',
              label: `Friends (${acceptedFriends.length})`,
            },
            {
              key: 'requests',
              label:
                incomingRequests.length > 0
                  ? `Requests (${incomingRequests.length})`
                  : 'Requests',
            },
          ] as const
        ).map((tab) => {
          const active = section === tab.key;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
              onPress={() => {
                setSection(tab.key);
                setErrorMsg(null);
              }}
              className={`flex-1 items-center justify-center rounded-pill py-2 ${
                active
                  ? 'bg-primary'
                  : 'border border-border bg-surface dark:border-border-dark dark:bg-surface-dark'
              }`}>
              <Text
                variant="caption"
                numberOfLines={1}
                className={`text-xs font-bold ${
                  active
                    ? 'text-white'
                    : 'text-text-primary dark:text-text-primary-dark'
                }`}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

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

      {/* SECTION 1: LEADERBOARD */}
      {section === 'leaderboard' ? (
        <View className="gap-4">
          {/* Metric Segmented Control (Steps, Distance, Walks, Challenge Pts — never calories) */}
          <View className="flex-row gap-1.5">
            {LEADERBOARD_METRICS.map((m) => {
              const active = metric === m.key;
              return (
                <Pressable
                  key={m.key}
                  accessibilityRole="button"
                  accessibilityLabel={`Leaderboard metric ${m.label}`}
                  onPress={() => setMetric(m.key)}
                  className={`flex-1 items-center rounded-card border py-2.5 ${
                    active
                      ? 'border-primary bg-primary-muted dark:bg-surface-elevated-dark'
                      : 'border-border bg-surface dark:border-border-dark dark:bg-surface-dark'
                  }`}>
                  <Text className="text-base">{m.emoji}</Text>
                  <Text
                    variant="caption"
                    className={`mt-0.5 text-xs font-bold ${
                      active
                        ? 'text-primary-dark dark:text-primary-light'
                        : 'text-text-primary dark:text-text-primary-dark'
                    }`}>
                    {m.shortLabel}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Week Selector (This Week / Last Week) */}
          <View className="flex-row items-center justify-between">
            <Text variant="label">
              {weekPeriod === 'this_week'
                ? 'This Week (Mon–Sun)'
                : 'Last Week (Mon–Sun)'}
            </Text>
            <View className="flex-row gap-1.5">
              {(
                [
                  { key: 'this_week', label: 'This Week' },
                  { key: 'last_week', label: 'Last Week' },
                ] as const
              ).map((wp) => {
                const active = weekPeriod === wp.key;
                return (
                  <Pressable
                    key={wp.key}
                    accessibilityRole="button"
                    accessibilityLabel={wp.label}
                    onPress={() => setWeekPeriod(wp.key)}
                    className={`rounded-pill px-3 py-1 ${
                      active
                        ? 'bg-primary'
                        : 'border border-border bg-surface dark:border-border-dark dark:bg-surface-dark'
                    }`}>
                    <Text
                      variant="caption"
                      className={`text-xs font-semibold ${
                        active
                          ? 'text-white'
                          : 'text-text-primary dark:text-text-primary-dark'
                      }`}>
                      {wp.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Empty state if user has no friends yet */}
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
            <View className="gap-2.5">
              {leaderboard.map((entry) => {
                const name = entry.displayName || entry.username;
                const initials = getInitials(entry.displayName, entry.username);
                const medal =
                  entry.rank === 1
                    ? '🥇'
                    : entry.rank === 2
                      ? '🥈'
                      : entry.rank === 3
                        ? '🥉'
                        : `#${entry.rank}`;

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
                    }}>
                    <Card
                      className={`flex-row items-center gap-3 p-3.5 ${
                        entry.isSelf
                          ? 'border-2 border-primary bg-primary-muted/30 dark:bg-surface-elevated-dark'
                          : ''
                      }`}>
                      <View className="w-8 items-center">
                        <Text variant="body" className="font-bold">
                          {medal}
                        </Text>
                      </View>

                      <View className="h-10 w-10 items-center justify-center rounded-pill bg-primary-muted dark:bg-surface-elevated-dark">
                        <Text
                          variant="caption"
                          className="font-bold text-primary-dark dark:text-primary-light">
                          {initials}
                        </Text>
                      </View>

                      <View className="flex-1">
                        <View className="flex-row items-center gap-1.5">
                          <Text
                            variant="body"
                            numberOfLines={1}
                            className="font-bold">
                            {name}
                          </Text>
                          {entry.isSelf ? (
                            <View className="rounded-pill bg-primary px-2 py-0.5">
                              <Text
                                variant="caption"
                                className="text-[10px] font-bold text-white">
                                YOU
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <Text variant="caption" className="text-xs">
                          @{entry.username}
                          {entry.hasOutlier ? ' · 60k/day step cap applied' : ''}
                        </Text>
                      </View>

                      <Text
                        variant="body"
                        className="font-bold text-primary-dark dark:text-primary-light">
                        {formatLeaderboardValue(metric, entry.value)}
                      </Text>
                    </Card>
                  </Pressable>
                );
              })}
            </View>
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
                  <View className="h-10 w-10 items-center justify-center rounded-pill bg-primary-muted dark:bg-surface-elevated-dark">
                    <Text className="text-xl">{ev.copy.emoji}</Text>
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
                        className={`relative overflow-hidden rounded-xl border p-1.5 ${sharedTheme.surfaceClass} ${sharedTheme.borderClass}`}>
                        <Image
                          source={{ uri: ev.sharedCatPhotoUrl }}
                          style={{ width: '100%', height: 200, borderRadius: 10 }}
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
          {/* Invite Link & Code Redemption */}
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

          {/* Search by Username */}
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

          {/* Accepted Friends List */}
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
                        <View className="h-10 w-10 items-center justify-center rounded-pill bg-primary-muted dark:bg-surface-elevated-dark">
                          <Text
                            variant="caption"
                            className="font-bold text-primary-dark dark:text-primary-light">
                            {initials}
                          </Text>
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
