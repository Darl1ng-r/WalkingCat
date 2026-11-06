import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { BrandColors } from '@/constants/theme';
import { getActiveWalkRecord, insertWalkPoints } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { GeoPoint } from './geo';

export const WALK_LOCATION_TASK_NAME = 'walkingcat-background-location-task';

interface LocationTaskPayload {
  locations?: Location.LocationObject[];
}

// Register task at module top-level so cold starts in background can handle updates
if (Platform.OS !== 'web' && process.env.NODE_ENV !== 'test') {
  try {
    if (!TaskManager.isTaskDefined(WALK_LOCATION_TASK_NAME)) {
      TaskManager.defineTask<LocationTaskPayload>(
        WALK_LOCATION_TASK_NAME,
        async ({ data, error }) => {
          if (error) {
            logger.warn('Background location task error', { error: error.message });
            return;
          }

          const locations = data?.locations;
          if (!locations || locations.length === 0) {
            return;
          }

          const activeWalk = getActiveWalkRecord();
          if (!activeWalk || activeWalk.state !== 'active') {
            return;
          }

          const points: GeoPoint[] = locations.map((loc) => ({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            accuracy: loc.coords.accuracy,
            speed: loc.coords.speed,
            timestamp: loc.timestamp || Date.now(),
          }));

          insertWalkPoints(activeWalk.id, points);
        }
      );
    }
  } catch (err) {
    logger.warn('Could not define background location task', { error: String(err) });
  }
}

let foregroundSubscription: Location.LocationSubscription | null = null;

export async function startWalkLocationTracking(
  onPoint?: (point: GeoPoint) => void
): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  // Always start a foreground watcher so UI updates smoothly and works even in Expo Go
  try {
    foregroundSubscription?.remove();
    foregroundSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 5,
        timeInterval: 3000,
      },
      (loc) => {
        const activeWalk = getActiveWalkRecord();
        if (!activeWalk || activeWalk.state !== 'active') {
          return;
        }
        const pt: GeoPoint = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy,
          speed: loc.coords.speed,
          timestamp: loc.timestamp || Date.now(),
        };
        insertWalkPoints(activeWalk.id, [pt]);
        onPoint?.(pt);
      }
    );
  } catch (err) {
    logger.warn('Foreground watchPositionAsync failed', { error: String(err) });
  }

  // Attempt background location updates (works in Development & Production builds)
  try {
    const bgPerm = await Location.getBackgroundPermissionsAsync();
    if (bgPerm.status === Location.PermissionStatus.GRANTED) {
      const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(
        WALK_LOCATION_TASK_NAME
      );
      if (!alreadyStarted) {
        await Location.startLocationUpdatesAsync(WALK_LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.High,
          distanceInterval: 5,
          deferredUpdatesInterval: 5000,
          activityType: Location.ActivityType.Fitness,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: 'Walk in progress 🐾',
            notificationBody: 'Recording your walking route. Tap to return to StrayCat Walk.',
            notificationColor: BrandColors.primary,
          },
        });
      }
    }
  } catch (err) {
    logger.info('Background location updates unavailable in this runtime; using foreground watcher', {
      error: String(err),
    });
  }
}

export async function stopWalkLocationTracking(): Promise<void> {
  try {
    foregroundSubscription?.remove();
    foregroundSubscription = null;
  } catch {
    // Ignore cleanup errors
  }

  if (Platform.OS === 'web') {
    return;
  }

  try {
    const started = await Location.hasStartedLocationUpdatesAsync(WALK_LOCATION_TASK_NAME);
    if (started) {
      await Location.stopLocationUpdatesAsync(WALK_LOCATION_TASK_NAME);
    }
  } catch {
    // Ignore if task was never started
  }
}
