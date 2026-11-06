import { router } from 'expo-router';

import { Button, EmptyState, Screen } from '@/components/ui';

export default function NotFoundScreen() {
  return (
    <Screen contentContainerClassName="items-center justify-center">
      <EmptyState
        emoji="🧭"
        title="Lost on the walk?"
        message="This screen does not exist. Let's head back home."
      />
      <Button
        label="Back to Home"
        onPress={() => router.replace('/')}
        className="mt-4"
      />
    </Screen>
  );
}
