import { router } from 'expo-router';
import { View } from 'react-native';

import { EmptyState, Screen, StatTile, Text } from '@/components/ui';
import { formatDistance, formatDuration, formatNumber } from '@/lib/format';

export default function HomeScreen() {
  return (
    <Screen scroll contentContainerClassName="gap-6 pb-8">
      <View className="mt-2">
        <Text variant="label">Today</Text>
        <Text variant="title" className="mt-1">
          StrayCat Walk
        </Text>
        <Text variant="caption" className="mt-1">
          Walk a little farther. Discover a little more.
        </Text>
      </View>

      <View className="flex-row gap-3">
        <StatTile label="Distance" value={formatDistance(0)} />
        <StatTile label="Duration" value={formatDuration(0)} />
        <StatTile label="Steps" value={formatNumber(0)} />
      </View>

      <EmptyState
        emoji="🐾"
        title="Ready for your first walk?"
        message="Your daily summary, active challenges, and recent discoveries will appear here once you start exploring."
        actionLabel="Go to Walk"
        onAction={() => router.push('/walk')}
      />
    </Screen>
  );
}
