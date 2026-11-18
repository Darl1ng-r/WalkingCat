import { Image } from 'expo-image';
import { ScrollView, View } from 'react-native';

import { Text } from './text';

export interface LeagueTierInfo {
  id: 'bronze' | 'silver' | 'gold' | 'diamond' | 'emerald' | 'ruby';
  name: string;
  minPoints: number;
  primaryHex: string;
  secondaryHex: string;
  borderHex: string;
  motif: 'star' | 'swords' | 'sun' | 'gem' | 'rosette' | 'crown';
}

export const LEAGUE_TIERS: readonly LeagueTierInfo[] = [
  {
    id: 'bronze',
    name: 'Bronze',
    minPoints: 0,
    primaryHex: '#FCE8D5',
    secondaryHex: '#F4A97B',
    borderHex: '#191A26',
    motif: 'star',
  },
  {
    id: 'silver',
    name: 'Silver',
    minPoints: 150,
    primaryHex: '#FFFFFF',
    secondaryHex: '#E5E7EB',
    borderHex: '#191A26',
    motif: 'swords',
  },
  {
    id: 'gold',
    name: 'Gold',
    minPoints: 350,
    primaryHex: '#F4A97B',
    secondaryHex: '#E08B57',
    borderHex: '#191A26',
    motif: 'sun',
  },
  {
    id: 'diamond',
    name: 'Diamond',
    minPoints: 700,
    primaryHex: '#191A26',
    secondaryHex: '#2A2C3E',
    borderHex: '#191A26',
    motif: 'gem',
  },
  {
    id: 'emerald',
    name: 'Emerald',
    minPoints: 1200,
    primaryHex: '#FCE8D5',
    secondaryHex: '#F4A97B',
    borderHex: '#191A26',
    motif: 'rosette',
  },
  {
    id: 'ruby',
    name: 'Ruby',
    minPoints: 2000,
    primaryHex: '#191A26',
    secondaryHex: '#191A26',
    borderHex: '#F4A97B',
    motif: 'crown',
  },
] as const;

function buildBlobCatCircleSvg(
  tier: LeagueTierInfo,
  unlocked: boolean,
  isCurrent: boolean
): string {
  // Styled after the reference's top circular pet/cat category badges ("Все | Коты | Собаки")
  const bgFill = isCurrent
    ? '#191A26'
    : unlocked
      ? tier.primaryHex
      : '#FFFFFF';
  const catFill = isCurrent ? '#FFFFFF' : '#191A26';
  const eyeRing = isCurrent ? '#191A26' : '#FFFFFF';
  const accentRing = isCurrent ? '#F4A97B' : '#191A26';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="76" height="76" viewBox="0 0 76 76">
    <circle cx="38" cy="38" r="34" fill="${bgFill}" stroke="${accentRing}" stroke-width="${isCurrent ? '3.5' : '2.5'}" />
    <!-- Cat Ears -->
    <path d="M 22 40 L 25 18 L 36 29 Z" fill="${catFill}" />
    <path d="M 54 40 L 51 18 L 40 29 Z" fill="${catFill}" />
    <!-- Cat Blob Head -->
    <ellipse cx="38" cy="43" rx="18" ry="15" fill="${catFill}" />
    <!-- Big Expressive Eyes -->
    <circle cx="31" cy="42" r="4.5" fill="${eyeRing}" />
    <circle cx="32" cy="42" r="2" fill="${catFill}" />
    <circle cx="45" cy="42" r="4.5" fill="${eyeRing}" />
    <circle cx="44" cy="42" r="2" fill="${catFill}" />
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export interface LeagueEmblemRowProps {
  totalPoints: number;
  showAllUnlocked?: boolean;
}

export function getActiveLeagueTier(totalPoints: number): LeagueTierInfo {
  let active = LEAGUE_TIERS[0];
  for (const tier of LEAGUE_TIERS) {
    if (totalPoints >= tier.minPoints) {
      active = tier;
    }
  }
  return active;
}

export function LeagueEmblemRow({
  totalPoints,
  showAllUnlocked = false,
}: LeagueEmblemRowProps) {
  const activeTier = getActiveLeagueTier(totalPoints);

  return (
    <View className="gap-2">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="flex-row items-center justify-between gap-3 py-1">
        {LEAGUE_TIERS.map((tier) => {
          const unlocked = showAllUnlocked || totalPoints >= tier.minPoints;
          const isCurrent = tier.id === activeTier.id;
          const uri = buildBlobCatCircleSvg(tier, unlocked, isCurrent);

          return (
            <View
              key={tier.id}
              accessibilityLabel={`${tier.name} League${
                isCurrent ? ', current league' : unlocked ? ', unlocked' : ', locked'
              }`}
              className="items-center gap-1">
              <Image
                source={{ uri }}
                style={{ width: 58, height: 58 }}
                contentFit="contain"
              />
              <View
                className={`rounded-pill border border-[#191A26] px-2.5 py-0.5 ${
                  isCurrent ? 'bg-[#191A26]' : 'bg-[#FCE8D5]'
                }`}>
                <Text
                  className={`text-[10px] font-extrabold ${
                    isCurrent ? 'text-white' : 'text-[#191A26]'
                  }`}>
                  {tier.name}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
