import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Share, View } from 'react-native';

import {
  Button,
  Card,
  Input,
  Screen,
  Text,
} from '@/components/ui';
import {
  useDeleteAccountMutation,
  useDeleteAllSightingsMutation,
  useDeleteAllWalksMutation,
  useExportUserDataMutation,
} from '@/features/privacy';

export default function AccountDataSettingsScreen() {
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const deleteAllWalksMutation = useDeleteAllWalksMutation();
  const deleteAllSightingsMutation = useDeleteAllSightingsMutation();
  const exportDataMutation = useExportUserDataMutation();
  const deleteAccountMutation = useDeleteAccountMutation();

  const handleExportData = async () => {
    setActionError(null);
    setActionSuccess(null);
    try {
      const data = await exportDataMutation.mutateAsync();
      const jsonStr = JSON.stringify(data, null, 2);
      setActionSuccess('Data export ready!');
      await Share.share({
        title: 'StrayCat Walk Data Export',
        message: jsonStr,
      }).catch(() => {});
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Could not export account data.'
      );
    }
  };

  const performDeleteWalks = async () => {
    setActionError(null);
    setActionSuccess(null);
    try {
      const count = await deleteAllWalksMutation.mutateAsync();
      setActionSuccess(`Deleted ${count} walks from your history.`);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Could not delete walks.'
      );
    }
  };

  const handleConfirmDeleteWalks = () => {
    if (Platform.OS === 'web') {
      if (
        typeof window !== 'undefined' &&
        window.confirm(
          'Delete all your walks permanently? This action is irreversible.'
        )
      ) {
        performDeleteWalks().catch(() => {});
      }
      return;
    }

    Alert.alert(
      'Delete All Walks?',
      'This will permanently delete all your recorded walks, GPS routes, and distances. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All Walks',
          style: 'destructive',
          onPress: () => {
            performDeleteWalks().catch(() => {});
          },
        },
      ]
    );
  };

  const performDeleteSightings = async () => {
    setActionError(null);
    setActionSuccess(null);
    try {
      const result = await deleteAllSightingsMutation.mutateAsync();
      setActionSuccess(
        `Deleted ${result.deletedSightingsCount} sightings and ${result.deletedCatsCount} cat cards.`
      );
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Could not delete sightings.'
      );
    }
  };

  const handleConfirmDeleteSightings = () => {
    if (Platform.OS === 'web') {
      if (
        typeof window !== 'undefined' &&
        window.confirm(
          'Delete all cat photos and sightings? Your personal collection will be wiped.'
        )
      ) {
        performDeleteSightings().catch(() => {});
      }
      return;
    }

    Alert.alert(
      'Delete All Sightings & Photos?',
      'This permanently deletes all your cat photos, sightings, and cat cards from your collection. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All Sightings',
          style: 'destructive',
          onPress: () => {
            performDeleteSightings().catch(() => {});
          },
        },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim().toLowerCase() !== 'delete') {
      setActionError('Type DELETE to confirm account deletion.');
      return;
    }

    setActionError(null);
    try {
      await deleteAccountMutation.mutateAsync();
      router.replace('/(auth)/sign-in');
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Could not delete account.'
      );
    }
  };

  return (
    <Screen scroll contentContainerClassName="gap-6 pb-12 pt-2">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text variant="label">Data & Privacy</Text>
          <Text variant="title" className="mt-0.5">
            Account & Data Controls
          </Text>
          <Text variant="caption" className="mt-1 leading-5">
            Download a full copy of your data or permanently delete items from your account.
          </Text>
        </View>
        <Button
          label="Back"
          size="sm"
          variant="ghost"
          onPress={() => router.back()}
        />
      </View>

      {actionSuccess ? (
        <Card className="border-secondary/60 bg-secondary/10 py-2.5">
          <Text variant="caption" className="font-semibold text-secondary-dark dark:text-secondary">
            ✓ {actionSuccess}
          </Text>
        </Card>
      ) : null}

      {actionError ? (
        <Card className="border-danger bg-danger-muted py-2.5">
          <Text variant="caption" className="font-semibold text-danger">
            {actionError}
          </Text>
        </Card>
      ) : null}

      {/* Export Data */}
      <Card className="gap-3">
        <Text variant="heading">📦 Export My Data</Text>
        <Text variant="caption" className="leading-5">
          Request a complete JSON archive of your profile, walks, routes, sightings metadata, cat
          collection, and gamification points.
        </Text>
        <Button
          label="Export All Account Data"
          variant="secondary"
          loading={exportDataMutation.isPending}
          onPress={handleExportData}
        />
      </Card>

      {/* Granular Data Deletion */}
      <Card className="gap-4">
        <Text variant="heading">🗑️ Granular Data Deletion</Text>
        <Text variant="caption" className="leading-5">
          You can delete individual walks or sightings anytime from their detail screens. To wipe
          entire categories at once, use the controls below.
        </Text>

        <View className="gap-2.5">
          <Button
            label="Delete All Walks & GPS Routes"
            variant="secondary"
            loading={deleteAllWalksMutation.isPending}
            onPress={handleConfirmDeleteWalks}
          />

          <Button
            label="Delete All Sightings & Photos"
            variant="secondary"
            loading={deleteAllSightingsMutation.isPending}
            onPress={handleConfirmDeleteSightings}
          />
        </View>
      </Card>

      {/* Permanent Account Deletion */}
      <Card className="gap-4 border-danger">
        <Text variant="heading" className="text-danger">
          ⚠️ Delete Account Permanently
        </Text>
        <Text variant="caption" className="leading-5">
          Permanently removes your profile, auth credentials, stored photos, walks, and friend
          connections. This cannot be undone.
        </Text>

        <Input
          label="Type DELETE to confirm"
          placeholder="DELETE"
          value={deleteConfirmText}
          onChangeText={setDeleteConfirmText}
          autoCapitalize="characters"
        />

        <Button
          label="Delete My Account"
          variant="danger"
          disabled={deleteConfirmText.trim().toLowerCase() !== 'delete'}
          loading={deleteAccountMutation.isPending}
          onPress={handleDeleteAccount}
        />
      </Card>
    </Screen>
  );
}
