import { isSupabaseConfigured } from './env';

/**
 * Interactive Demo Mode is active when running the app (`NODE_ENV !== 'test'`)
 * without a live `.env.local` Supabase configuration.
 */
export const isDemoMode =
  !isSupabaseConfigured && process.env.NODE_ENV !== 'test';

function makeCatSvgDataUri(
  bgHex: string,
  catHex: string,
  collarHex: string,
  label: string
): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450" viewBox="0 0 600 450">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${bgHex}" />
        <stop offset="100%" stop-color="#1C1917" stop-opacity="0.35" />
      </linearGradient>
    </defs>
    <rect width="600" height="450" fill="${bgHex}" />
    <circle cx="490" cy="90" r="55" fill="#FFFFFF" fill-opacity="0.18" />
    <ellipse cx="300" cy="410" rx="220" ry="45" fill="#000000" fill-opacity="0.14" />
    <!-- Cat body -->
    <ellipse cx="300" cy="320" rx="95" ry="75" fill="${catHex}" />
    <!-- Tail -->
    <path d="M 380 340 Q 455 310 445 245" stroke="${catHex}" stroke-width="24" stroke-linecap="round" fill="none" />
    <!-- Ears -->
    <polygon points="220,185 200,105 268,150" fill="${catHex}" />
    <polygon points="380,185 400,105 332,150" fill="${catHex}" />
    <polygon points="225,175 212,122 258,152" fill="#F9A8D4" fill-opacity="0.7" />
    <polygon points="375,175 388,122 342,152" fill="#F9A8D4" fill-opacity="0.7" />
    <!-- Head -->
    <circle cx="300" cy="205" r="76" fill="${catHex}" />
    <!-- Eyes -->
    <circle cx="272" cy="195" r="10" fill="#1C1917" />
    <circle cx="328" cy="195" r="10" fill="#1C1917" />
    <circle cx="275" cy="192" r="3.5" fill="#FFFFFF" />
    <circle cx="331" cy="192" r="3.5" fill="#FFFFFF" />
    <!-- Nose & Whiskers -->
    <polygon points="293,212 307,212 300,221" fill="#F472B6" />
    <line x1="210" y1="210" x2="260" y2="216" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-opacity="0.8" />
    <line x1="210" y1="226" x2="260" y2="224" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-opacity="0.8" />
    <line x1="390" y1="210" x2="340" y2="216" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-opacity="0.8" />
    <line x1="390" y1="226" x2="340" y2="224" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-opacity="0.8" />
    <!-- Collar -->
    <rect x="242" y="264" width="116" height="14" rx="7" fill="${collarHex}" />
    <circle cx="300" cy="282" r="9" fill="#FBBF24" />
    <text x="300" y="428" text-anchor="middle" font-family="sans-serif" font-size="18" font-weight="bold" fill="#FFFFFF" fill-opacity="0.9">${label}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

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
      cover_photo_path: 'demo/marmalade.svg',
      coverUrl: makeCatSvgDataUri(
        '#FEF3C7',
        '#EA580C',
        '#059669',
        'Sunny garden wall · Respectful distance'
      ),
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
      cover_photo_path: 'demo/whiskers.svg',
      coverUrl: makeCatSvgDataUri(
        '#E0E7FF',
        '#475569',
        '#4F46E5',
        'Library courtyard · Evening stroll'
      ),
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
      cover_photo_path: 'demo/mochi.svg',
      coverUrl: makeCatSvgDataUri(
        '#FCE7F3',
        '#F59E0B',
        '#EC4899',
        'Blossom lane · Morning walk'
      ),
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
      cover_photo_path: 'demo/boots.svg',
      coverUrl: makeCatSvgDataUri(
        '#D1FAE5',
        '#292524',
        '#10B981',
        'Olive tree park · Afternoon breeze'
      ),
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
