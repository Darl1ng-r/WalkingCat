import { AppleMaps, GoogleMaps } from 'expo-maps';
import { Platform, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { BrandColors } from '@/constants/theme';
import { getRouteBounds } from '../geo';

export interface RouteMapProps {
  coordinates: readonly { latitude: number; longitude: number }[];
  showUserLocation?: boolean;
  fitToBounds?: boolean;
  height?: number;
}

export function RouteMap({
  coordinates,
  showUserLocation = false,
  fitToBounds = false,
  height = 240,
}: RouteMapProps) {
  const latest = coordinates[coordinates.length - 1];
  const bounds = fitToBounds ? getRouteBounds(coordinates) : null;
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

  const polylineCoords = coordinates.map((pt) => ({
    latitude: pt.latitude,
    longitude: pt.longitude,
  }));

  if (Platform.OS === 'ios') {
    return (
      <View
        style={{ height }}
        className="w-full overflow-hidden rounded-card border border-border dark:border-border-dark">
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
                    width: 5,
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
      <View
        style={{ height }}
        className="w-full overflow-hidden rounded-card border border-border dark:border-border-dark">
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
      style={{ height }}
      className="items-center justify-center bg-surface-elevated dark:bg-surface-elevated-dark">
      <Text variant="heading">🗺️ Route Map</Text>
      <Text variant="caption" className="mt-1 text-center">
        {coordinates.length} GPS points recorded ({Platform.OS} preview)
      </Text>
    </Card>
  );
}
