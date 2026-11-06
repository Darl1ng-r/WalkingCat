import { View } from 'react-native';

import { EmptyState, Screen, Text } from '@/components/ui';

export default function ProfileScreen() {
  return (
    <Screen contentContainerClassName="justify-between pb-8">
      <View className="mt-2">
        <Text variant="label">Account</Text>
        <Text variant="title" className="mt-1">
          Profile & Settings
        </Text>
      </View>

      <EmptyState
        emoji="👤"
        title="Your Profile"
        message="Manage your account, achievements, privacy controls, and health permissions. Coming in Phase 2."
      />

      <View />
    </Screen>
  );
}
