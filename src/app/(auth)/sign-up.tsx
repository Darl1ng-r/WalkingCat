import { Image } from 'expo-image';
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
import { DEMO_AVATARS } from '@/lib/demo-data';

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
    <Screen scroll padded={false} contentContainerClassName="justify-between bg-white dark:bg-[#12131C] pb-0">
      <View className="relative overflow-hidden bg-[#191A26] pb-12 pt-8">
        <View className="px-6">
          <View className="h-20 w-20 items-center justify-center overflow-hidden rounded-pill border-2 border-white bg-[#191A26]">
            <Image
              source={{ uri: DEMO_AVATARS.layla }}
              style={{ width: 76, height: 76 }}
              contentFit="contain"
            />
          </View>
        </View>
        <View className="absolute -bottom-6 left-0 right-0 h-12 rounded-t-[40px] bg-white dark:bg-[#12131C]" />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="w-full flex-1 justify-center gap-5 px-6 py-4">
        <View className="items-start">
          <Text variant="title" className="text-[28px] font-extrabold text-[#191A26] dark:text-[#FAF8F5]">
            Create your account
          </Text>
          <Text variant="caption" className="mt-1 text-left text-xs leading-5 text-[#6E7085]">
            Turn everyday walks into small neighborhood adventures.
          </Text>
        </View>

        <View className="gap-3.5">
          {formError ? (
            <View className="rounded-card border-[1.5px] border-[#191A26] bg-danger-muted p-3">
              <Text variant="caption" className="font-bold text-danger">
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
                className="font-extrabold text-[#F4A97B]"
                onPress={() => Linking.openURL(AppConfig.legal.privacyPolicyUrl).catch(() => {})}>
                Privacy Policy
              </Text>{' '}
              & Terms. Location and health data are never sold or used for ads.
            </Text>
          </View>

          <Button
            label="Create Account"
            variant="primary"
            onPress={handleSubmit}
            loading={loading}
          />
        </View>

        <View className="flex-row items-center justify-center gap-1">
          <Text variant="caption">Already have an account?</Text>
          <Link href="/(auth)/sign-in" asChild>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Sign in to existing account"
              className="min-h-[44px] justify-center px-2">
              <Text variant="caption" className="font-extrabold text-[#191A26] dark:text-[#F4A97B]">
                Sign in
              </Text>
            </Pressable>
          </Link>
        </View>
      </KeyboardAvoidingView>

      <View className="mt-6 h-10 w-full rounded-t-[36px] bg-[#191A26]" />
    </Screen>
  );
}
