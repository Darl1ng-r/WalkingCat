import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import {
  AppIcon,
  Button,
  Card,
  GlassPill,
  ProgressStripBento,
  Screen,
  StatTile,
  Text,
} from '@/components/ui';
import { useSession } from '@/features/auth';
import { useCatCollection } from '@/features/collection';
import {
  ChallengeCard,
  PointsChip,
  useChallenges,
  usePointsSummary,
} from '@/features/gamification';
import { useTodayHealthSummary } from '@/features/health';
import { ActivityBarChart, RouteMap, useActivityDashboard } from '@/features/walk';
import { DEMO_AVATARS, DEMO_WALK_ROUTE } from '@/lib/demo-data';
import { formatDistance, formatNumber } from '@/lib/format';

// Organic black-ink wavy drip divider from the bottom of the "Планы" card in the reference image
const WAVY_DRIP_SVG_URI = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="28" viewBox="0 0 440 28" preserveAspectRatio="none">
    <path d="M0,0 L440,0 L440,6 Q410,26 380,10 Q350,-4 320,16 Q290,28 260,10 Q220,-4 185,18 Q155,28 125,8 Q90,-4 55,20 Q25,28 0,8 Z" fill="#191A26" />
  </svg>`
)}`;

export default function HomeScreen() {
  const { profile } = useSession();
  const { data, isLoading, requestConnect, openHealthSettings } = useTodayHealthSummary();
  const { data: weekSummary } = useActivityDashboard('week');
  const { data: challengesOverview } = useChallenges();
  const { data: pointsSummary } = usePointsSummary();
  const pawBalance = pointsSummary?.totalPoints ?? 620;
  const { data: collectionCards = [] } = useCatCollection('newest');
  const [connecting, setConnecting] = useState(false);
  const [heroMapStyle, setHeroMapStyle] = useState<'satellite' | 'street'>('street');

  const permState = data?.permissionState ?? 'not_connected';
  const providerName = data?.providerDisplayName ?? 'Health App';
  const stepsToday = data?.stepsToday ?? null;
  const walksToday = data?.walksTodayCount ?? 0;
  const distanceToday = data?.distanceTodayMeters ?? 0;

  const displaySteps =
    stepsToday ??
    (weekSummary?.totalSteps ? Math.round(weekSummary.totalSteps / 4) : 6840);
  const displayDistance =
    distanceToday > 0
      ? distanceToday
      : weekSummary?.totalDistanceMeters
        ? Math.round(weekSummary.totalDistanceMeters / 3)
        : 3420;

  const handleConnectPress = async () => {
    setConnecting(true);
    try {
      await requestConnect();
    } finally {
      setConnecting(false);
    }
  };

  // Top 3 cats/companions for the "Мои питомцы" scalloped header circles
  const topCats = [
    {
      id: collectionCards[0]?.id ?? 'demo-cat-1',
      name: collectionCards[0]?.nickname ?? 'Marmalade',
      role: 'Cat #001',
      avatar: DEMO_AVATARS.mina,
      highlight: true,
    },
    {
      id: collectionCards[1]?.id ?? 'demo-cat-2',
      name: collectionCards[1]?.nickname ?? 'Whiskers',
      role: 'Cat #002',
      avatar: DEMO_AVATARS.layla,
      highlight: false,
    },
    {
      id: collectionCards[2]?.id ?? 'demo-cat-3',
      name: collectionCards[2]?.nickname ?? 'Mochi',
      role: 'Cat #003',
      avatar: DEMO_AVATARS.tariq,
      highlight: false,
    },
  ];

  return (
    <Screen scroll padded={false} contentContainerClassName="gap-4 pb-32">
      {/* 1. Deep Midnight-Ink Top Header ("Мои питомцы + ⋮" from Reference Top-Left Screen) */}
      <View className="bg-[#191A26] px-5 pb-14 pt-3">
        <View className="flex-row items-center justify-between">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            onPress={() => router.push('/profile')}>
            <Text className="text-lg font-extrabold text-white">
              {profile?.display_name || 'My Cats & Walks'}
            </Text>
          </Pressable>
          <View className="flex-row items-center gap-2">
            <PointsChip />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Spot a cat"
              onPress={() => router.push('/sighting/capture')}
              className="h-8 w-8 items-center justify-center rounded-pill border border-white/30 bg-[#252738]">
              <Text className="text-base font-bold text-white">+</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* 2. Scalloped White Halo Circles ("Огурец | Бублик | Пиксик" from Reference Top-Left Screen) */}
      <View style={{ zIndex: 20 }} className="-mt-12 px-3">
        <View className="flex-row items-start justify-around">
          {topCats.map((cat) => (
            <Pressable
              key={cat.id}
              accessibilityRole="button"
              accessibilityLabel={`View ${cat.name}`}
              onPress={() =>
                router.push({ pathname: '/cat/[id]', params: { id: cat.id } })
              }
              className="items-center">
              {/* Outer cream/white halo ring that carves a scalloped arch into the #191A26 header */}
              <View className="rounded-pill bg-[#FAF8F5] p-1.5 dark:bg-[#12131C]">
                <View className="h-[74px] w-[74px] overflow-hidden rounded-pill border-[2.5px] border-[#191A26] bg-white">
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
              <View className="mt-0.5 rounded-pill bg-[#191A26] px-3 py-0.5">
                <Text className="text-[10px] font-bold text-white">
                  {cat.role}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      <View className="gap-4 px-4">
        {/* 3. Filter Pill Row with Warm Peach Circle Icon + Solid Dark & Outlined White Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="items-center gap-2 py-0.5">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start Walk"
            onPress={() => router.push('/walk')}
            className="h-9 w-9 items-center justify-center rounded-pill border-[1.5px] border-[#191A26] bg-[#F4A97B]">
            <AppIcon name="paw" size={16} color="#191A26" />
          </Pressable>
          <GlassPill
            label="All"
            active={heroMapStyle === 'street'}
            onPress={() => setHeroMapStyle('street')}
          />
          <GlassPill
            label="Cats"
            badgeCount={collectionCards.length || 4}
            onPress={() => router.push('/collection')}
          />
          <GlassPill
            label="League"
            onPress={() => router.push('/social')}
          />
          <GlassPill
            label="Boutique"
            onPress={() => router.push('/cosmetics')}
          />
        </ScrollView>

        {/* 4. Dark Midnight-Ink "Планы" (Plans & Daily Challenges) Card + Organic Wavy Drip Bottom Edge */}
        <View>
          <View className="rounded-t-[28px] bg-[#191A26] px-4 pb-4 pt-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-extrabold text-white">
                Today&apos;s Plans & Challenges
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="All Challenges"
                onPress={() => router.push('/challenges')}>
                <Text className="text-xs font-bold text-[#F4A97B]">
                  All Challenges +
                </Text>
              </Pressable>
            </View>

            {/* Horizontal Day Strip ("10 11 [12] 13 14 15 16" in Reference) */}
            <View className="my-3 flex-row items-center justify-between px-1">
              {[
                { day: '10', label: 'Mon', active: false },
                { day: '11', label: 'Tue', active: false },
                { day: '12', label: 'Wed', active: true },
                { day: '13', label: 'Thu', active: false },
                { day: '14', label: 'Fri', active: false },
                { day: '15', label: 'Sat', active: false },
                { day: '16', label: 'Sun', active: false },
              ].map((d) => (
                <View key={d.day} className="items-center gap-0.5">
                  <View
                    className={`h-7 w-7 items-center justify-center rounded-pill ${
                      d.active ? 'bg-[#F4A97B]' : 'bg-transparent'
                    }`}>
                    <Text
                      className={`text-xs font-extrabold ${
                        d.active ? 'text-[#191A26]' : 'text-white/70'
                      }`}>
                      {d.day}
                    </Text>
                  </View>
                  <Text
                    className={`text-[9px] font-bold ${
                      d.active ? 'text-[#F4A97B]' : 'text-white/50'
                    }`}>
                    {d.label}
                  </Text>
                </View>
              ))}
            </View>

            {/* Warm Peach Pill Row & Dark Slate Pill Row inside the Midnight-Ink Card */}
            <View className="gap-2.5">
              {challengesOverview && challengesOverview.activeDaily.length > 0 ? (
                challengesOverview.activeDaily.map((challenge) => (
                  <ChallengeCard
                    key={challenge.instanceId}
                    challenge={challenge}
                    compact
                  />
                ))
              ) : (
                <Pressable
                  onPress={() => router.push('/walk')}
                  className="flex-row items-center justify-between rounded-pill bg-[#FCE8D5] px-4 py-3">
                  <Text className="text-xs font-extrabold text-[#191A26]">
                    Sunset Neighborhood Walk
                  </Text>
                  <Text className="text-xs font-bold text-[#191A26]">+65 pts</Text>
                </Pressable>
              )}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Start a walk with friends"
                onPress={() => router.push('/walk')}
                className="flex-row items-center justify-between rounded-pill border border-white/25 bg-[#2A2C3E] px-4 py-3">
                <View className="flex-row items-center gap-2">
                  <View className="h-6 w-6 overflow-hidden rounded-pill border border-white/40 bg-white">
                    <Image
                      source={{ uri: DEMO_AVATARS.mina }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                    />
                  </View>
                  <Text
                    numberOfLines={1}
                    className="text-xs font-bold text-white">
                    Walk & spot cats along your route…
                  </Text>
                </View>
                <Text className="text-xs font-extrabold text-[#F4A97B]">
                  09:00 ›
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Organic Black-Ink Wavy Drip Bottom Edge (Matching Reference Top-Left Screen) */}
          <Image
            source={{ uri: WAVY_DRIP_SVG_URI }}
            style={{ width: '100%', height: 22 }}
            contentFit="fill"
          />
        </View>

        {/* 5. Outlined White Action Pill Rows ("Не забудь о встречах! <" in Reference) */}
        <View className="gap-2.5">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open Friends League"
            onPress={() => router.push('/social')}
            className="flex-row items-center justify-between rounded-pill border-[1.5px] border-[#191A26] bg-white px-5 py-3.5 active:opacity-80">
            <Text className="text-xs font-extrabold text-[#191A26]">
              Don&apos;t miss the Friends League race!
            </Text>
            <Text className="text-sm font-black text-[#191A26]">‹</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open Cosmetics Boutique"
            onPress={() => router.push('/cosmetics')}
            className="flex-row items-center justify-between rounded-pill border-[1.5px] border-[#191A26] bg-white px-5 py-3.5 active:opacity-80">
            <Text className="text-xs font-extrabold text-[#191A26]">
              Visit the Card Themes & Boutique
            </Text>
            <Text className="text-sm font-black text-[#191A26]">‹</Text>
          </Pressable>
        </View>

        {/* 6. 3-Pill Attribute / Progress Strip */}
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
              onPress: () => router.push('/challenges'),
            },
            {
              id: 'cats',
              label: 'Cat Cards',
              current: collectionCards.length || 4,
              target: 10,
              color: 'primary',
              icon: 'cards',
              onPress: () => router.push('/collection'),
            },
            {
              id: 'steps',
              label: 'Daily Steps',
              current: displaySteps,
              target: 8000,
              color: 'secondary',
              icon: 'flame',
              onPress: () => router.push('/walk'),
            },
          ]}
        />

        {/* 7. Live GPS Route Preview Card */}
        <Card className="gap-3 overflow-hidden p-0">
          <RouteMap
            coordinates={DEMO_WALK_ROUTE}
            borderless
            mapStyle={heroMapStyle}
            height={210}
          />
          <View className="flex-row items-center justify-between px-4 pb-4 pt-1">
            <View className="flex-1 pr-2">
              <Text className="text-sm font-extrabold text-[#191A26] dark:text-white">
                Neighborhood GPS Route
              </Text>
              <Text variant="caption" className="text-xs">
                Warm peach trail · {DEMO_WALK_ROUTE.length} checkpoints
              </Text>
            </View>
            <Button
              label="Start Walk"
              variant="primary"
              size="sm"
              onPress={() => router.push('/walk')}
            />
          </View>
        </Card>

        {/* 8. Today's Activity ("Динамика" Dark Midnight-Ink Stat Tiles) */}
        <View className="gap-2.5">
          <Text variant="label" className="text-[#191A26] dark:text-white">
            Today&apos;s Dynamics
          </Text>
          <View className="flex-row gap-3">
            <StatTile
              label="Steps Today"
              value={stepsToday !== null ? formatNumber(stepsToday) : '—'}
              accentColor="secondary"
              unit={
                permState === 'connected'
                  ? `from ${providerName}`
                  : 'Connect Health'
              }
            />
            <StatTile
              label="Walks Today"
              value={formatNumber(walksToday)}
              accentColor="primary"
            />
          </View>

          <View className="flex-row gap-3">
            <StatTile
              label="Distance Today"
              value={formatDistance(displayDistance)}
              accentColor="coral"
            />
            {data?.activeKcalToday ? (
              <StatTile
                label={`Active Calories (from ${providerName})`}
                value={formatNumber(data.activeKcalToday)}
                unit="kcal"
              />
            ) : null}
          </View>
        </View>

        {!isLoading && permState !== 'connected' ? (
          <Card elevated className="gap-3">
            <View className="flex-row items-center gap-2">
              <AppIcon name="heart" size={18} color="#191A26" />
              <Text variant="heading">Connect {providerName}</Text>
            </View>
            {permState === 'install_required' ? (
              <>
                <Text variant="caption" className="leading-5">
                  Install or update Google Health Connect to display your daily steps and active
                  calories burned. We only read Steps and Active Calories and never write to your
                  health records.
                </Text>
                <Button
                  label="Install Health Connect"
                  variant="secondary"
                  onPress={openHealthSettings}
                />
              </>
            ) : permState === 'denied' ? (
              <>
                <Text variant="caption" className="leading-5">
                  Health access was not granted. You can still record walks normally, or enable read
                  access for Steps and Active Calories in {providerName} settings anytime.
                </Text>
                <Button
                  label={`Open ${providerName} Settings`}
                  variant="secondary"
                  onPress={openHealthSettings}
                />
              </>
            ) : permState === 'unavailable' ? (
              <Text variant="caption" className="leading-5">
                {providerName} is not available in this runtime (requires a native iOS/Android
                development build). Walk distance, pace, and estimated calories still work normally!
              </Text>
            ) : (
              <>
                <Text variant="caption" className="leading-5">
                  Connect {providerName} to see your daily step count and walk steps. We only read
                  Steps and Active Calories—we never write data or share health metrics.
                </Text>
                <Button
                  label={`Connect ${providerName}`}
                  loading={connecting}
                  onPress={handleConnectPress}
                />
              </>
            )}
          </Card>
        ) : null}

        {permState === 'connected' && stepsToday === 0 ? (
          <Card className="gap-1.5">
            <Text variant="label">0 steps reported so far</Text>
            <Text variant="caption" className="text-xs leading-5">
              If you have walked today and still see 0 steps, check that step read access is enabled
              for StrayCat Walk in {providerName}.
            </Text>
            <Button
              label={`Manage in ${providerName}`}
              size="sm"
              variant="ghost"
              onPress={openHealthSettings}
            />
          </Card>
        ) : null}

        {/* 9. Weekly Activity Summary Card */}
        <Card className="gap-4">
          <View className="flex-row items-start justify-between gap-2">
            <View className="flex-1">
              <Text variant="label">This Week</Text>
              <Text variant="heading" className="mt-1">
                {weekSummary?.encouragingTitle?.replace(/[\u{1F300}-\u{1FAFF}]/gu, '').trim() ??
                  'A fresh week for a stroll'}
              </Text>
              <Text variant="caption" className="mt-0.5 text-xs leading-5">
                {weekSummary?.encouragingSubtitle ??
                  'Whenever you step outside for a walk, your personal progress will show up here.'}
              </Text>
            </View>
            <Button
              label="Progress"
              size="sm"
              variant="ghost"
              onPress={() => router.push('/history/progress')}
            />
          </View>

          <View className="flex-row gap-2.5">
            <StatTile
              label="Active Days"
              value={
                weekSummary
                  ? `${weekSummary.activeDaysCount} of ${weekSummary.totalDays}`
                  : '0 of 7'
              }
              unit="days"
            />
            <StatTile
              label="Walks"
              value={weekSummary ? formatNumber(weekSummary.totalWalks) : '0'}
            />
          </View>

          <View className="flex-row gap-2.5">
            <StatTile
              label="Distance"
              value={
                weekSummary
                  ? formatDistance(weekSummary.totalDistanceMeters)
                  : '0 m'
              }
              accentColor="coral"
            />
            <StatTile
              label="Steps"
              value={
                weekSummary && weekSummary.totalSteps > 0
                  ? formatNumber(weekSummary.totalSteps)
                  : '—'
              }
            />
          </View>

          {weekSummary ? (
            <ActivityBarChart days={weekSummary.days} height={124} />
          ) : null}

          <View className="flex-row gap-3 pt-1">
            <Button
              label="Walk History"
              size="sm"
              variant="secondary"
              className="flex-1"
              onPress={() => router.push('/history')}
            />
            <Button
              label="Week / Month View"
              size="sm"
              variant="ghost"
              className="flex-1"
              onPress={() => router.push('/history/progress')}
            />
          </View>
        </Card>
      </View>
    </Screen>
  );
}
