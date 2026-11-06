import { useQuery } from '@tanstack/react-query';
import { useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Screen, Text } from '@/components/ui';
import { useTodayHealthSummary } from '@/features/health';
import {
  checkCurrentLocationPermission,
  openDeviceLocationSettings,
  requestWalkLocationPermissions,
} from '@/features/walk';

export default function PermissionsSettingsScreen() {
  const { data: healthData, requestConnect, openHealthSettings } = useTodayHealthSummary();
  const [camPermission, requestCamPermission] = useCameraPermissions();
  const { data: locData, refetch: refetchLocStatus } = useQuery({
    queryKey: ['location', 'permission'],
    queryFn: checkCurrentLocationPermission,
  });
  const locStatus = {
    foregroundGranted: locData?.foregroundGranted ?? false,
    backgroundGranted: locData?.backgroundGranted ?? false,
  };
  const [requestingLoc, setRequestingLoc] = useState(false);
  const [requestingHealth, setRequestingHealth] = useState(false);
  const [requestingCam, setRequestingCam] = useState(false);

  const handleRequestLocation = async () => {
    setRequestingLoc(true);
    try {
      await requestWalkLocationPermissions();
      await refetchLocStatus();
    } finally {
      setRequestingLoc(false);
    }
  };

  const handleRequestCamera = async () => {
    setRequestingCam(true);
    try {
      await requestCamPermission();
    } finally {
      setRequestingCam(false);
    }
  };

  const handleRequestHealth = async () => {
    setRequestingHealth(true);
    try {
      await requestConnect();
    } finally {
      setRequestingHealth(false);
    }
  };

  const healthPerm = healthData?.permissionState ?? 'not_connected';
  const providerName = healthData?.providerDisplayName ?? 'Health App';

  return (
    <Screen scroll contentContainerClassName="gap-6 py-6">
      <View>
        <Text variant="title">Permissions</Text>
        <Text variant="caption" className="mt-1">
          We only request permissions needed for the features you choose to use.
        </Text>
      </View>

      <Card className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text variant="heading">📍 Location (GPS)</Text>
          <Text variant="label" className={locStatus.foregroundGranted ? 'text-secondary' : ''}>
            {locStatus.foregroundGranted
              ? locStatus.backgroundGranted
                ? 'Connected (Background)'
                : 'While Using App'
              : 'Not Granted'}
          </Text>
        </View>
        <Text variant="caption" className="leading-5">
          Used only while a walk is active to record your distance and private route.
        </Text>
        <View className="flex-row gap-3">
          {!locStatus.foregroundGranted ? (
            <Button
              label="Allow Location"
              size="sm"
              loading={requestingLoc}
              onPress={handleRequestLocation}
            />
          ) : null}
          <Button
            label="Open Device Settings"
            size="sm"
            variant="ghost"
            onPress={openDeviceLocationSettings}
          />
        </View>
      </Card>

      <Card className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text variant="heading">❤️ {providerName}</Text>
          <Text variant="label" className={healthPerm === 'connected' ? 'text-secondary' : ''}>
            {healthPerm === 'connected'
              ? 'Connected'
              : healthPerm === 'unavailable'
                ? 'Unavailable'
                : 'Not Connected'}
          </Text>
        </View>
        <Text variant="caption" className="leading-5">
          Reads aggregated daily steps and active calories burned during walks. We never write to{' '}
          {providerName} or share health metrics.
        </Text>
        <View className="flex-row flex-wrap gap-3">
          {healthPerm !== 'connected' && healthPerm !== 'unavailable' ? (
            <Button
              label={`Connect ${providerName}`}
              size="sm"
              loading={requestingHealth}
              onPress={handleRequestHealth}
            />
          ) : null}
          <Button
            label={`Manage in ${providerName}`}
            size="sm"
            variant="ghost"
            onPress={openHealthSettings}
          />
        </View>
      </Card>

      <Card className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text variant="heading">📷 Camera (No Flash)</Text>
          <Text variant="label" className={camPermission?.granted ? 'text-secondary' : ''}>
            {camPermission?.granted ? 'Granted' : 'Not Granted'}
          </Text>
        </View>
        <Text variant="caption" className="leading-5">
          Used only when you open the cat camera to photograph a cat you spot. Flash and microphone
          are permanently disabled.
        </Text>
        <View className="flex-row gap-3">
          {!camPermission?.granted ? (
            <Button
              label="Allow Camera"
              size="sm"
              loading={requestingCam}
              onPress={() => {
                handleRequestCamera().catch(() => {});
              }}
            />
          ) : null}
          <Button
            label="Open Device Settings"
            size="sm"
            variant="ghost"
            onPress={openDeviceLocationSettings}
          />
        </View>
      </Card>

      <Button label="Done" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}
