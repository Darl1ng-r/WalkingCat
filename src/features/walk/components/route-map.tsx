import { AppleMaps, GoogleMaps } from 'expo-maps';
import { Platform, View } from 'react-native';

import { AppIcon, Card, Text } from '@/components/ui';
import { BrandColors } from '@/constants/theme';
import { DEMO_WALK_ROUTE } from '@/lib/demo-data';
import { getRouteBounds } from '../geo';

export interface RouteSightingMarker {
  id: string;
  latitude: number;
  longitude: number;
  label?: string;
}

export interface RouteMapProps {
  coordinates: readonly { latitude: number; longitude: number }[];
  sightingMarkers?: readonly RouteSightingMarker[];
  showUserLocation?: boolean;
  fitToBounds?: boolean;
  height?: number | '100%';
  fill?: boolean;
  mapStyle?: 'satellite' | 'street';
  borderless?: boolean;
  showSightingPins?: boolean;
  showDemoRouteWhenEmpty?: boolean;
}

export function RouteMap({
  coordinates,
  showUserLocation = false,
  fitToBounds = false,
  height = 260,
  fill = false,
  borderless = false,
  showDemoRouteWhenEmpty = true,
}: RouteMapProps) {
  const activeCoords =
    coordinates.length >= 2
      ? coordinates
      : coordinates.length === 1
        ? coordinates
        : showDemoRouteWhenEmpty
          ? DEMO_WALK_ROUTE
          : [];
  const latest = activeCoords[activeCoords.length - 1];
  const bounds = fitToBounds && activeCoords.length >= 2 ? getRouteBounds(activeCoords) : null;
  const cameraPosition = bounds
    ? {
        coordinates: bounds.center,
        zoom: bounds.zoom,
      }
    : latest
      ? {
          coordinates: {
            latitude: latest.latitude,
            longitude: latest.longitude,
          },
          zoom: 16,
        }
      : undefined;

  const polylineCoords = activeCoords.map((pt) => ({
    latitude: pt.latitude,
    longitude: pt.longitude,
  }));

  const wrapperClassName = borderless
    ? 'w-full overflow-hidden'
    : 'w-full overflow-hidden rounded-card border-[1.5px] border-[#191A26] dark:border-[#35384F]';

  const containerStyle = fill ? { flex: 1 as const } : { height };

  if (Platform.OS === 'ios') {
    return (
      <View style={containerStyle} className={wrapperClassName}>
        <AppleMaps.View
          style={{ flex: 1 }}
          cameraPosition={cameraPosition}
          properties={{
            isMyLocationEnabled: showUserLocation,
          }}
          polylines={
            polylineCoords.length >= 2
              ? [
                  {
                    id: 'walk-route',
                    coordinates: polylineCoords,
                    color: BrandColors.primary,
                    width: 6,
                  },
                ]
              : []
          }
        />
      </View>
    );
  }

  if (Platform.OS === 'android') {
    return (
      <View style={containerStyle} className={wrapperClassName}>
        <GoogleMaps.View
          style={{ flex: 1 }}
          cameraPosition={cameraPosition}
          properties={{
            isMyLocationEnabled: showUserLocation,
          }}
          polylines={
            polylineCoords.length >= 2
              ? [
                  {
                    id: 'walk-route',
                    coordinates: polylineCoords,
                    color: BrandColors.primary,
                    width: 6,
                  },
                ]
              : []
          }
        />
      </View>
    );
  }

  return (
    <Card
      style={containerStyle}
      className="items-center justify-center bg-surface-elevated dark:bg-surface-elevated-dark">
      <AppIcon name="pin" size={24} color="#191A26" />
      <Text variant="heading" className="mt-2">
        Route Map
      </Text>
      <Text variant="caption" className="mt-1 text-center">
        {activeCoords.length} GPS points recorded ({Platform.OS} preview)
      </Text>
    </Card>
  );
}
