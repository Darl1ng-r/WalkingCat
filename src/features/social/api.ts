import { getSignedSightingPhotoUrl } from '@/features/sightings';
import { isSupabaseConfigured } from '@/lib/env';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import {
  formatActivityEventCopy,
  getWeekStartDateString,
  parseInviteCodeFromInput,
  type ActivityEventType,
  type FormattedActivityEventCopy,
  type LeaderboardMetric,
  type LeaderboardWeekPeriod,
  type ReactionEmoji,
} from './utils';

export interface PublicUserProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface DiscoverableUserSearchResult extends PublicUserProfile {
  friendship_status: 'pending' | 'accepted' | 'declined' | 'blocked' | null;
}

export interface FriendshipItem {
  friendshipId: string;
  friend: PublicUserProfile;
  createdAt: string;
  respondedAt: string | null;
}

export interface FriendshipsOverview {
  acceptedFriends: FriendshipItem[];
  incomingRequests: FriendshipItem[];
  outgoingRequests: FriendshipItem[];
}

export interface FriendInviteInfo {
  code: string;
  expiresAt: string;
  uses: number;
  maxUses: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  value: number;
  isSelf: boolean;
  hasOutlier: boolean;
}

export interface EventReactionCount {
  emoji: ReactionEmoji;
  count: number;
  reactedByMe: boolean;
}

export interface ActivityEventItem {
  id: string;
  userId: string;
  actor: PublicUserProfile;
  type: ActivityEventType;
  createdAt: string;
  copy: FormattedActivityEventCopy;
  sharedCatPhotoUrl: string | null;
  reactions: EventReactionCount[];
  myReaction: ReactionEmoji | null;
}

export interface FriendProfileSummary {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  memberSince: string;
  achievementsCount: number;
  showOnLeaderboard: boolean;
  weekSteps: number;
  weekDistanceM: number;
  weekWalks: number;
  weekChallengePoints: number;
  equippedBannerId: string;
  equippedTitleId: string;
}

const sharedCatSignedUrlCache = new Map<
  string,
  { url: string; expiresAt: number }
>();

/**
 * Searches discoverable users by username prefix (minimum 3 characters).
 */
export async function searchUsersByUsername(
  query: string
): Promise<DiscoverableUserSearchResult[]> {
  const clean = query.trim().replace(/^@/, '');
  if (clean.length < 3 || !isSupabaseConfigured) {
    return [];
  }

  const { data, error } = await supabase.rpc('search_discoverable_users', {
    p_query: clean,
  });

  if (error || !data) {
    if (error) {
      logger.warn('Failed to search discoverable users', {
        error: error.message,
      });
    }
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    username: row.username,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    friendship_status:
      (row.friendship_status as DiscoverableUserSearchResult['friendship_status']) ??
      null,
  }));
}

/**
 * Sends a friend request to `targetUserId`.
 */
export async function sendFriendRequest(targetUserId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
  }

  const { error } = await supabase.rpc('send_friend_request', {
    p_target_user_id: targetUserId,
  });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Accepts or declines an incoming friend request (`friendshipId`).
 */
export async function respondToFriendRequest(
  friendshipId: string,
  decision: 'accepted' | 'declined'
): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
  }

  const { error } = await supabase.rpc('respond_friend_request', {
    p_friendship_id: friendshipId,
    p_decision: decision,
  });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Removes an accepted friend or cancels an outgoing friend request.
 */
export async function removeOrCancelFriendship(
  otherUserId: string
): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
  }

  const { error } = await supabase.rpc('remove_or_cancel_friendship', {
    p_other_user_id: otherUserId,
  });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Blocks a user (hides them everywhere and prevents new friend requests).
 */
export async function blockUser(targetUserId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
  }

  const { error } = await supabase.rpc('block_user', {
    p_target_user_id: targetUserId,
  });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Creates or retrieves an active 8-character friend invite code.
 */
export async function createFriendInvite(): Promise<FriendInviteInfo> {
  if (!isSupabaseConfigured) {
    return {
      code: 'DEMO1234',
      expiresAt: new Date(Date.now() + 14 * 86400 * 1000).toISOString(),
      uses: 0,
      maxUses: 25,
    };
  }

  const { data, error } = await supabase.rpc('create_friend_invite');
  if (error || !data) {
    throw new Error(error?.message ?? 'Could not create invite code.');
  }

  return {
    code: data.code,
    expiresAt: data.expires_at,
    uses: data.uses,
    maxUses: data.max_uses,
  };
}

/**
 * Redeems a friend invite code (or `walkingcat://invite/<code>` URL) and returns the new friend's user ID.
 */
export async function redeemFriendInvite(
  rawCodeOrUrl: string
): Promise<string> {
  const code = parseInviteCodeFromInput(rawCodeOrUrl);
  if (!code) {
    throw new Error('Please enter a valid 6–12 character invite code.');
  }

  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase.rpc('redeem_friend_invite', {
    p_code: code,
  });

  if (error || !data) {
    throw new Error(error?.message ?? 'Could not redeem invite code.');
  }

  return data;
}

/**
 * Lists the current user's accepted friends, incoming requests, and outgoing requests.
 */
export async function listFriendshipsOverview(
  currentUserId: string | null | undefined
): Promise<FriendshipsOverview> {
  if (!currentUserId || !isSupabaseConfigured) {
    return {
      acceptedFriends: [],
      incomingRequests: [],
      outgoingRequests: [],
    };
  }

  const { data: rows, error } = await supabase
    .from('friendships')
    .select('id, requester_id, addressee_id, status, created_at, responded_at')
    .in('status', ['accepted', 'pending'])
    .order('created_at', { ascending: false });

  if (error || !rows || rows.length === 0) {
    return {
      acceptedFriends: [],
      incomingRequests: [],
      outgoingRequests: [],
    };
  }

  const counterpartIds = Array.from(
    new Set(
      rows.map((r) =>
        r.requester_id === currentUserId ? r.addressee_id : r.requester_id
      )
    )
  );

  const { data: profiles } = await supabase
    .from('public_profiles')
    .select('id, username, display_name, avatar_url')
    .in('id', counterpartIds);

  const profileMap = new Map<string, PublicUserProfile>();
  for (const p of profiles ?? []) {
    profileMap.set(p.id, {
      id: p.id,
      username: p.username,
      display_name: p.display_name,
      avatar_url: p.avatar_url,
    });
  }

  const acceptedFriends: FriendshipItem[] = [];
  const incomingRequests: FriendshipItem[] = [];
  const outgoingRequests: FriendshipItem[] = [];

  for (const r of rows) {
    const otherId =
      r.requester_id === currentUserId ? r.addressee_id : r.requester_id;
    const friend = profileMap.get(otherId) ?? {
      id: otherId,
      username: 'walker',
      display_name: 'Walker',
      avatar_url: null,
    };

    const item: FriendshipItem = {
      friendshipId: r.id,
      friend,
      createdAt: r.created_at,
      respondedAt: r.responded_at,
    };

    if (r.status === 'accepted') {
      acceptedFriends.push(item);
    } else if (r.status === 'pending') {
      if (r.addressee_id === currentUserId) {
        incomingRequests.push(item);
      } else {
        outgoingRequests.push(item);
      }
    }
  }

  return {
    acceptedFriends,
    incomingRequests,
    outgoingRequests,
  };
}

/**
 * Fetches the weekly friends leaderboard for `metric` and `weekPeriod` (`this_week` | `last_week`).
 */
export async function getFriendsLeaderboard(
  metric: LeaderboardMetric,
  weekPeriod: LeaderboardWeekPeriod = 'this_week'
): Promise<LeaderboardEntry[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  const weekStart = getWeekStartDateString(weekPeriod);
  const { data, error } = await supabase.rpc('get_friends_leaderboard', {
    p_metric: metric,
    p_week_start: weekStart,
  });

  if (error || !data) {
    if (error) {
      logger.warn('Failed to fetch friends leaderboard', {
        error: error.message,
      });
    }
    return [];
  }

  return data.map((row) => ({
    rank: Number(row.rank),
    userId: row.user_id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    value: Number(row.value ?? 0),
    isSelf: Boolean(row.is_self),
    hasOutlier: Boolean(row.has_outlier),
  }));
}

async function resolveSharedCatCardPhotoUrl(
  eventId: string,
  ownerUserId: string,
  currentUserId: string | null | undefined,
  coverPhotoPath: string | null
): Promise<string | null> {
  if (!coverPhotoPath || !isSupabaseConfigured) {
    return null;
  }

  const now = Date.now();
  const cached = sharedCatSignedUrlCache.get(eventId);
  if (cached && cached.expiresAt > now) {
    return cached.url;
  }

  // If the current user owns the cat card, we can sign directly
  if (currentUserId && ownerUserId === currentUserId) {
    const directUrl = await getSignedSightingPhotoUrl(coverPhotoPath);
    if (directUrl) {
      sharedCatSignedUrlCache.set(eventId, {
        url: directUrl,
        expiresAt: now + 10 * 60 * 1000,
      });
      return directUrl;
    }
  }

  // Otherwise request a short-lived (15 min) signed URL from the Edge Function
  const { data, error } = await supabase.functions.invoke<{
    signedUrl?: string | null;
  }>('sign-shared-cat-photo', {
    body: { event_id: eventId },
  });

  if (!error && data?.signedUrl) {
    sharedCatSignedUrlCache.set(eventId, {
      url: data.signedUrl,
      expiresAt: now + 12 * 60 * 1000,
    });
    return data.signedUrl;
  }

  return null;
}

/**
 * Lists milestone `activity_events` from the last 14 days for the user and their accepted friends,
 * hydrated with actor public profiles, reactions, and signed shared cat card photos.
 */
export async function listFriendActivityEvents(
  currentUserId: string | null | undefined,
  limit = 30
): Promise<ActivityEventItem[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  const fourteenDaysAgoIso = new Date(
    Date.now() - 14 * 86400 * 1000
  ).toISOString();

  const { data: events, error } = await supabase
    .from('activity_events')
    .select('id, user_id, type, payload, created_at')
    .gte('created_at', fourteenDaysAgoIso)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !events || events.length === 0) {
    return [];
  }

  const actorIds = Array.from(new Set(events.map((e) => e.user_id)));
  const eventIds = events.map((e) => e.id);

  const [{ data: profiles }, { data: reactionRows }] = await Promise.all([
    supabase
      .from('public_profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', actorIds),
    supabase
      .from('reactions')
      .select('id, event_id, user_id, emoji')
      .in('event_id', eventIds),
  ]);

  const profileMap = new Map<string, PublicUserProfile>();
  for (const p of profiles ?? []) {
    profileMap.set(p.id, {
      id: p.id,
      username: p.username,
      display_name: p.display_name,
      avatar_url: p.avatar_url,
    });
  }

  const reactionsByEventId = new Map<
    string,
    { user_id: string; emoji: ReactionEmoji }[]
  >();
  for (const r of reactionRows ?? []) {
    const arr = reactionsByEventId.get(r.event_id) ?? [];
    arr.push({ user_id: r.user_id, emoji: r.emoji });
    reactionsByEventId.set(r.event_id, arr);
  }

  return Promise.all(
    events.map(async (ev) => {
      const actor = profileMap.get(ev.user_id) ?? {
        id: ev.user_id,
        username: 'walker',
        display_name: 'Walker',
        avatar_url: null,
      };
      const actorLabel =
        ev.user_id === currentUserId
          ? 'You'
          : actor.display_name || `@${actor.username}`;
      const payloadObj =
        ev.payload && typeof ev.payload === 'object' && !Array.isArray(ev.payload)
          ? (ev.payload as Record<string, unknown>)
          : {};

      const copy = formatActivityEventCopy(ev.type, payloadObj, actorLabel);

      let sharedCatPhotoUrl: string | null = null;
      if (ev.type === 'cat_card_shared' && copy.sharedCatCard?.coverPhotoPath) {
        sharedCatPhotoUrl = await resolveSharedCatCardPhotoUrl(
          ev.id,
          ev.user_id,
          currentUserId,
          copy.sharedCatCard.coverPhotoPath
        );
      }

      const rawReactions = reactionsByEventId.get(ev.id) ?? [];
      const countsByEmoji = new Map<
        ReactionEmoji,
        { count: number; reactedByMe: boolean }
      >();
      let myReaction: ReactionEmoji | null = null;

      for (const r of rawReactions) {
        const prev = countsByEmoji.get(r.emoji) ?? {
          count: 0,
          reactedByMe: false,
        };
        const isMe = Boolean(currentUserId && r.user_id === currentUserId);
        if (isMe) {
          myReaction = r.emoji;
        }
        countsByEmoji.set(r.emoji, {
          count: prev.count + 1,
          reactedByMe: prev.reactedByMe || isMe,
        });
      }

      const reactions: EventReactionCount[] = Array.from(
        countsByEmoji.entries()
      ).map(([emoji, meta]) => ({
        emoji,
        count: meta.count,
        reactedByMe: meta.reactedByMe,
      }));

      return {
        id: ev.id,
        userId: ev.user_id,
        actor,
        type: ev.type,
        createdAt: ev.created_at,
        copy,
        sharedCatPhotoUrl,
        reactions,
        myReaction,
      };
    })
  );
}

/**
 * Toggles a reaction emoji (`👏` | `🐾` | `❤️` | `🔥`) on a milestone event.
 */
export async function toggleEventReaction(
  eventId: string,
  userId: string,
  emoji: ReactionEmoji,
  currentMyReaction: ReactionEmoji | null
): Promise<void> {
  if (!isSupabaseConfigured || !userId) {
    return;
  }

  if (currentMyReaction === emoji) {
    await supabase
      .from('reactions')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', userId);
    return;
  }

  await supabase.from('reactions').upsert(
    {
      event_id: eventId,
      user_id: userId,
      emoji,
    },
    { onConflict: 'event_id,user_id' }
  );
}

/**
 * Opt-in per-card share: shares a cat card (`catId`) to friends' Activity feed
 * (photo + nickname + sighting count; never area or coordinates).
 */
export async function shareCatCardToFriends(catId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
  }

  const { error } = await supabase.rpc('share_cat_card_to_friends', {
    p_cat_id: catId,
  });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Fetches a friend's public profile summary and this week's opted-in stats.
 */
export async function getFriendProfileSummary(
  friendId: string
): Promise<FriendProfileSummary | null> {
  if (!friendId || !isSupabaseConfigured) {
    return null;
  }

  const { data, error } = await supabase.rpc('get_friend_profile_summary', {
    p_friend_id: friendId,
  });

  if (error || !data || data.length === 0) {
    return null;
  }

  const row = data[0];
  return {
    userId: row.user_id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    memberSince: row.member_since,
    achievementsCount: Number(row.achievements_count ?? 0),
    showOnLeaderboard: Boolean(row.show_on_leaderboard),
    weekSteps: Number(row.week_steps ?? 0),
    weekDistanceM: Number(row.week_distance_m ?? 0),
    weekWalks: Number(row.week_walks ?? 0),
    weekChallengePoints: Number(row.week_challenge_points ?? 0),
    equippedBannerId: row.equipped_banner_id ?? 'banner_meadow',
    equippedTitleId: row.equipped_title_id ?? 'title_stroller',
  };
}

/**
 * Reads the user's `show_on_friends_leaderboard` setting from `privacy_settings`.
 */
export async function getShowOnLeaderboardSetting(
  userId: string | null | undefined
): Promise<boolean> {
  if (!userId || !isSupabaseConfigured) {
    return true;
  }

  const { data } = await supabase
    .from('privacy_settings')
    .select('show_on_friends_leaderboard')
    .eq('user_id', userId)
    .maybeSingle();

  return data?.show_on_friends_leaderboard ?? true;
}

/**
 * Updates the user's `show_on_friends_leaderboard` setting in `privacy_settings`.
 */
export async function updateShowOnLeaderboardSetting(
  userId: string,
  enabled: boolean
): Promise<boolean> {
  if (!userId || !isSupabaseConfigured) {
    return enabled;
  }

  const { error } = await supabase
    .from('privacy_settings')
    .upsert(
      {
        user_id: userId,
        show_on_friends_leaderboard: enabled,
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    throw new Error(error.message);
  }

  return enabled;
}
