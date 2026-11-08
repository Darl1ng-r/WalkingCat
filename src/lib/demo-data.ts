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
  skinHex: string
): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${bgStart}" />
        <stop offset="100%" stop-color="${bgEnd}" />
      </linearGradient>
    </defs>
    <circle cx="80" cy="80" r="80" fill="url(#bg)" />
    <!-- Hair back -->
    <circle cx="80" cy="68" r="36" fill="${hairHex}" />
    <!-- Shoulders / Shirt -->
    <path d="M 28 160 C 28 118 132 118 132 160 Z" fill="${shirtHex}" />
    <!-- Neck -->
    <rect x="69" y="88" width="22" height="24" rx="10" fill="${skinHex}" />
    <!-- Face -->
    <circle cx="80" cy="72" r="27" fill="${skinHex}" />
    <!-- Hair bangs -->
    <path d="M 52 66 Q 66 42 92 48 Q 106 52 108 68 Q 92 54 74 58 Q 58 60 52 66 Z" fill="${hairHex}" />
    <!-- Eyes & Smile -->
    <circle cx="70" cy="72" r="3" fill="#1E2029" />
    <circle cx="90" cy="72" r="3" fill="#1E2029" />
    <circle cx="63" cy="79" r="4" fill="#F43F5E" fill-opacity="0.28" />
    <circle cx="97" cy="79" r="4" fill="#F43F5E" fill-opacity="0.28" />
    <path d="M 73 83 Q 80 89 87 83" stroke="#1E2029" stroke-width="2.6" stroke-linecap="round" fill="none" />
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const DEMO_AVATARS = {
  mina: makeWalkerAvatarDataUri('#EDE9FE', '#C4B5FD', '#312E81', '#7C66DC', '#F5CBA7'),
  layla: makeWalkerAvatarDataUri('#FCE7F3', '#FBCFE8', '#4C1D95', '#EC4899', '#FDEBD0'),
  tariq: makeWalkerAvatarDataUri('#DCFCE7', '#A7F3D0', '#1E293B', '#10B981', '#E59866'),
  omar: makeWalkerAvatarDataUri('#FEF3C7', '#FDE68A', '#292524', '#F59E0B', '#D35400'),
  nadia: makeWalkerAvatarDataUri('#E0F2FE', '#BAE6FD', '#3B0764', '#0284C7', '#F5CBA7'),
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
