import { View } from 'react-native';

import { EmptyState, Screen, Text } from '@/components/ui';

export default function CollectionScreen() {
  return (
    <Screen contentContainerClassName="justify-between pb-8">
      <View className="mt-2">
        <Text variant="label">Discoveries</Text>
        <Text variant="title" className="mt-1">
          Cat Collection
        </Text>
      </View>

      <EmptyState
        emoji="🐱"
        title="Your Cat Collection"
        message="Respectful cat sightings you photograph on your walks will be collected here as personal cards. Coming in Phases 6–8."
      />

      <View />
    </Screen>
  );
}
