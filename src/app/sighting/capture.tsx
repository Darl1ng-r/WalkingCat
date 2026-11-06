import { useQueryClient } from '@tanstack/react-query';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, Card, Screen, Text } from '@/components/ui';
import {
  checkCaptureCooldown,
  getSightingStatusCopy,
  processCapturedPhoto,
  SIGHTINGS_QUERY_KEYS,
  submitSightingPhoto,
  toGeohash,
  useCameraWelfareAck,
  useSaveSightingAreaSetting,
  useSightingValidationStatus,
  WelfareSheet,
  type RawCapturedPhoto,
} from '@/features/sightings';

const ZOOM_PRESETS = [
  { label: '1×', value: 0 },
  { label: '1.5×', value: 0.15 },
  { label: '2×', value: 0.3 },
  { label: '3×', value: 0.5 },
] as const;

let lastCaptureTimestampMs: number | null = null;

export default function SightingCaptureScreen() {
  const params = useLocalSearchParams<{ walkId?: string | string[] }>();
  const walkId = Array.isArray(params.walkId)
    ? params.walkId[0] ?? null
    : params.walkId ?? null;

  const isFocused = useIsFocused();
  const queryClient = useQueryClient();
  const cameraRef = useRef<CameraView | null>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const { acknowledged, acknowledgeWelfare } = useCameraWelfareAck();
  const { saveArea, setSaveArea } = useSaveSightingAreaSetting();

  const [showWelfareModal, setShowWelfareModal] = useState(false);
  const [zoom, setZoom] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<RawCapturedPhoto | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedSighting, setSubmittedSighting] = useState<{
    id: string;
    state: 'uploaded' | 'queued';
  } | null>(null);

  const { data: liveSighting } = useSightingValidationStatus(
    submittedSighting?.id
  );

  // 1. First-time welfare acknowledgement sheet (or user-opened reminder)
  if (!acknowledged || showWelfareModal) {
    return (
      <Screen scroll contentContainerClassName="justify-center py-6">
        <WelfareSheet
          onAcknowledge={() => {
            acknowledgeWelfare();
            setShowWelfareModal(false);
          }}
          onCancel={() => {
            if (showWelfareModal) {
              setShowWelfareModal(false);
            } else {
              router.back();
            }
          }}
        />
      </Screen>
    );
  }

  // 2. Post-submission confirmation screen (live-updated via Realtime + 5s poll)
  if (submittedSighting) {
    const status = liveSighting?.status ?? 'pending';
    const isUploading =
      liveSighting?.isUploading ?? submittedSighting.state === 'queued';
    const copy = getSightingStatusCopy(
      status,
      liveSighting?.reject_reason,
      isUploading
    );

    return (
      <Screen className="justify-center">
        <Card className="items-center gap-4 p-6">
          <View className="h-20 w-20 items-center justify-center rounded-pill bg-primary-muted dark:bg-surface-elevated-dark">
            <Text className="text-4xl">
              {status === 'accepted'
                ? '🎉'
                : status === 'rejected'
                  ? '🔎'
                  : '🐱'}
            </Text>
          </View>
          <View className="rounded-pill bg-primary/15 px-3 py-1">
            <Text variant="label">{copy.badgeLabel}</Text>
          </View>
          <Text variant="title" className="text-center">
            {status === 'accepted'
              ? 'Cat Spotted!'
              : status === 'rejected'
                ? 'Sighting Update'
                : status === 'flagged'
                  ? 'Under Review'
                  : 'Submitted — checking your photo'}
          </Text>
          <Text variant="caption" className="text-center leading-5">
            {copy.friendlyMessage}
          </Text>
          <View className="w-full gap-2.5 pt-2">
            <Button
              label="Done"
              size="lg"
              onPress={() => router.back()}
            />
            <Button
              label="Spot Another Cat"
              variant="ghost"
              onPress={() => {
                setCapturedPhoto(null);
                setSubmittedSighting(null);
                setErrorMessage(null);
              }}
            />
          </View>
        </Card>
      </Screen>
    );
  }

  // 3. Review captured photo screen
  if (capturedPhoto) {
    const handleRetake = () => {
      setCapturedPhoto(null);
      setErrorMessage(null);
    };

    const handleSubmit = async () => {
      setSubmitting(true);
      setErrorMessage(null);

      try {
        const processed = await processCapturedPhoto(capturedPhoto);

        let areaGeohash: string | null = null;
        if (saveArea) {
          try {
            const fg = await Location.getForegroundPermissionsAsync();
            const granted = fg.granted
              ? true
              : (await Location.requestForegroundPermissionsAsync()).granted;
            if (granted) {
              const pos = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
              });
              areaGeohash = toGeohash(
                pos.coords.latitude,
                pos.coords.longitude,
                5
              );
            }
          } catch {
            // Optional coarse geohash; proceed without blocking submission if GPS unavailable
            areaGeohash = null;
          }
        }

        const outcome = await submitSightingPhoto({
          processed,
          walkId,
          areaGeohash,
        });

        await queryClient.invalidateQueries({
          queryKey: SIGHTINGS_QUERY_KEYS.all,
        });

        if (outcome.status === 'duplicate') {
          setErrorMessage(outcome.message);
          return;
        }

        setSubmittedSighting({
          id: outcome.sightingId,
          state: outcome.status,
        });
      } catch (err) {
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Could not process this photo. Please try retaking it.'
        );
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <Screen scroll contentContainerClassName="gap-4 pb-10 pt-2">
        <View className="flex-row items-center justify-between">
          <View>
            <Text variant="label">Review Photo</Text>
            <Text variant="title" className="mt-0.5">
              Cat Sighting
            </Text>
          </View>
          <Button
            label="Cancel"
            size="sm"
            variant="ghost"
            disabled={submitting}
            onPress={() => router.back()}
          />
        </View>

        <View className="overflow-hidden rounded-card border border-border bg-black dark:border-border-dark">
          <Image
            source={{ uri: capturedPhoto.uri }}
            style={{ width: '100%', height: 340 }}
            contentFit="contain"
            accessibilityLabel="Captured cat photo preview"
          />
        </View>

        <Card className="gap-2 py-3">
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1">
              <Text variant="label">📍 Save general area (~5 km cell)</Text>
              <Text variant="caption" className="mt-0.5 text-xs leading-5">
                {saveArea
                  ? 'Stores only a coarse 5-character neighborhood code. Exact coordinates are never saved.'
                  : 'Off — no location data of any kind will be attached to this sighting.'}
              </Text>
            </View>
            <Button
              label={saveArea ? 'On' : 'Off'}
              size="sm"
              variant={saveArea ? 'secondary' : 'ghost'}
              disabled={submitting}
              onPress={() => setSaveArea(!saveArea)}
            />
          </View>
        </Card>

        {errorMessage ? (
          <Card className="border-danger bg-danger-muted py-3">
            <Text variant="caption" className="font-semibold text-danger">
              {errorMessage}
            </Text>
          </Card>
        ) : null}

        <View className="flex-row gap-3 pt-1">
          <Button
            label="Retake"
            variant="secondary"
            className="flex-1"
            disabled={submitting}
            onPress={handleRetake}
          />
          <Button
            label="Submit Sighting"
            className="flex-1"
            loading={submitting}
            onPress={() => {
              handleSubmit().catch(() => {});
            }}
          />
        </View>
      </Screen>
    );
  }

  // 4. Camera Permission States
  if (!permission) {
    return (
      <Screen className="items-center justify-center">
        <Text variant="caption">Checking camera access…</Text>
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen className="justify-center">
        <Card className="items-center gap-4 p-6">
          <View className="h-16 w-16 items-center justify-center rounded-pill bg-primary-muted dark:bg-surface-elevated-dark">
            <Text className="text-3xl">📷</Text>
          </View>
          <Text variant="heading" className="text-center">
            Camera access needed
          </Text>
          <Text variant="caption" className="text-center leading-5">
            StrayCat Walk uses the in-app camera (with flash permanently off) to photograph cats you
            spot on your walks. Photos stay private unless you choose to share.
          </Text>

          {permission.canAskAgain ? (
            <Button
              label="Allow Camera"
              size="lg"
              className="w-full"
              onPress={() => {
                requestPermission().catch(() => {});
              }}
            />
          ) : (
            <Button
              label="Open Device Settings"
              size="lg"
              variant="secondary"
              className="w-full"
              onPress={() => {
                Linking.openSettings().catch(() => {});
              }}
            />
          )}

          <Button
            label="Close"
            variant="ghost"
            onPress={() => router.back()}
          />
        </Card>
      </Screen>
    );
  }

  // 5. Live Camera View (Flash strictly OFF, Zoom controls encouraged)
  const handleShutterPress = async () => {
    setErrorMessage(null);
    const cooldown = checkCaptureCooldown(lastCaptureTimestampMs);
    if (!cooldown.allowed) {
      setErrorMessage(
        `Please wait ${cooldown.remainingSeconds}s before taking another photo.`
      );
      return;
    }

    if (!cameraRef.current || !cameraReady || capturing) {
      return;
    }

    setCapturing(true);
    try {
      const pic = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        exif: false,
      });
      if (pic?.uri) {
        lastCaptureTimestampMs = Date.now();
        setCapturedPhoto({
          uri: pic.uri,
          width: pic.width,
          height: pic.height,
        });
      }
    } catch {
      setErrorMessage('Could not capture photo. Please try again.');
    } finally {
      setCapturing(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']} contentContainerClassName="justify-between gap-3 py-2">
      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <View>
            <Text variant="label">Cat Camera · ⚡ Flash Off</Text>
            <Text variant="heading">Spot a Cat</Text>
          </View>
          <View className="flex-row gap-2">
            <Button
              label="Tips"
              size="sm"
              variant="ghost"
              onPress={() => setShowWelfareModal(true)}
            />
            <Button
              label="Close"
              size="sm"
              variant="ghost"
              onPress={() => router.back()}
            />
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View cat welfare photography tips"
          onPress={() => setShowWelfareModal(true)}
          className="rounded-pill bg-primary-muted px-3 py-1.5 dark:bg-surface-elevated-dark">
          <Text
            variant="caption"
            className="text-center text-xs font-medium text-primary-dark dark:text-primary-light">
            🐾 Keep your distance · Flash off · Never touch, chase, or feed
          </Text>
        </Pressable>
      </View>

      <View className="flex-1 overflow-hidden rounded-card border border-border bg-black dark:border-border-dark">
        <CameraView
          ref={cameraRef}
          style={{ flex: 1 }}
          facing="back"
          flash="off"
          enableTorch={false}
          mode="picture"
          zoom={zoom}
          active={isFocused && !capturedPhoto}
          onCameraReady={() => setCameraReady(true)}
        />
      </View>

      {errorMessage ? (
        <Card className="border-danger bg-danger-muted py-2.5">
          <Text variant="caption" className="text-center font-semibold text-danger">
            {errorMessage}
          </Text>
        </Card>
      ) : null}

      <Card className="gap-3 py-3">
        <View className="flex-row items-center justify-between">
          <Text variant="caption" className="text-xs font-semibold">
            Use zoom, not your feet 🐾
          </Text>
          <Text variant="caption" className="text-xs">
            Zoom {Math.round(10 + zoom * 40) / 10}×
          </Text>
        </View>

        <View className="flex-row items-center justify-between gap-2">
          <Button
            label="−"
            size="sm"
            variant="ghost"
            accessibilityLabel="Decrease camera zoom"
            onPress={() =>
              setZoom((prev) => Math.max(0, Math.round((prev - 0.1) * 100) / 100))
            }
          />

          <View className="flex-1 flex-row justify-center gap-2">
            {ZOOM_PRESETS.map((preset) => {
              const isSelected = Math.abs(zoom - preset.value) < 0.05;
              return (
                <Pressable
                  key={preset.label}
                  accessibilityRole="button"
                  accessibilityLabel={`Zoom ${preset.label}`}
                  onPress={() => setZoom(preset.value)}
                  className={`rounded-pill px-3 py-1.5 ${
                    isSelected
                      ? 'bg-primary'
                      : 'bg-background dark:bg-background-dark'
                  }`}>
                  <Text
                    variant="caption"
                    className={`text-xs font-semibold ${
                      isSelected
                        ? 'text-white'
                        : 'text-text-primary dark:text-text-primary-dark'
                    }`}>
                    {preset.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Button
            label="+"
            size="sm"
            variant="ghost"
            accessibilityLabel="Increase camera zoom"
            onPress={() =>
              setZoom((prev) => Math.min(1, Math.round((prev + 0.1) * 100) / 100))
            }
          />
        </View>

        <Button
          label={capturing ? 'Capturing…' : '📷 Take Photo (No Flash)'}
          size="lg"
          loading={capturing}
          disabled={!cameraReady || capturing}
          onPress={() => {
            handleShutterPress().catch(() => {});
          }}
        />
      </Card>
    </Screen>
  );
}
