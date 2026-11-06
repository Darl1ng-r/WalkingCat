import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { Button, Card, Input, Screen, Text } from '@/components/ui';
import { forgotPasswordSchema, mapAuthError, resetPassword } from '@/features/auth';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setFormError(null);
    setEmailError(undefined);

    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setEmailError(parsed.error.issues[0]?.message);
      return;
    }

    setLoading(true);
    try {
      await resetPassword(parsed.data.email);
      setSent(true);
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
        <View>
          <Text variant="title">Reset password</Text>
          <Text variant="caption" className="mt-1">
            Enter your account email and we will send you a password reset link.
          </Text>
        </View>

        {sent ? (
          <Card className="gap-4 p-6">
            <Text variant="heading">Reset link sent</Text>
            <Text variant="caption" className="leading-5">
              If an account exists for {email.trim()}, a password reset link has been sent.
            </Text>
            <Button
              label="Back to Sign In"
              onPress={() => router.back()}
              variant="secondary"
            />
          </Card>
        ) : (
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
              error={emailError}
            />

            <Button label="Send Reset Link" onPress={handleSubmit} loading={loading} />
            <Button label="Cancel" onPress={() => router.back()} variant="ghost" />
          </Card>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}
