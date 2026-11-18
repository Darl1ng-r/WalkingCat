import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import {
  AppIcon,
  Button,
  Card,
  ProgressStripBento,
  Screen,
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
import { ActivityBarChart, useActivityDashboard } from '@/features/walk';
import { DEMO_AVATARS } from '@/lib/demo-data';
import { formatDistance, formatNumber } from '@/lib/format';

// Organic black-ink wavy drip divider from the reference design
const WAVY_DRIP_SVG_URI = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="26" viewBox="0 0 440 26" preserveAspectRatio="none">
    <path d="M0,0 L440,0 L440,6 Q410,24 380,10 Q350,-4 320,15 Q290,26 260,9 Q220,-4 185,17 Q155,26 125,8 Q90,-4 55,19 Q25,26 0,8 Z" fill="#191A26" />
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

  const permState = data?.permissionState ?? 'not_connected';
  const providerName = data?.providerDisplayName ?? 'Health App';
  const stepsToday = data?.stepsToday ?? null;

  const displaySteps =
    stepsToday ??
    (weekSummary?.totalSteps ? Math.round(weekSummary.totalSteps / 4) : 6840);

  const handleConnectPress = async () => {
    setConnecting(true);
    try {
      await requestConnect();
    } finally {
      setConnecting(false);
    }
  };

  // Top 3 recent neighborhood cats for the scalloped header circles
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

  const primaryChallenge = challengesOverview?.activeDaily?.[0];

  return (
    <Screen scroll padded={false} contentContainerClassName="gap-5 pb-32">
      {/* 1. Midnight-Ink Header + 3 Scalloped Cat Portraits */}
      <View className="bg-[#191A26] px-5 pb-14 pt-3">
        <View className="flex-row items-center justify-between">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            onPress={() => router.push('/profile')}
            className="min-h-[40px] justify-center">
            <Text className="text-lg font-extrabold text-white">
              {profile?.display_name || 'StrayCat Walk'}
            </Text>
          </Pressable>
          <PointsChip />
        </View>
      </View>

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

      <View className="gap-5 px-4">
        {/* 2. Single Hero Focal Card: Today's Stroll + Week Strip + Active Challenge + Start Walk CTA */}
        <View>
          <View className="rounded-t-[28px] bg-[#191A26] px-4 pb-4 pt-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-extrabold text-white">
                Today&apos;s Stroll
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="All Challenges"
                onPress={() => router.push('/challenges')}
                className="min-h-[32px] justify-center">
                <Text className="text-xs font-bold text-[#F4A97B]">
                  All Challenges
                </Text>
              </Pressable>
            </View>

            {/* Dynamic 7-Day Activity Strip */}
            <View className="my-3 flex-row items-center justify-between px-1">
              {(weekSummary?.days ?? []).slice(-7).map((d) => {
                const dayNum = d.date.slice(8, 10);
                const active = d.isToday || d.distanceMeters > 0;
                return (
                  <View key={d.date} className="items-center gap-0.5">
                    <View
                      className={`h-7 w-7 items-center justify-center rounded-pill ${
                        d.isToday
                          ? 'bg-[#F4A97B]'
                          : d.distanceMeters > 0
                            ? 'bg-white/15'
                            : 'bg-transparent'
                      }`}>
                      <Text
                        className={`text-xs font-extrabold ${
                          d.isToday
                            ? 'text-[#191A26]'
                            : active
                              ? 'text-white'
                              : 'text-white/55'
                        }`}>
                        {dayNum}
                      </Text>
                    </View>
                    <Text
                      className={`text-[9px] font-bold ${
                        d.isToday ? 'text-[#F4A97B]' : 'text-white/55'
                      }`}>
                      {d.shortLabel}
                    </Text>
                  </View>
                );
              })}
            </View>

            <View className="gap-3">
              {primaryChallenge ? (
                <ChallengeCard challenge={primaryChallenge} compact />
              ) : null}

              <Button
                label="Start Walk"
                variant="primary"
                size="md"
                onPress={() => router.push('/walk')}
              />
            </View>
          </View>

          <Image
            source={{ uri: WAVY_DRIP_SVG_URI }}
            style={{ width: '100%', height: 22 }}
            contentFit="fill"
          />
        </View>

        {/* 3. Today's Snapshot: 3-Pill Progress Strip */}
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
              onPress: () => router.push('/cosmetics'),
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

        {/* 4. Weekly Rhythm Chart (Single clean card with inline summary & History link) */}
        <Card className="gap-4">
          <View className="flex-row items-center justify-between gap-2">
            <View className="flex-1">
              <Text variant="heading">
                {weekSummary?.encouragingTitle?.replace(/[\u{1F300}-\u{1FAFF}]/gu, '').trim() ??
                  'This Week'}
              </Text>
              <Text variant="caption" className="mt-0.5 text-xs">
                {weekSummary
                  ? `${formatDistance(weekSummary.totalDistanceMeters)} · ${formatNumber(
                      weekSummary.totalWalks
                    )} walks · ${weekSummary.activeDaysCount} active days`
                  : 'Your personal walking rhythm appears here.'}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View Walk History"
              onPress={() => router.push('/history')}
              className="min-h-[36px] flex-row items-center gap-0.5">
              <Text className="text-xs font-extrabold text-[#191A26] dark:text-[#F4A97B]">
                History
              </Text>
              <AppIcon name="chevronRight" size={14} color="#F4A97B" />
            </Pressable>
          </View>

          {weekSummary ? (
            <ActivityBarChart days={weekSummary.days} height={118} />
          ) : null}
        </Card>

        {/* Optional Health Connect Banner (only shown when disconnected on native) */}
        {!isLoading && permState !== 'connected' && permState !== 'unavailable' ? (
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
