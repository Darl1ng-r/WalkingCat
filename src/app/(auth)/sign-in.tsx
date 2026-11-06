import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import { Button, Card, Input, Screen, Text } from '@/components/ui';
import { mapAuthError, signIn, signInSchema } from '@/features/auth';
import { isSupabaseConfigured } from '@/lib/env';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setFormError(null);
    setFieldErrors({});

    const parsed = signInSchema.safeParse({ email, password });
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
      await signIn(parsed.data.email, parsed.data.password);
    } catch (err) {
      setFormError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll contentContainerClassName="justify-center py-8">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="w-full gap-6">
        <View className="items-center">
          <View className="mb-3 h-16 w-16 items-center justify-center rounded-pill bg-primary-muted dark:bg-surface-elevated-dark">
            <Text className="text-3xl">🐾</Text>
          </View>
          <Text variant="title" className="text-center">
            Welcome back
          </Text>
          <Text variant="caption" className="mt-1 text-center">
            Sign in to continue your walking adventure.
          </Text>
        </View>

        {!isSupabaseConfigured ? (
          <Card className="border-primary/40 bg-primary-muted/40 dark:bg-surface-elevated-dark">
            <Text variant="label" className="text-primary-dark dark:text-primary-light">
              Supabase Not Connected Yet
            </Text>
            <Text variant="caption" className="mt-1">
              Run `npx eas-cli@latest integrations:supabase:connect` or add your credentials to
              `.env.local` to enable live sign-in.
            </Text>
          </Card>
        ) : null}

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
            placeholder="Your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
            error={fieldErrors.password}
          />

          <View className="items-end">
            <Link href="/(auth)/forgot-password" asChild>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Forgot password"
                className="min-h-[44px] justify-center px-1">
                <Text variant="caption" className="font-semibold text-primary">
                  Forgot password?
                </Text>
              </Pressable>
            </Link>
          </View>

          <Button
            label="Sign In"
            onPress={handleSubmit}
            loading={loading}
          />
        </Card>

        <View className="flex-row items-center justify-center gap-1">
          <Text variant="caption">New to StrayCat Walk?</Text>
          <Link href="/(auth)/sign-up" asChild>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Create an account"
              className="min-h-[44px] justify-center px-2">
              <Text variant="caption" className="font-semibold text-primary">
                Create an account
              </Text>
            </Pressable>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
