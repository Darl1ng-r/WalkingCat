import { View } from 'react-native';

import { EmptyState, Screen, Text } from '@/components/ui';

export default function WalkScreen() {
  return (
    <Screen contentContainerClassName="justify-between pb-8">
      <View className="mt-2">
        <Text variant="label">Activity Tracker</Text>
        <Text variant="title" className="mt-1">
          Walk
        </Text>
      </View>

      <EmptyState
        emoji="👟"
        title="GPS Walk Tracking"
        message="Start, pause, and record your private walking routes, distance, and pace. Coming in Phase 3."
      />

      <View />
    </Screen>
  );
}
