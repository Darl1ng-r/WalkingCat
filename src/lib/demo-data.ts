import { isSupabaseConfigured } from './env';

/**
 * Interactive Demo Mode is active when running the app (`NODE_ENV !== 'test'`)
 * without a live `.env.local` Supabase configuration.
 */
export const isDemoMode =
  !isSupabaseConfigured && process.env.NODE_ENV !== 'test';

export function makeWalkerAvatarDataUri(
  bgStart: string,
  bgEnd: string,
  hairHex: string,
  shirtHex: string,
  _skinHex: string
): string {
  // Styled after the reference's signature "Blobs" black-ink cat character with expressive white-ringed eyes & whiskers
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${bgStart}" />
        <stop offset="100%" stop-color="${bgEnd}" />
      </linearGradient>
    </defs>
    <circle cx="80" cy="80" r="76" fill="url(#bg)" stroke="#191A26" stroke-width="5" />
    <!-- Pointed Cat Ears -->
    <path d="M 40 84 L 46 32 L 74 58 Z" fill="${hairHex}" stroke="#191A26" stroke-width="3" stroke-linejoin="round" />
    <path d="M 120 84 L 114 32 L 86 58 Z" fill="${hairHex}" stroke="#191A26" stroke-width="3" stroke-linejoin="round" />
    <!-- Blob Cat Head & Body -->
    <ellipse cx="80" cy="92" rx="44" ry="38" fill="${hairHex}" />
    <path d="M 38 148 C 40 114 120 114 122 148 Z" fill="${ hairHex }" />
    <!-- Expressive Big White-Ringed Eyes (Reference "Огурец" style) -->
    <ellipse cx="64" cy="88" rx="11" ry="13" fill="none" stroke="#FFFFFF" stroke-width="3.2" />
    <ellipse cx="66" cy="88" rx="5.5" ry="7.5" fill="#FFFFFF" />
    <ellipse cx="96" cy="88" rx="11" ry="13" fill="none" stroke="#FFFFFF" stroke-width="3.2" />
    <ellipse cx="94" cy="88" rx="5.5" ry="7.5" fill="#FFFFFF" />
    <!-- Cute Whiskers & Accent Collar -->
    <path d="M 24 92 Q 36 90 46 94 M 22 100 Q 35 99 46 101" stroke="#191A26" stroke-width="2.5" stroke-linecap="round" fill="none" />
    <path d="M 136 92 Q 124 90 114 94 M 138 100 Q 125 99 114 101" stroke="#191A26" stroke-width="2.5" stroke-linecap="round" fill="none" />
    <rect x="64" y="122" width="32" height="7" rx="3.5" fill="${shirtHex}" />
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const DEMO_AVATARS = {
  mina: makeWalkerAvatarDataUri('#FFFFFF', '#FAF8F5', '#191A26', '#F4A97B', '#F4A97B'),
  layla: makeWalkerAvatarDataUri('#FCE8D5', '#F8C29F', '#191A26', '#FFFFFF', '#F4A97B'),
  tariq: makeWalkerAvatarDataUri('#FFFFFF', '#F3EFEA', '#252738', '#F4A97B', '#F4A97B'),
  omar: makeWalkerAvatarDataUri('#FCE8D5', '#FAF8F5', '#191A26', '#F4A97B', '#F4A97B'),
  nadia: makeWalkerAvatarDataUri('#FFFFFF', '#FCE8D5', '#191A26', '#F4A97B', '#F4A97B'),
} as const;

export const DEMO_WALK_ROUTE: readonly { latitude: number; longitude: number }[] = [
  { latitude: 34.0132, longitude: -118.4988 },
  { latitude: 34.0141, longitude: -118.4979 },
  { latitude: 34.0153, longitude: -118.4966 },
  { latitude: 34.0164, longitude: -118.4951 },
  { latitude: 34.0172, longitude: -118.4938 },
  { latitude: 34.0168, longitude: -118.4922 },
  { latitude: 34.0156, longitude: -118.4912 },
  { latitude: 34.0144, longitude: -118.4924 },
  { latitude: 34.0136, longitude: -118.4941 },
] as const;

export interface DemoCatRecord {
  id: string;
  user_id: string;
  card_number: number;
  nickname: string | null;
  cover_sighting_id: string;
  cover_photo_path: string;
  coverUrl: string;
  sighting_count: number;
  first_seen_at: string;
  last_seen_at: string;
  area_geohash: string;
  theme_id: string;
  created_at: string;
}

const nowMs = Date.now();
const dayMs = 86_400_000;

export const demoState = {
  userId: 'demo-user-001',
  username: 'mina_walks',
  displayName: 'Mina Al-Mansoor',
  avatarUrl: DEMO_AVATARS.mina,
  equippedBannerId: 'banner_aurora_sky',
  equippedTitleId: 'title_feline_chronicler',
  totalEarnedPoints: 620,
  unlockedCosmeticIds: new Set<string>([
    'theme_classic_amber',
    'theme_forest_moss',
    'theme_sakura_blossom',
    'theme_starlight_cosmic',
    'theme_golden_foil',
    'banner_meadow',
    'banner_cozy_rooftops',
    'banner_aurora_sky',
    'title_stroller',
    'title_cat_spotter',
    'title_feline_chronicler',
  ]),
  pointsSpent: 250,
  cats: [
    {
      id: 'demo-cat-1',
      user_id: 'demo-user-001',
      card_number: 1,
      nickname: 'Marmalade',
      cover_sighting_id: 'demo-sighting-1a',
      cover_photo_path: 'demo/marmalade.jpg',
      coverUrl: '/demo/marmalade.jpg',
      sighting_count: 4,
      first_seen_at: new Date(nowMs - 18 * dayMs).toISOString(),
      last_seen_at: new Date(nowMs - 1 * dayMs).toISOString(),
      area_geohash: 'sv8wr',
      theme_id: 'theme_golden_foil',
      created_at: new Date(nowMs - 18 * dayMs).toISOString(),
    },
    {
      id: 'demo-cat-2',
      user_id: 'demo-user-001',
      card_number: 2,
      nickname: 'Professor Whiskers',
      cover_sighting_id: 'demo-sighting-2a',
      cover_photo_path: 'demo/whiskers.jpg',
      coverUrl: '/demo/whiskers.jpg',
      sighting_count: 3,
      first_seen_at: new Date(nowMs - 12 * dayMs).toISOString(),
      last_seen_at: new Date(nowMs - 2 * dayMs).toISOString(),
      area_geohash: 'sv8wq',
      theme_id: 'theme_starlight_cosmic',
      created_at: new Date(nowMs - 12 * dayMs).toISOString(),
    },
    {
      id: 'demo-cat-3',
      user_id: 'demo-user-001',
      card_number: 3,
      nickname: 'Mochi',
      cover_sighting_id: 'demo-sighting-3a',
      cover_photo_path: 'demo/mochi.jpg',
      coverUrl: '/demo/mochi.jpg',
      sighting_count: 2,
      first_seen_at: new Date(nowMs - 7 * dayMs).toISOString(),
      last_seen_at: new Date(nowMs - 3 * dayMs).toISOString(),
      area_geohash: 'sv8wr',
      theme_id: 'theme_sakura_blossom',
      created_at: new Date(nowMs - 7 * dayMs).toISOString(),
    },
    {
      id: 'demo-cat-4',
      user_id: 'demo-user-001',
      card_number: 4,
      nickname: 'Captain Boots',
      cover_sighting_id: 'demo-sighting-4a',
      cover_photo_path: 'demo/boots.jpg',
      coverUrl: '/demo/boots.jpg',
      sighting_count: 1,
      first_seen_at: new Date(nowMs - 2 * dayMs).toISOString(),
      last_seen_at: new Date(nowMs - 2 * dayMs).toISOString(),
      area_geohash: 'sv8wx',
      theme_id: 'theme_forest_moss',
      created_at: new Date(nowMs - 2 * dayMs).toISOString(),
    },
  ] as DemoCatRecord[],
  walks: [
    {
      id: 'demo-walk-1',
      client_id: 'demo-walk-1',
      started_at: new Date(nowMs - 4 * 3600_000).toISOString(),
      ended_at: new Date(nowMs - 3.3 * 3600_000).toISOString(),
      duration_s: 2520,
      moving_time_s: 2380,
      distance_m: 3150,
      avg_speed_mps: 1.32,
      steps: 4120,
      active_kcal: 165,
      kcal_source: 'health' as const,
      route_polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
      point_count: 42,
      isPendingUpload: false,
    },
    {
      id: 'demo-walk-2',
      client_id: 'demo-walk-2',
      started_at: new Date(nowMs - dayMs - 3 * 3600_000).toISOString(),
      ended_at: new Date(nowMs - dayMs - 2.4 * 3600_000).toISOString(),
      duration_s: 2160,
      moving_time_s: 2040,
      distance_m: 2680,
      avg_speed_mps: 1.31,
      steps: 3510,
      active_kcal: 142,
      kcal_source: 'health' as const,
      route_polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
      point_count: 36,
      isPendingUpload: false,
    },
    {
      id: 'demo-walk-3',
      client_id: 'demo-walk-3',
      started_at: new Date(nowMs - 2 * dayMs - 5 * 3600_000).toISOString(),
      ended_at: new Date(nowMs - 2 * dayMs - 4.1 * 3600_000).toISOString(),
      duration_s: 3240,
      moving_time_s: 3090,
      distance_m: 4120,
      avg_speed_mps: 1.33,
      steps: 5390,
      active_kcal: 215,
      kcal_source: 'health' as const,
      route_polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
      point_count: 58,
      isPendingUpload: false,
    },
  ],
};
