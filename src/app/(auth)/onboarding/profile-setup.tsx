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

export default function OnboardingProfileSetupScreen() {
  const { user, profile, refreshProfile } = useSession();

  const initialUsername =
    profile?.username && !profile.username.startsWith('walker_') ? profile.username : '';

  const [username, setUsername] = useState(initialUsername);
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

  const getUsernameHint = (): string | undefined => {
    switch (availability) {
      case 'checking':
        return 'Checking availability…';
      case 'available':
        return '✓ Username is available';
      default:
        return '3–20 characters: letters, numbers, or underscores.';
    }
  };

  const getUsernameError = (): string | undefined => {
    if (fieldErrors.username) return fieldErrors.username;
    if (availability === 'taken') return 'That username is already taken.';
    return undefined;
  };

  const handleComplete = async () => {
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
        onboarded_at: new Date().toISOString(),
      });
      await refreshProfile();
    } catch (err) {
      setFormError(mapAuthError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll contentContainerClassName="justify-between py-8">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="w-full gap-6">
        <View className="mt-2">
          <Text variant="label">Step 3 of 3 · Your Profile</Text>
          <Text variant="title" className="mt-2">
            Set up your profile
          </Text>
          <Text variant="caption" className="mt-2 leading-6">
            Choose a unique username so friends can find you when you choose to connect.
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
            hint={getUsernameHint()}
            error={getUsernameError()}
          />

          <Input
            label="Display name (optional)"
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
            hint="Only used to calculate approximate calorie estimates when no health app is connected. You can skip this."
            error={fieldErrors.weightKg}
          />

          <Button
            label="Start Exploring"
            size="lg"
            onPress={handleComplete}
            loading={saving}
            disabled={availability === 'checking' || availability === 'taken'}
          />
        </Card>
      </KeyboardAvoidingView>
    </Screen>
  );
}
