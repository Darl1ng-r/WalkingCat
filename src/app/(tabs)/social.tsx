import { View } from 'react-native';

import { EmptyState, Screen, Text } from '@/components/ui';

export default function SocialScreen() {
  return (
    <Screen contentContainerClassName="justify-between pb-8">
      <View className="mt-2">
        <Text variant="label">Community</Text>
        <Text variant="title" className="mt-1">
          Friends & Leaderboard
        </Text>
      </View>

      <EmptyState
        emoji="🏆"
        title="Friendly Competition"
        message="Connect with friends, share milestones privately, and compare weekly steps and distance. Coming in Phase 10."
      />

      <View />
    </Screen>
  );
}
