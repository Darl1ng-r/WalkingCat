import { router } from 'expo-router';
import { View } from 'react-native';

import { Button, Card, Screen, Text } from '@/components/ui';

const WELFARE_RULES = [
  {
    emoji: '🔭',
    title: 'Keep a respectful distance',
    description: 'Use camera zoom rather than approaching, following, or cornering a cat.',
  },
  {
    emoji: '⚡',
    title: 'Never use flash',
    description: 'Our in-app camera keeps flash disabled so bright light never startles animals.',
  },
  {
    emoji: '🐾',
    title: 'Observe only — do not touch, chase, or feed',
    description: 'Never disturb resting cats, handle stray animals, or enter private property.',
  },
] as const;

export default function OnboardingWelfareScreen() {
  return (
    <Screen scroll contentContainerClassName="justify-between gap-6 py-8">
      <View className="mt-2">
        <Text variant="label">Step 2 of 3 · Animal Welfare</Text>
        <Text variant="title" className="mt-2">
          Respect the cats
        </Text>
        <Text variant="caption" className="mt-2 leading-6">
          Discovery is about quiet observation, never chasing. Please review our community promise:
        </Text>
      </View>

      <View className="gap-3">
        {WELFARE_RULES.map((rule) => (
          <Card key={rule.title} className="gap-1.5">
            <Text variant="heading">
              {rule.emoji} {rule.title}
            </Text>
            <Text variant="caption" className="leading-5">
              {rule.description}
            </Text>
          </Card>
        ))}
      </View>

      <View className="gap-3">
        <Button
          label="I understand"
          size="lg"
          onPress={() => router.push('/(auth)/onboarding/profile-setup')}
        />
        <Button
          label="Back"
          variant="ghost"
          onPress={() => router.back()}
        />
      </View>
    </Screen>
  );
}
