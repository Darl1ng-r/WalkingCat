import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import {
  Button,
  Card,
  ErrorState,
  Screen,
  Text,
} from '@/components/ui';
import { AppConfig } from '@/constants/config';
import { usePrivacySettings } from '@/features/privacy';
import {
  setLocalAnalyticsOptOutSetting,
  setLocalHideRouteEndsMetersSetting,
  setLocalHideRouteEndsSetting,
} from '@/lib/db';

export default function PrivacySettingsScreen() {
  const { data: settings, isLoading, isError, refetch, updateSetting, isUpdating } =
    usePrivacySettings();
  const [successNote, setSuccessNote] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Screen className="items-center justify-center">
        <Text variant="caption">Loading privacy settings…</Text>
      </Screen>
    );
  }

  if (isError || !settings) {
    return (
      <Screen className="justify-center">
        <ErrorState
          message="Could not load privacy settings."
          onRetry={() => {
            refetch().catch(() => {});
          }}
        />
      </Screen>
    );
  }

  const handleToggle = async (key: keyof typeof settings, nextVal: boolean | number) => {
    setSuccessNote(null);
    try {
      await updateSetting({ [key]: nextVal });
      if (key === 'hide_route_ends') {
        setLocalHideRouteEndsSetting(Boolean(nextVal));
      } else if (key === 'hide_route_ends_m') {
        setLocalHideRouteEndsMetersSetting(nextVal as 100 | 150 | 300);
      } else if (key === 'analytics_opt_out') {
        setLocalAnalyticsOptOutSetting(Boolean(nextVal));
      }
      setSuccessNote('Settings updated');
    } catch {
      // error handled by mutation
    }
  };

  return (
    <Screen scroll contentContainerClassName="gap-5 pb-12 pt-2">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text variant="label">Privacy & Sharing</Text>
          <Text variant="title" className="mt-0.5">
            Privacy Settings
          </Text>
          <Text variant="caption" className="mt-1 leading-5">
            Control what is visible to friends and ensure your routes and sighting locations
            remain private.
          </Text>
        </View>
        <Button
          label="Back"
          size="sm"
          variant="ghost"
          onPress={() => router.back()}
        />
      </View>

      {successNote ? (
        <Card className="border-secondary/60 bg-secondary/10 py-2">
          <Text variant="caption" className="font-semibold text-secondary-dark dark:text-secondary">
            ✓ {successNote}
          </Text>
        </Card>
      ) : null}

      {/* Route Privacy Buffer */}
      <Card className="gap-3">
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1">
            <Text variant="heading">🔒 Hide Route Ends</Text>
            <Text variant="caption" className="mt-0.5 text-xs leading-5">
              Automatically trims start and finish points of your recorded walks to prevent
              identifying your home or workplace neighborhood.
            </Text>
          </View>
          <Button
            label={settings.hide_route_ends ? 'On' : 'Off'}
            size="sm"
            variant={settings.hide_route_ends ? 'secondary' : 'ghost'}
            disabled={isUpdating}
            onPress={() =>
              handleToggle('hide_route_ends', !settings.hide_route_ends)
            }
          />
        </View>

        {settings.hide_route_ends ? (
          <View className="border-t border-border pt-3 dark:border-border-dark">
            <Text variant="caption" className="mb-2 text-xs font-semibold">
              Privacy buffer distance:
            </Text>
            <View className="flex-row gap-2">
              {([100, 150, 300] as const).map((dist) => {
                const active = settings.hide_route_ends_m === dist;
                return (
                  <Pressable
                    key={dist}
                    accessibilityRole="button"
                    accessibilityLabel={`Set trim distance to ${dist} meters`}
                    disabled={isUpdating}
                    onPress={() => handleToggle('hide_route_ends_m', dist)}
                    className={`flex-1 items-center rounded-pill border py-2 ${
                      active
                        ? 'border-primary bg-primary'
                        : 'border-border bg-surface dark:border-border-dark dark:bg-surface-dark'
                    }`}>
                    <Text
                      variant="caption"
                      className={`text-xs font-bold ${
                        active ? 'text-white' : 'text-text-primary dark:text-text-primary-dark'
                      }`}>
                      {dist} m
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
      </Card>

      {/* Social & Leaderboard Privacy */}
      <View className="gap-3">
        <Text variant="label">Community & Friends</Text>

        <Card className="flex-row items-center justify-between gap-3 p-4">
          <View className="flex-1">
            <Text variant="body" className="font-bold">
              Show on Friends Leaderboard
            </Text>
            <Text variant="caption" className="text-xs leading-4">
              Allows accepted friends to see your weekly step and distance totals (calories are
              always excluded).
            </Text>
          </View>
          <Button
            label={settings.show_on_friends_leaderboard ? 'Visible' : 'Hidden'}
            size="sm"
            variant={settings.show_on_friends_leaderboard ? 'secondary' : 'ghost'}
            disabled={isUpdating}
            onPress={() =>
              handleToggle(
                'show_on_friends_leaderboard',
                !settings.show_on_friends_leaderboard
              )
            }
          />
        </Card>

        <Card className="flex-row items-center justify-between gap-3 p-4">
          <View className="flex-1">
            <Text variant="body" className="font-bold">
              Share Milestones in Activity Feed
            </Text>
            <Text variant="caption" className="text-xs leading-4">
              Shares completed walks and unlocked badges with accepted friends. Maps and routes are
              never included.
            </Text>
          </View>
          <Button
            label={settings.share_milestones_with_friends ? 'On' : 'Off'}
            size="sm"
            variant={settings.share_milestones_with_friends ? 'secondary' : 'ghost'}
            disabled={isUpdating}
            onPress={() =>
              handleToggle(
                'share_milestones_with_friends',
                !settings.share_milestones_with_friends
              )
            }
          />
        </Card>

        <Card className="flex-row items-center justify-between gap-3 p-4">
          <View className="flex-1">
            <Text variant="body" className="font-bold">
              Discoverable by Username
            </Text>
            <Text variant="caption" className="text-xs leading-4">
              Allows other walkers to find you by typing your exact username in Friend search.
            </Text>
          </View>
          <Button
            label={settings.discoverable_by_username ? 'On' : 'Off'}
            size="sm"
            variant={settings.discoverable_by_username ? 'secondary' : 'ghost'}
            disabled={isUpdating}
            onPress={() =>
              handleToggle(
                'discoverable_by_username',
                !settings.discoverable_by_username
              )
            }
          />
        </Card>
      </View>

      {/* Sighting Location Privacy */}
      <View className="gap-3">
        <Text variant="label">Cat Sighting Privacy</Text>

        <Card className="flex-row items-center justify-between gap-3 p-4">
          <View className="flex-1">
            <Text variant="body" className="font-bold">
              Save General Area (~5 km cell)
            </Text>
            <Text variant="caption" className="text-xs leading-4">
              Stores only a coarse 5-character neighborhood code on new sightings. Exact coordinates
              are never saved.
            </Text>
          </View>
          <Button
            label={settings.save_sighting_area ? 'On' : 'Off'}
            size="sm"
            variant={settings.save_sighting_area ? 'secondary' : 'ghost'}
            disabled={isUpdating}
            onPress={() =>
              handleToggle('save_sighting_area', !settings.save_sighting_area)
            }
          />
        </Card>
      </View>

      {/* Analytics & Telemetry Privacy */}
      <View className="gap-3">
        <Text variant="label">Product Improvement & Analytics</Text>

        <Card className="flex-row items-center justify-between gap-3 p-4">
          <View className="flex-1">
            <Text variant="body" className="font-bold">
              Anonymous Telemetry
            </Text>
            <Text variant="caption" className="text-xs leading-4">
              Sends privacy-respecting feature usage metrics to help us fix bugs. Never collects
              GPS routes, coordinates, photos, or personal health numbers.
            </Text>
          </View>
          <Button
            label={settings.analytics_opt_out ? 'Disabled' : 'Enabled'}
            size="sm"
            variant={settings.analytics_opt_out ? 'ghost' : 'secondary'}
            disabled={isUpdating}
            onPress={() =>
              handleToggle('analytics_opt_out', !settings.analytics_opt_out)
            }
          />
        </Card>
      </View>

      {/* Legal & Transparency */}
      <View className="gap-3">
        <Text variant="label">Legal & Data Transparency</Text>

        <Card className="gap-3 p-4">
          <Text variant="body" className="font-bold">
            📜 Privacy Policy & Terms
          </Text>
          <Text variant="caption" className="text-xs leading-5">
            Learn more about how your health, location, and photos are handled. We never sell your
            data or use it for personalized advertising.
          </Text>
          <Button
            label="View Privacy Policy Online"
            size="sm"
            variant="ghost"
            onPress={() => Linking.openURL(AppConfig.legal.privacyPolicyUrl).catch(() => {})}
          />
        </Card>
      </View>
    </Screen>
  );
}
