import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import { Button, Card, Input, Screen, Text } from '@/components/ui';
import { mapAuthError, signIn, signInSchema, useSession } from '@/features/auth';
import { DEMO_AVATARS } from '@/lib/demo-data';
import { isSupabaseConfigured } from '@/lib/env';

export default function SignInScreen() {
  const { enterDemoMode } = useSession();
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
    <Screen scroll padded={false} contentContainerClassName="justify-between bg-white dark:bg-[#12131C] pb-0">
      {/* Top Organic Wavy Midnight-Ink Header & Blob Cat Mascot (Matching Reference Top-Center Screen) */}
      <View className="relative overflow-hidden bg-[#191A26] pb-12 pt-8">
        <View className="px-6">
          <View className="h-20 w-20 items-center justify-center overflow-hidden rounded-pill border-2 border-white bg-[#191A26]">
            <Image
              source={{ uri: DEMO_AVATARS.mina }}
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
            Welcome back!
          </Text>
          <Text variant="caption" className="mt-1 text-left text-xs leading-5 text-[#6E7085]">
            We are happy to see you again. Enter your email and password to continue your walk.
          </Text>
        </View>

        {!isSupabaseConfigured ? (
          <Card elevated className="gap-3">
            <View>
              <Text variant="label" className="text-[#191A26]">
                ✨ Interactive Preview Mode Available
              </Text>
              <Text variant="caption" className="mt-1 text-[#191A26]/80">
                Explore the full StrayCat Walk app with sample walks, cat cards, card themes,
                cosmetics, challenges, and friends leaderboards—or connect `.env.local` for live
                Supabase auth.
              </Text>
            </View>
            <Button
              label="✨ Enter Interactive Demo"
              variant="ghost"
              size="sm"
              onPress={enterDemoMode}
            />
          </Card>
        ) : null}

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
            placeholder="Your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
            error={fieldErrors.password}
          />

          <View className="items-center">
            <Link href="/(auth)/forgot-password" asChild>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Forgot password"
                className="min-h-[36px] justify-center px-1">
                <Text variant="caption" className="text-xs font-bold text-[#F4A97B]">
                  Forgot password?
                </Text>
              </Pressable>
            </Link>
          </View>

          {/* Warm Peach Primary Button ("Войти" in reference) */}
          <Button
            label="Sign In"
            variant="primary"
            onPress={handleSubmit}
            loading={loading}
          />
        </View>

        <View className="items-center gap-3 pt-1">
          <Text variant="caption" className="text-xs font-semibold text-[#6E7085]">
            New to StrayCat Walk?
          </Text>
          {/* Solid Midnight-Ink Button ("Создать аккаунт" in reference) */}
          <Link href="/(auth)/sign-up" asChild>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Create an account"
              className="min-h-[48px] w-full items-center justify-center rounded-pill border-[1.5px] border-[#191A26] bg-[#191A26] px-5 py-3">
              <Text className="text-sm font-bold text-white">
                Create an account
              </Text>
            </Pressable>
          </Link>
        </View>
      </KeyboardAvoidingView>

      {/* Bottom Organic Midnight-Ink Wave Accent */}
      <View className="mt-6 h-10 w-full rounded-t-[36px] bg-[#191A26]" />
    </Screen>
  );
}
