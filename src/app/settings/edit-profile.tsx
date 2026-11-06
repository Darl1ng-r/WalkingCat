import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { Button, Card, Input, Screen, Text } from '@/components/ui';
import {
  mapAuthError,
  profileFormSchema,
  updateMyProfile,
  useSession,
  useUsernameAvailability,
} from '@/features/auth';

export default function EditProfileScreen() {
  const { user, profile, refreshProfile } = useSession();

  const [username, setUsername] = useState(profile?.username ?? '');
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [weightKg, setWeightKg] = useState(
    profile?.weight_kg ? String(profile.weight_kg) : ''
  );
  const [fieldErrors, setFieldErrors] = useState<{
    username?: string;
    displayName?: string;
    weightKg?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const availability = useUsernameAvailability(username, profile?.username);

  const getUsernameError = (): string | undefined => {
    if (fieldErrors.username) return fieldErrors.username;
    if (availability === 'taken') return 'That username is already taken.';
    return undefined;
  };

  const handleSave = async () => {
    if (!user) return;
    setFormError(null);
    setFieldErrors({});

    const parsed = profileFormSchema.safeParse({
      username,
      displayName,
      weightKg,
    });

    if (!parsed.success) {
      const nextErrors: { username?: string; displayName?: string; weightKg?: string } = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === 'username' || key === 'displayName' || key === 'weightKg') {
          nextErrors[key] = issue.message;
        }
      }
      setFieldErrors(nextErrors);
      return;
    }

    if (availability === 'taken') {
      setFieldErrors({ username: 'That username is already taken.' });
      return;
    }

    setSaving(true);
    try {
      const parsedWeight = parsed.data.weightKg ? Number(parsed.data.weightKg) : null;
      await updateMyProfile(user.id, {
        username: parsed.data.username.toLowerCase(),
        display_name: parsed.data.displayName || null,
        weight_kg: parsedWeight,
      });
      await refreshProfile();
      router.back();
    } catch (err) {
      setFormError(mapAuthError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll contentContainerClassName="gap-6 py-6">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="w-full gap-6">
        <View>
          <Text variant="title">Edit Profile</Text>
          <Text variant="caption" className="mt-1">
            Update your public username, display name, or optional calorie-estimate weight.
          </Text>
        </View>

        <Card className="gap-4">
          {formError ? (
            <View className="rounded-button bg-danger-muted p-3">
              <Text variant="caption" className="text-danger">
                {formError}
              </Text>
            </View>
          ) : null}

          <Input
            label="Username *"
            placeholder="cat_walker"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            hint={
              availability === 'checking'
                ? 'Checking availability…'
                : '3–20 characters: letters, numbers, or underscores.'
            }
            error={getUsernameError()}
          />

          <Input
            label="Display name"
            placeholder="How your name appears"
            value={displayName}
            onChangeText={setDisplayName}
            error={fieldErrors.displayName}
          />

          <Input
            label="Weight in kg (optional)"
            placeholder="e.g. 70"
            value={weightKg}
            onChangeText={setWeightKg}
            keyboardType="decimal-pad"
            hint="Used only for approximate calorie estimates when no health app is connected."
            error={fieldErrors.weightKg}
          />

          <Button
            label="Save Changes"
            onPress={handleSave}
            loading={saving}
            disabled={availability === 'checking' || availability === 'taken'}
          />
          <Button
            label="Cancel"
            variant="ghost"
            onPress={() => router.back()}
          />
        </Card>
      </KeyboardAvoidingView>
    </Screen>
  );
}
