import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import {
  AppIcon,
  Button,
  Card,
  Screen,
  Text,
} from '@/components/ui';
import { useSession } from '@/features/auth';
import { useCatCollection } from '@/features/collection';
import { useTodayHealthSummary } from '@/features/health';
import {
  useActivityDashboard,
  useWalkHistory,
  WeeklyAreaChart,
} from '@/features/walk';
import { DEMO_AVATARS } from '@/lib/demo-data';
import {
  formatDistance,
  formatDuration,
  formatNumber,
  formatPace,
} from '@/lib/format';

// Mini dark route thumbnail SVG matching our Midnight Ink + Warm Peach palette
const MINI_ROUTE_THUMB_URI = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="110" height="110" viewBox="0 0 110 110">
    <rect width="110" height="110" rx="18" fill="#191A26" />
    <path d="M0,28 L110,28 M0,56 L110,56 M0,84 L110,84 M28,0 L28,110 M56,0 L56,110 M84,0 L84,110" stroke="#FFFFFF" stroke-opacity="0.06" stroke-width="1" />
    <path d="M22,82 C34,78 38,58 50,55 C62,52 66,68 76,58 C84,50 80,34 88,26" fill="none" stroke="#F4A97B" stroke-width="4" stroke-linecap="round" />
    <circle cx="22" cy="82" r="5" fill="#FFFFFF" stroke="#191A26" stroke-width="2" />
    <circle cx="88" cy="26" r="5.5" fill="#F4A97B" stroke="#FFFFFF" stroke-width="2" />
  </svg>`
)}`;

const DAILY_DISTANCE_GOAL_METERS = 3200;
const DAILY_TIME_GOAL_MIN = 40;

function getWalkTimeOfDayLabel(isoDate: string): string {
  const hour = new Date(isoDate).getHours();
  if (hour < 12) return 'Morning Walk';
  if (hour < 17) return 'Afternoon Walk';
  return 'Evening Walk';
}

export default function HomeScreen() {
  const { profile } = useSession();
  const { data: healthData, isLoading: healthLoading, requestConnect, openHealthSettings } =
    useTodayHealthSummary();
  const { data: weekSummary } = useActivityDashboard('week');
  const { walks } = useWalkHistory();
  const { data: favoriteCats = [] } = useCatCollection('most_seen');
  const [connecting, setConnecting] = useState(false);

  const permState = healthData?.permissionState ?? 'not_connected';
  const providerName = healthData?.providerDisplayName ?? 'Health App';

  const handleConnectPress = async () => {
    setConnecting(true);
    try {
      await requestConnect();
    } finally {
      setConnecting(false);
    }
  };

  // User's 3 favorite / most-seen neighborhood cats at the top
  const topCats = [
    {
      id: favoriteCats[0]?.id ?? 'demo-cat-1',
      name: favoriteCats[0]?.nickname ?? 'Marmalade',
      subtitle: favoriteCats[0]
        ? `${favoriteCats[0].sighting_count} sightings`
        : 'Favorite',
      avatar: favoriteCats[0]?.coverUrl ?? DEMO_AVATARS.mina,
      highlight: true,
    },
    {
      id: favoriteCats[1]?.id ?? 'demo-cat-2',
      name: favoriteCats[1]?.nickname ?? 'Whiskers',
      subtitle: favoriteCats[1]
        ? `${favoriteCats[1].sighting_count} sightings`
        : 'Favorite',
      avatar: favoriteCats[1]?.coverUrl ?? DEMO_AVATARS.layla,
      highlight: false,
    },
    {
      id: favoriteCats[2]?.id ?? 'demo-cat-3',
      name: favoriteCats[2]?.nickname ?? 'Mochi',
      subtitle: favoriteCats[2]
        ? `${favoriteCats[2].sighting_count} sightings`
        : 'Favorite',
      avatar: favoriteCats[2]?.coverUrl ?? DEMO_AVATARS.tariq,
      highlight: false,
    },
  ];

  // Today's Training / Walk Goal metrics
  const todayDay = weekSummary?.days.find((d) => d.isToday);
  const todayDistanceMeters = todayDay?.distanceMeters ?? 0;
  const todayMinutes = Math.round((todayDay?.movingTimeSeconds ?? 0) / 60);
  const distanceProgressPct = Math.min(
    100,
    Math.round((todayDistanceMeters / DAILY_DISTANCE_GOAL_METERS) * 100)
  );
  const timeProgressPct = Math.min(
    100,
    Math.round((todayMinutes / DAILY_TIME_GOAL_MIN) * 100)
  );

  // Latest recent walk
  const recentWalk = walks[0] ?? null;
  const recentWalkPaceSecPerKm =
    recentWalk && recentWalk.distance_m > 0
      ? recentWalk.moving_time_s / (recentWalk.distance_m / 1000)
      : null;

  return (
    <Screen scroll padded={false} contentContainerClassName="gap-5 pb-32">
      {/* 1. Midnight-Ink Header + 3 Favorite Cats */}
      <View className="bg-[#191A26] px-5 pb-14 pt-3">
        <View className="flex-row items-center justify-between">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            onPress={() => router.push('/profile')}
            className="min-h-[40px] justify-center">
            <Text className="text-lg font-extrabold tracking-tight text-white">
              {profile?.display_name || 'StrayCat Walk'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View cat collection"
            onPress={() => router.push('/collection')}
            className="min-h-[36px] flex-row items-center gap-1.5 rounded-pill border border-white/20 bg-white/10 px-3">
            <AppIcon name="cat" size={14} color="#F4A97B" />
            <Text className="text-xs font-extrabold text-white">
              {favoriteCats.length || 4} cats
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={{ zIndex: 20 }} className="-mt-12 px-3">
        <View className="flex-row items-start justify-around">
          {topCats.map((cat) => (
            <Pressable
              key={cat.id}
              accessibilityRole="button"
              accessibilityLabel={`View favorite cat ${cat.name}`}
              onPress={() =>
                router.push({ pathname: '/cat/[id]', params: { id: cat.id } })
              }
              className="items-center">
              <View className="rounded-pill bg-[#FAF8F5] p-1.5 dark:bg-[#12131C]">
                <View
                  className={`h-[72px] w-[72px] overflow-hidden rounded-pill border-[2.5px] bg-white ${
                    cat.highlight ? 'border-[#F4A97B]' : 'border-[#191A26]'
                  }`}>
                  <Image
                    source={{ uri: cat.avatar }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                  />
                </View>
              </View>
              <Text
                numberOfLines={1}
                className={`mt-1 text-xs font-extrabold ${
                  cat.highlight ? 'text-[#F4A97B]' : 'text-[#191A26] dark:text-white'
                }`}>
                {cat.name}
              </Text>
              <View className="mt-0.5 rounded-pill bg-[#191A26] px-2.5 py-0.5">
                <Text className="text-[10px] font-bold text-white/90">
                  {cat.subtitle}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      <View className="gap-5 px-4">
        {/* 2. Today's Training (Target Distance + Estimated Time + Start Walk) */}
        <View className="gap-2.5">
          <View className="flex-row items-center justify-between px-1">
            <Text variant="heading">Today&apos;s Training</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View walk history"
              onPress={() => router.push('/history')}
              className="min-h-[32px] flex-row items-center gap-0.5">
              <Text className="text-xs font-bold text-[#6E7085] dark:text-[#9EA1B8]">
                View All
              </Text>
              <AppIcon name="chevronRight" size={13} color="#F4A97B" />
            </Pressable>
          </View>

          <View className="gap-4 rounded-[24px] border-[1.5px] border-[#191A26] bg-[#191A26] p-4 shadow-sm">
            <View className="flex-row items-stretch gap-4">
              {/* Target Distance */}
              <View className="flex-1 gap-2">
                <View className="flex-row items-center gap-1.5">
                  <AppIcon name="target" size={14} color="#F4A97B" />
                  <Text className="text-xs font-semibold text-white/75">
                    Target Distance
                  </Text>
                </View>
                <View className="flex-row items-baseline gap-1">
                  <Text className="font-display text-2xl font-extrabold text-white">
                    {(DAILY_DISTANCE_GOAL_METERS / 1000).toFixed(1)}
                  </Text>
                  <Text className="text-xs font-bold text-white/70">km</Text>
                </View>
                <View className="h-2 w-full overflow-hidden rounded-full bg-white/15">
                  <View
                    style={{ width: `${Math.max(distanceProgressPct, 8)}%` }}
                    className="h-full rounded-full bg-[#F4A97B]"
                  />
                </View>
                <Text className="text-[11px] font-medium text-white/65">
                  {formatDistance(todayDistanceMeters)} completed
                </Text>
              </View>

              <View className="w-[1px] bg-white/15" />

              {/* Estimated Time */}
              <View className="flex-1 gap-2">
                <View className="flex-row items-center gap-1.5">
                  <AppIcon name="clock" size={14} color="#F4A97B" />
                  <Text className="text-xs font-semibold text-white/75">
                    Estimated Time
                  </Text>
                </View>
                <View className="flex-row items-baseline gap-1">
                  <Text className="font-display text-2xl font-extrabold text-white">
                    {DAILY_TIME_GOAL_MIN}
                  </Text>
                  <Text className="text-xs font-bold text-white/70">min</Text>
                </View>
                <View className="h-2 w-full overflow-hidden rounded-full bg-white/15">
                  <View
                    style={{ width: `${Math.max(timeProgressPct, 8)}%` }}
                    className="h-full rounded-full bg-[#F4A97B]"
                  />
                </View>
                <Text className="text-[11px] font-medium text-white/65">
                  {todayMinutes} min elapsed
                </Text>
              </View>
            </View>

            <Button
              label="Start Walk"
              variant="primary"
              size="md"
              onPress={() => router.push('/walk')}
            />
          </View>
        </View>

        {/* 3. Weekly Progress (Smooth Area Curve Chart) */}
        <View className="gap-2.5">
          <View className="flex-row items-center justify-between px-1">
            <Text variant="heading">Weekly Progress</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View Walk History"
              onPress={() => router.push('/history')}
              className="min-h-[32px] flex-row items-center gap-0.5">
              <Text className="text-xs font-bold text-[#6E7085] dark:text-[#9EA1B8]">
                This Week
              </Text>
              <AppIcon name="chevronDown" size={13} color="#F4A97B" />
            </Pressable>
          </View>

          <Card className="p-4">
            {weekSummary ? (
              <WeeklyAreaChart days={weekSummary.days} goalMeters={15_000} />
            ) : null}
          </Card>
        </View>

        {/* 4. Recent Walks */}
        <View className="gap-2.5">
          <View className="flex-row items-center justify-between px-1">
            <Text variant="heading">Recent Walks</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View all walks"
              onPress={() => router.push('/history')}
              className="min-h-[32px] flex-row items-center gap-0.5">
              <Text className="text-xs font-bold text-[#6E7085] dark:text-[#9EA1B8]">
                View All
              </Text>
              <AppIcon name="chevronRight" size={13} color="#F4A97B" />
            </Pressable>
          </View>

          {recentWalk ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open recent walk details"
              onPress={() =>
                router.push({
                  pathname: '/walk/[id]',
                  params: { id: recentWalk.id },
                })
              }>
              <Card className="flex-row items-center gap-4 p-4">
                <View className="h-24 w-24 overflow-hidden rounded-2xl border border-[#191A26]">
                  <Image
                    source={{ uri: MINI_ROUTE_THUMB_URI }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                  />
                </View>

                <View className="flex-1 gap-2">
                  <View>
                    <Text className="text-xs font-semibold text-[#6E7085] dark:text-[#9EA1B8]">
                      {getWalkTimeOfDayLabel(recentWalk.started_at)}
                    </Text>
                    <Text className="font-display text-2xl font-extrabold text-[#191A26] dark:text-white">
                      {formatDistance(recentWalk.distance_m)}
                    </Text>
                  </View>

                  <View className="flex-row items-center justify-between border-t border-[#191A26]/10 pt-2 dark:border-white/10">
                    <View>
                      <Text className="text-[10px] font-semibold text-[#6E7085] dark:text-[#9EA1B8]">
                        Pace
                      </Text>
                      <Text className="text-xs font-extrabold text-[#191A26] dark:text-white">
                        {recentWalkPaceSecPerKm !== null
                          ? formatPace(recentWalkPaceSecPerKm)
                          : '—'}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-[10px] font-semibold text-[#6E7085] dark:text-[#9EA1B8]">
                        Duration
                      </Text>
                      <Text className="text-xs font-extrabold text-[#191A26] dark:text-white">
                        {formatDuration(recentWalk.moving_time_s)}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-[10px] font-semibold text-[#6E7085] dark:text-[#9EA1B8]">
                        Steps
                      </Text>
                      <Text className="text-xs font-extrabold text-[#191A26] dark:text-white">
                        {recentWalk.steps ? formatNumber(recentWalk.steps) : '—'}
                      </Text>
                    </View>
                  </View>
                </View>
              </Card>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start your first walk"
              onPress={() => router.push('/walk')}>
              <Card className="flex-row items-center gap-4 p-4">
                <View className="h-20 w-20 overflow-hidden rounded-2xl border border-[#191A26]">
                  <Image
                    source={{ uri: MINI_ROUTE_THUMB_URI }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                  />
                </View>
                <View className="flex-1 gap-1">
                  <Text className="text-sm font-extrabold text-[#191A26] dark:text-white">
                    No walks recorded yet
                  </Text>
                  <Text variant="caption">
                    Tap Start Walk to track your first neighborhood route and spot cats along the way.
                  </Text>
                </View>
              </Card>
            </Pressable>
          )}
        </View>

        {/* Optional Health Connect Banner (only shown when disconnected on native) */}
        {!healthLoading && permState !== 'connected' && permState !== 'unavailable' ? (
          <Card elevated className="gap-3">
            <View className="flex-row items-center gap-2">
              <AppIcon name="heart" size={18} color="#191A26" />
              <Text variant="heading">Connect {providerName}</Text>
            </View>
            {permState === 'install_required' ? (
              <Button
                label="Install Health Connect"
                variant="secondary"
                onPress={openHealthSettings}
              />
            ) : permState === 'denied' ? (
              <Button
                label={`Open ${providerName} Settings`}
                variant="secondary"
                onPress={openHealthSettings}
              />
            ) : (
              <Button
                label={`Connect ${providerName}`}
                loading={connecting}
                onPress={handleConnectPress}
              />
            )}
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}
