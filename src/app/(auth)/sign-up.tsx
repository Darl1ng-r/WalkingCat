import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  View,
} from 'react-native';

import { Button, Card, Input, Screen, Text } from '@/components/ui';
import { AppConfig } from '@/constants/config';
import { mapAuthError, signUp, signUpSchema } from '@/features/auth';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setFormError(null);
    setFieldErrors({});

    const parsed = signUpSchema.safeParse({ email, password });
    if (!parsed.success) {
      const nextErrors: { email?: string; password?: string } = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === 'email' || key === 'password') {
          nextErrors[key] = issue.message;
        }
      }
      setFieldErrors(nextErrors);
      return;
    }

    setLoading(true);
    try {
      const result = await signUp(parsed.data.email, parsed.data.password);
      if (result.requiresEmailConfirmation) {
        setConfirmationSent(true);
      }
    } catch (err) {
      setFormError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  if (confirmationSent) {
    return (
      <Screen contentContainerClassName="justify-center py-8">
        <Card className="items-center gap-4 p-6">
          <Text className="text-4xl">📬</Text>
          <Text variant="heading" className="text-center">
            Check your email
          </Text>
          <Text variant="caption" className="text-center leading-5">
            We sent a confirmation link to {email.trim()}. Once confirmed, come back and sign in!
          </Text>
          <Button
            label="Back to Sign In"
            onPress={() => router.replace('/(auth)/sign-in')}
            className="mt-2 w-full"
          />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen scroll contentContainerClassName="justify-center py-8">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="w-full gap-6">
        <View className="items-center">
          <View className="mb-3 h-16 w-16 items-center justify-center rounded-pill bg-primary-muted dark:bg-surface-elevated-dark">
            <Text className="text-3xl">🐱</Text>
          </View>
          <Text variant="title" className="text-center">
            Create your account
          </Text>
          <Text variant="caption" className="mt-1 text-center">
            Turn everyday walks into small neighborhood adventures.
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
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            error={fieldErrors.email}
          />

          <Input
            label="Password"
            placeholder="At least 8 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            hint="Use at least 8 characters."
            error={fieldErrors.password}
          />

          <View className="py-1">
            <Text variant="caption" className="text-center text-xs leading-4">
              By creating an account, you agree to our{' '}
              <Text
                className="font-semibold text-primary"
                onPress={() => Linking.openURL(AppConfig.legal.privacyPolicyUrl).catch(() => {})}>
                Privacy Policy
              </Text>{' '}
              & Terms. Location and health data are never sold or used for ads.
            </Text>
          </View>

          <Button
            label="Create Account"
            onPress={handleSubmit}
            loading={loading}
          />
        </Card>

        <View className="flex-row items-center justify-center gap-1">
          <Text variant="caption">Already have an account?</Text>
          <Link href="/(auth)/sign-in" asChild>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Sign in to existing account"
              className="min-h-[44px] justify-center px-2">
              <Text variant="caption" className="font-semibold text-primary">
                Sign in
              </Text>
            </Pressable>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
