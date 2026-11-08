import { AppleMaps, GoogleMaps } from 'expo-maps';
import { Platform, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { BrandColors } from '@/constants/theme';
import { DEMO_WALK_ROUTE } from '@/lib/demo-data';
import { getRouteBounds } from '../geo';

export interface RouteMapProps {
  coordinates: readonly { latitude: number; longitude: number }[];
  showUserLocation?: boolean;
  fitToBounds?: boolean;
  height?: number;
  mapStyle?: 'satellite' | 'street';
  borderless?: boolean;
  showSightingPins?: boolean;
}

export function RouteMap({
  coordinates,
  showUserLocation = false,
  fitToBounds = false,
  height = 260,
  borderless = false,
}: RouteMapProps) {
  const activeCoords = coordinates.length >= 2 ? coordinates : DEMO_WALK_ROUTE;
  const latest = activeCoords[activeCoords.length - 1];
  const bounds = fitToBounds ? getRouteBounds(activeCoords) : null;
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
    : 'w-full overflow-hidden rounded-bento border border-border dark:border-border-dark';

  if (Platform.OS === 'ios') {
    return (
      <View style={{ height }} className={wrapperClassName}>
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
                    color: BrandColors.secondary,
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
      <View style={{ height }} className={wrapperClassName}>
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
                    color: BrandColors.secondary,
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
      style={{ height }}
      className="items-center justify-center bg-surface-elevated dark:bg-surface-elevated-dark">
      <Text variant="heading">🗺️ Route Map</Text>
      <Text variant="caption" className="mt-1 text-center">
        {activeCoords.length} GPS points recorded ({Platform.OS} preview)
      </Text>
    </Card>
  );
}
