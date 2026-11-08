import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import {
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

export default function HomeScreen() {
  const { profile } = useSession();
  const { data, isLoading, requestConnect, openHealthSettings } = useTodayHealthSummary();
  const { data: weekSummary } = useActivityDashboard('week');
  const { data: challengesOverview } = useChallenges();
  const { data: pointsSummary } = usePointsSummary();
  const pawBalance = pointsSummary?.totalPoints ?? 620;
  const { data: collectionCards = [] } = useCatCollection('newest');
  const [connecting, setConnecting] = useState(false);
  const [heroMapStyle, setHeroMapStyle] = useState<'satellite' | 'street'>('satellite');

  const permState = data?.permissionState ?? 'not_connected';
  const providerName = data?.providerDisplayName ?? 'Health App';
  const stepsToday = data?.stepsToday ?? null;
  const walksToday = data?.walksTodayCount ?? 0;
  const distanceToday = data?.distanceTodayMeters ?? 0;

  const featuredCat = collectionCards[0];
  const displaySteps = stepsToday ?? (weekSummary?.totalSteps ? Math.round(weekSummary.totalSteps / 4) : 6840);
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

  return (
    <Screen scroll contentContainerClassName="gap-5 pb-32">
      {/* Top Editorial Bento Header */}
      <View className="mt-2 flex-row items-center justify-between gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          onPress={() => router.push('/profile')}
          className="flex-row items-center gap-3">
          <View className="h-12 w-12 overflow-hidden rounded-pill border-2 border-white bg-primary-muted shadow-sm">
            <Image
              source={{ uri: DEMO_AVATARS.mina }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
            />
          </View>
          <View>
            <View className="flex-row items-center gap-1.5">
              <Text variant="label" className="text-[10px]">
                Gold League · #2
              </Text>
              <View className="h-1.5 w-1.5 rounded-pill bg-[#58B957]" />
            </View>
            <Text variant="title" className="text-2xl leading-7">
              {profile?.display_name || 'StrayCat Walk'}
            </Text>
          </View>
        </Pressable>

        <PointsChip />
      </View>

      {/* Bento 1: "MY PROGRESS" 3-Bar Horizontal Strip (Reference Image 1) */}
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
            onPress: () => router.push('/challenges'),
          },
          {
            id: 'cats',
            label: 'Cat Cards',
            current: collectionCards.length || 4,
            target: 10,
            color: 'primary',
            icon: '🃏',
            onPress: () => router.push('/collection'),
          },
          {
            id: 'steps',
            label: 'Daily Steps',
            current: displaySteps,
            target: 8000,
            color: 'secondary',
            icon: '🔥',
            onPress: () => router.push('/walk'),
          },
        ]}
      />

      {/* Bento 2: Live Map + Walked Path Hero Card (Reference Image 2) */}
      <View className="overflow-hidden rounded-bento border border-white/90 bg-surface shadow-bento dark:border-border-dark dark:bg-surface-dark">
        <View className="relative">
          <RouteMap
            coordinates={DEMO_WALK_ROUTE}
            borderless
            mapStyle={heroMapStyle}
            height={250}
          />
          {/* Floating Glass Filter Pills on Top of Map */}
          <View className="absolute left-3.5 right-3.5 top-3 z-30 flex-row items-center gap-2">
            <GlassPill
              label="All"
              active={heroMapStyle === 'satellite'}
              onPress={() => setHeroMapStyle('satellite')}
            />
            <GlassPill
              label="Live Route"
              badgeCount={23}
              onPress={() => router.push('/walk')}
            />
            <GlassPill
              label={heroMapStyle === 'street' ? 'Satellite' : 'Street'}
              active={heroMapStyle === 'street'}
              onPress={() =>
                setHeroMapStyle((prev) => (prev === 'satellite' ? 'street' : 'satellite'))
              }
            />
          </View>
        </View>

        {/* Bottom Sheet Inside Hero Bento */}
        <View className="-mt-5 gap-3 rounded-t-[28px] bg-surface p-5 dark:bg-surface-dark">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View className="h-7 w-7 items-center justify-center rounded-pill bg-[#E8F7E8]">
                <Text className="text-sm">🎯</Text>
              </View>
              <Text className="text-xs font-extrabold uppercase tracking-wider text-text-secondary">
                Live Walk Route
              </Text>
            </View>

            <View className="flex-row items-center">
              {[DEMO_AVATARS.mina, DEMO_AVATARS.tariq, DEMO_AVATARS.layla].map(
                (uri, idx) => (
                  <View
                    key={uri}
                    style={{ marginLeft: idx === 0 ? 0 : -8 }}
                    className="h-7 w-7 overflow-hidden rounded-pill border-2 border-white bg-primary-muted">
                    <Image
                      source={{ uri }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                    />
                  </View>
                )
              )}
              <View
                style={{ marginLeft: -6 }}
                className="h-7 items-center justify-center rounded-pill border-2 border-white bg-[#58B957] px-2">
                <Text className="text-[11px] font-extrabold text-white">+23</Text>
              </View>
            </View>
          </View>

          <Text className="text-xl font-extrabold leading-6 tracking-tight text-text-primary dark:text-text-primary-dark">
            Sunset Cat Patrol: Discover Your Next Favorite Spot
          </Text>

          {/* Reward Pills (+120 XP & +65 Paw Pts) */}
          <View className="flex-row items-center gap-2.5">
            <View className="flex-row items-center gap-1.5 rounded-pill bg-[#E8F7E8] px-2.5 py-1">
              <View className="h-4 w-4 items-center justify-center rounded-pill bg-[#58B957]">
                <Text className="text-[9px] font-bold text-white">★</Text>
              </View>
              <Text className="text-xs font-extrabold text-[#181A22]">+120 XP</Text>
            </View>

            <View className="flex-row items-center gap-1.5 rounded-pill bg-[#EEFBF0] px-2.5 py-1">
              <View className="h-4 w-4 items-center justify-center rounded-pill bg-[#58B957]">
                <Text className="text-[9px] font-bold text-white">🐾</Text>
              </View>
              <Text className="text-xs font-extrabold text-[#181A22]">+65 Paw Pts</Text>
            </View>
          </View>

          {/* Green Pill CTA */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start Walk Challenge"
            onPress={() => router.push('/walk')}
            className="mt-1 flex-row items-center justify-center gap-2 rounded-pill bg-[#58B957] py-3.5 shadow-sm active:opacity-90">
            <View className="h-5 w-5 items-center justify-center rounded-pill bg-white">
              <Text className="ml-0.5 text-[9px] font-extrabold text-[#58B957]">▶</Text>
            </View>
            <Text className="text-sm font-extrabold text-white">Start Walk</Text>
          </Pressable>
        </View>
      </View>

      {/* Bento 3: Two-Column Asymmetric Bento Grid (Featured Illustrated Cat + Today's Stats) */}
      <View className="flex-row gap-3.5">
        {/* Left Bento Tile: Featured Illustrated Cat Card */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Cat Collection"
          onPress={() =>
            featuredCat
              ? router.push({ pathname: '/cat/[id]', params: { id: featuredCat.id } })
              : router.push('/collection')
          }
          className="flex-1 overflow-hidden rounded-bento border border-white/90 bg-surface shadow-card active:opacity-95 dark:border-border-dark dark:bg-surface-dark">
          <View className="relative h-36 w-full bg-primary-muted">
            <Image
              source={{ uri: featuredCat?.coverUrl || '/demo/marmalade.jpg' }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
            />
            <View
              style={{ backgroundColor: 'rgba(28, 30, 38, 0.72)' }}
              className="absolute left-2.5 top-2.5 rounded-pill border border-white/25 px-2.5 py-0.5">
              <Text className="text-[10px] font-extrabold text-white">#001</Text>
            </View>
            <View
              style={{ backgroundColor: 'rgba(88, 185, 87, 0.92)' }}
              className="absolute bottom-2.5 right-2.5 rounded-pill px-2 py-0.5">
              <Text className="text-[10px] font-extrabold text-white">
                {featuredCat ? `${featuredCat.sighting_count}× seen` : '6× seen'}
              </Text>
            </View>
          </View>
          <View className="p-3.5">
            <Text variant="label" className="text-[9px] text-primary">
              Featured Cat Card
            </Text>
            <Text
              numberOfLines={1}
              className="mt-0.5 text-base font-extrabold text-text-primary dark:text-text-primary-dark">
              {featuredCat?.nickname || 'Marmalade'}
            </Text>
            <Text numberOfLines={1} variant="caption" className="mt-0.5 text-[11px]">
              Sunlit Porch · Friendly
            </Text>
          </View>
        </Pressable>

        {/* Right Column: Stacked Bento Tiles (League Podium Shortcut + Boutique Shortcut) */}
        <View className="flex-1 justify-between gap-3.5">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open Friends League"
            onPress={() => router.push('/social')}
            className="flex-1 justify-between rounded-bento border border-white/90 bg-[#7C66DC] p-4 shadow-card active:opacity-95">
            <View className="flex-row items-center justify-between">
              <View className="rounded-pill bg-white/20 px-2.5 py-0.5">
                <Text className="text-[10px] font-extrabold uppercase text-white">
                  Gold League
                </Text>
              </View>
              <Text className="text-lg">🏆</Text>
            </View>
            <View className="mt-2">
              <Text className="text-2xl font-extrabold text-white">Rank #2</Text>
              <Text className="mt-0.5 text-[11px] font-semibold text-white/85">
                30m behind Tariq →
              </Text>
            </View>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open Cosmetics Boutique"
            onPress={() => router.push('/cosmetics')}
            className="flex-1 justify-between rounded-bento border border-white/90 bg-surface p-4 shadow-card active:opacity-95 dark:border-border-dark dark:bg-surface-dark">
            <View className="flex-row items-center justify-between">
              <Text variant="label" className="text-[10px] text-[#E9806E]">
                Boutique
              </Text>
              <Text className="text-base">✨</Text>
            </View>
            <View className="mt-1">
              <Text className="text-base font-extrabold text-text-primary dark:text-text-primary-dark">
                Card Themes
              </Text>
              <Text variant="caption" className="text-[11px]">
                Holographic & Gilded →
              </Text>
            </View>
          </Pressable>
        </View>
      </View>

      {/* Bento 4: Today's Activity Tiles */}
      <View className="gap-3">
        <Text variant="label">Today&apos;s Activity</Text>
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
        <Card className="gap-3 border-primary/30">
          <Text variant="heading">❤️ Connect {providerName}</Text>
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

      {/* Bento 5: Active Daily Challenges */}
      {challengesOverview && challengesOverview.activeDaily.length > 0 ? (
        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text variant="label">Today&apos;s Challenges</Text>
            <Button
              label="All Challenges"
              size="sm"
              variant="ghost"
              onPress={() => router.push('/challenges')}
            />
          </View>
          <View className="gap-2.5">
            {challengesOverview.activeDaily.map((challenge) => (
              <ChallengeCard
                key={challenge.instanceId}
                challenge={challenge}
                compact
              />
            ))}
          </View>
        </View>
      ) : null}

      {/* Bento 6: Weekly Activity Bar Chart */}
      <Card className="gap-4">
        <View className="flex-row items-start justify-between gap-2">
          <View className="flex-1">
            <Text variant="label">This Week</Text>
            <Text variant="heading" className="mt-1">
              {weekSummary?.encouragingTitle ?? 'A fresh week for a stroll 🌿'}
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
    </Screen>
  );
}
