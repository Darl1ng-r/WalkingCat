import { router } from 'expo-router';
import { View } from 'react-native';

import { Button, Card, Screen, Text } from '@/components/ui';

export default function OnboardingWelcomeScreen() {
  return (
    <Screen contentContainerClassName="justify-between py-8">
      <View className="mt-4">
        <Text variant="label">Step 1 of 3</Text>
        <Text variant="title" className="mt-2">
          Walk a little farther.{'\n'}Discover a little more.
        </Text>
        <Text variant="caption" className="mt-2 leading-6">
          Collect the cats you meet along the way while building a personal walking habit.
        </Text>
      </View>

      <View className="gap-4">
        <Card className="gap-2">
          <Text variant="heading">👟 Movement comes first</Text>
          <Text variant="caption" className="leading-5">
            Every walk counts toward your personal history, challenges, and milestones—even on days
            you do not spot a cat.
          </Text>
        </Card>

        <Card className="gap-2">
          <Text variant="heading">🔒 Private by default</Text>
          <Text variant="caption" className="leading-5">
            Your walking routes stay private to you, and we never share live locations or exact cat
            coordinates.
          </Text>
        </Card>
      </View>

      <Button
        label="Next"
        size="lg"
        onPress={() => router.push('/(auth)/onboarding/welfare')}
      />
    </Screen>
  );
}
