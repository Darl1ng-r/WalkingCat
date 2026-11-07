import { Image } from 'expo-image';
import { View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { BrandColors } from '@/constants/theme';

export interface RouteMapProps {
  coordinates: readonly { latitude: number; longitude: number }[];
  showUserLocation?: boolean;
  fitToBounds?: boolean;
  height?: number;
}

function buildRouteSvgDataUri(
  coordinates: readonly { latitude: number; longitude: number }[]
): string {
  const width = 640;
  const height = 320;
  const pad = 36;

  let pathPoints = '80,220 190,150 320,175 430,105 555,130';
  let startPt = { x: 80, y: 220 };
  let endPt = { x: 555, y: 130 };

  if (coordinates.length >= 2) {
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    for (const pt of coordinates) {
      if (pt.latitude < minLat) minLat = pt.latitude;
      if (pt.latitude > maxLat) maxLat = pt.latitude;
      if (pt.longitude < minLng) minLng = pt.longitude;
      if (pt.longitude > maxLng) maxLng = pt.longitude;
    }

    const latSpan = Math.max(0.0005, maxLat - minLat);
    const lngSpan = Math.max(0.0005, maxLng - minLng);

    const mapped = coordinates.map((pt) => {
      const x =
        pad + ((pt.longitude - minLng) / lngSpan) * (width - pad * 2);
      const y =
        height -
        pad -
        ((pt.latitude - minLat) / latSpan) * (height - pad * 2);
      return { x: Math.round(x), y: Math.round(y) };
    });

    pathPoints = mapped.map((p) => `${p.x},${p.y}`).join(' ');
    startPt = mapped[0];
    endPt = mapped[mapped.length - 1];
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="#FAF6F0" />
    <!-- Subtle neighborhood street grid -->
    <g stroke="#E7DFD3" stroke-width="2">
      <line x1="0" y1="80" x2="${width}" y2="80" />
      <line x1="0" y1="160" x2="${width}" y2="160" />
      <line x1="0" y1="240" x2="${width}" y2="240" />
      <line x1="140" y1="0" x2="140" y2="${height}" />
      <line x1="320" y1="0" x2="320" y2="${height}" />
      <line x1="500" y1="0" x2="500" y2="${height}" />
    </g>
    <!-- Park greenery blocks -->
    <rect x="160" y="20" width="140" height="50" rx="12" fill="#D1FAE5" fill-opacity="0.7" />
    <rect x="340" y="175" width="145" height="55" rx="12" fill="#D1FAE5" fill-opacity="0.7" />
    <!-- Route polyline -->
    <polyline points="${pathPoints}" fill="none" stroke="${BrandColors.primary}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />
    <!-- Start & End markers -->
    <circle cx="${startPt.x}" cy="${startPt.y}" r="8" fill="#10B981" stroke="#FFFFFF" stroke-width="3" />
    <circle cx="${endPt.x}" cy="${endPt.y}" r="9" fill="${BrandColors.primary}" stroke="#FFFFFF" stroke-width="3" />
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function RouteMap({
  coordinates,
  height = 240,
}: RouteMapProps) {
  const uri = buildRouteSvgDataUri(coordinates);

  return (
    <Card
      style={{ height }}
      className="relative overflow-hidden p-0">
      <Image
        source={{ uri }}
        style={{ width: '100%', height: '100%' }}
        contentFit="cover"
        accessibilityLabel="Walk route map preview"
      />
      <View className="absolute bottom-2.5 right-2.5 rounded-pill bg-black/65 px-3 py-1">
        <Text variant="caption" className="text-[11px] font-semibold text-white">
          🗺️ {coordinates.length > 0 ? `${coordinates.length} GPS pts` : 'Ready to track route'}
        </Text>
      </View>
    </Card>
  );
}
