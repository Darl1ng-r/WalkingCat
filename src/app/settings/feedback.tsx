import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, TextInput, View } from 'react-native';

import {
  Button,
  Card,
  Screen,
  Text,
} from '@/components/ui';
import {
  FEEDBACK_CATEGORIES,
  useSubmitFeedbackMutation,
  validateFeedbackMessage,
  type FeedbackCategory,
} from '@/features/feedback';

export default function FeedbackSettingsScreen() {
  const [category, setCategory] = useState<FeedbackCategory>('bug');
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const submitMutation = useSubmitFeedbackMutation();

  const handleSubmit = async () => {
    setErrorMessage(null);
    const check = validateFeedbackMessage(message);
    if (!check.valid) {
      setErrorMessage(check.error ?? 'Invalid message.');
      return;
    }

    try {
      await submitMutation.mutateAsync({
        category,
        message,
        appVersion: '1.0.0-beta',
        platform: Platform.OS,
      });
      setIsSubmitted(true);
      setMessage('');
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Could not submit feedback.'
      );
    }
  };

  return (
    <Screen scroll contentContainerClassName="gap-5 pb-12 pt-2">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text variant="label">Beta Testing</Text>
          <Text variant="title" className="mt-0.5">
            Send Feedback 💌
          </Text>
          <Text variant="caption" className="mt-1 leading-5">
            Help us improve StrayCat Walk. Report a bug, suggest features, or share your thoughts!
          </Text>
        </View>
        <Button
          label="Back"
          size="sm"
          variant="ghost"
          onPress={() => router.back()}
        />
      </View>

      {isSubmitted ? (
        <Card className="items-center gap-3 border-secondary/60 bg-secondary/10 py-6">
          <Text className="text-4xl">🐾</Text>
          <Text variant="heading" className="text-center">
            Thank You for Your Feedback!
          </Text>
          <Text variant="caption" className="text-center leading-5">
            Your notes help make walks better for the whole community. You can submit additional
            feedback anytime during the beta.
          </Text>
          <Button
            label="Send More Feedback"
            size="sm"
            variant="secondary"
            onPress={() => setIsSubmitted(false)}
          />
        </Card>
      ) : (
        <>
          {errorMessage ? (
            <Card className="border-danger bg-danger-muted py-2.5">
              <Text variant="caption" className="font-semibold text-danger">
                {errorMessage}
              </Text>
            </Card>
          ) : null}

          {/* Category Selector */}
          <View className="gap-2">
            <Text variant="label">Feedback Category</Text>
            <View className="flex-row flex-wrap gap-2">
              {FEEDBACK_CATEGORIES.map((cat) => {
                const active = category === cat.key;
                return (
                  <Pressable
                    key={cat.key}
                    accessibilityRole="button"
                    accessibilityLabel={cat.label}
                    onPress={() => setCategory(cat.key)}
                    className={`flex-row items-center gap-1.5 rounded-pill border px-3.5 py-2 ${
                      active
                        ? 'border-primary bg-primary'
                        : 'border-border bg-surface dark:border-border-dark dark:bg-surface-dark'
                    }`}>
                    <Text className="text-sm">{cat.emoji}</Text>
                    <Text
                      variant="caption"
                      className={`text-xs font-bold ${
                        active
                          ? 'text-white'
                          : 'text-text-primary dark:text-text-primary-dark'
                      }`}>
                      {cat.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Multi-line message input */}
          <Card className="gap-2 p-4">
            <View className="flex-row items-center justify-between">
              <Text variant="label">Your Message</Text>
              <Text variant="caption" className="text-xs">
                {message.length} / 2000
              </Text>
            </View>

            <TextInput
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              placeholder="What happened? What could be better? (Minimum 5 characters)"
              value={message}
              onChangeText={setMessage}
              maxLength={2000}
              className="min-h-[140px] rounded-lg border border-border p-3 text-base text-text-primary dark:border-border-dark dark:text-text-primary-dark"
            />
          </Card>

          <Card className="gap-1 border-border/60 bg-surface/40 p-3">
            <Text variant="caption" className="text-[11px] text-text-secondary">
              Diagnostics: {Platform.OS} · App v1.0.0-beta · No personal location coordinates or
              health data are attached.
            </Text>
          </Card>

          <Button
            label="Submit Beta Feedback"
            size="lg"
            loading={submitMutation.isPending}
            disabled={message.trim().length < 5}
            onPress={handleSubmit}
          />
        </>
      )}
    </Screen>
  );
}
