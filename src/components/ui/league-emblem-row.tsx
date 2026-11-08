import { Image } from 'expo-image';
import { ScrollView, View } from 'react-native';

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
    name: 'Bronze League',
    minPoints: 0,
    primaryHex: '#F3A678',
    secondaryHex: '#C76D3A',
    borderHex: '#FAD1B5',
    motif: 'star',
  },
  {
    id: 'silver',
    name: 'Silver League',
    minPoints: 150,
    primaryHex: '#D8DEE9',
    secondaryHex: '#8E99AD',
    borderHex: '#F1F5F9',
    motif: 'swords',
  },
  {
    id: 'gold',
    name: 'Gold League',
    minPoints: 350,
    primaryHex: '#FDE047',
    secondaryHex: '#D97706',
    borderHex: '#FEF08A',
    motif: 'sun',
  },
  {
    id: 'diamond',
    name: 'Diamond League',
    minPoints: 700,
    primaryHex: '#CBD5E1',
    secondaryHex: '#64748B',
    borderHex: '#F8FAFC',
    motif: 'gem',
  },
  {
    id: 'emerald',
    name: 'Emerald League',
    minPoints: 1200,
    primaryHex: '#5EEAD4',
    secondaryHex: '#0D9488',
    borderHex: '#CCFBF1',
    motif: 'rosette',
  },
  {
    id: 'ruby',
    name: 'Ruby League',
    minPoints: 2000,
    primaryHex: '#FDA4AF',
    secondaryHex: '#E11D48',
    borderHex: '#FFE4E6',
    motif: 'crown',
  },
] as const;

function buildPentagonEmblemSvg(
  tier: LeagueTierInfo,
  unlocked: boolean,
  isCurrent: boolean
): string {
  const fillStart = unlocked ? tier.primaryHex : '#E8ECF8';
  const fillEnd = unlocked ? tier.secondaryHex : '#CBD5E8';
  const strokeColor = unlocked ? tier.borderHex : '#D8E0F0';
  const innerColor = unlocked ? '#FFFFFF' : '#94A3B8';

  const motifPath = !unlocked
    ? `<rect x="31" y="36" width="18" height="14" rx="3" fill="${innerColor}" fill-opacity="0.75" />
       <path d="M 35 36 V 31 C 35 28 45 28 45 31 V 36" stroke="${innerColor}" stroke-width="3" fill="none" stroke-opacity="0.75" />`
    : tier.motif === 'star'
      ? `<polygon points="40,22 44,33 56,33 46,40 50,52 40,45 30,52 34,40 24,33 36,33" fill="${innerColor}" fill-opacity="0.92" />`
      : tier.motif === 'swords'
        ? `<path d="M 28 26 L 52 50 M 52 26 L 28 50" stroke="${innerColor}" stroke-width="4" stroke-linecap="round" />
           <circle cx="40" cy="38" r="5" fill="${innerColor}" />`
        : tier.motif === 'sun'
          ? `<polygon points="40,20 45,33 58,38 45,43 40,56 35,43 22,38 35,33" fill="${innerColor}" fill-opacity="0.95" />
             <circle cx="40" cy="38" r="6" fill="${fillEnd}" />`
          : tier.motif === 'gem'
            ? `<polygon points="32,27 48,27 55,35 40,53 25,35" fill="${innerColor}" fill-opacity="0.9" />`
            : tier.motif === 'rosette'
              ? `<circle cx="40" cy="38" r="13" stroke="${innerColor}" stroke-width="3.5" fill="none" />
                 <circle cx="40" cy="38" r="6" fill="${innerColor}" />`
              : `<polygon points="26,46 29,29 40,37 51,29 54,46" fill="${innerColor}" fill-opacity="0.95" />`;

  const glowRing = isCurrent
    ? `<polygon points="40,4 74,27 61,68 19,68 6,27" fill="none" stroke="#7C66DC" stroke-width="2.5" stroke-opacity="0.55" />`
    : '';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="76" viewBox="0 0 80 76">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${fillStart}" />
        <stop offset="100%" stop-color="${fillEnd}" />
      </linearGradient>
    </defs>
    ${glowRing}
    <polygon points="40,8 70,29 58,64 22,64 10,29" fill="url(#g)" stroke="${strokeColor}" stroke-width="3.5" stroke-linejoin="round" />
    <polygon points="40,14 63,31 54,58 26,58 17,31" fill="none" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="1.5" stroke-linejoin="round" />
    ${motifPath}
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
        contentContainerClassName="flex-row items-center justify-between gap-2.5 py-1">
        {LEAGUE_TIERS.map((tier) => {
          const unlocked = showAllUnlocked || totalPoints >= tier.minPoints;
          const isCurrent = tier.id === activeTier.id;
          const uri = buildPentagonEmblemSvg(tier, unlocked, isCurrent);

          return (
            <View
              key={tier.id}
              accessibilityLabel={`${tier.name}${
                isCurrent ? ', current league' : unlocked ? ', unlocked' : ', locked'
              }`}
              className="items-center">
              <Image
                source={{ uri }}
                style={{ width: 52, height: 50 }}
                contentFit="contain"
              />
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
