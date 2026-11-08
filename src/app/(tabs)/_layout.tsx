import { Tabs } from 'expo-router';

import { FloatingDock } from '@/components/ui/floating-dock';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingDock {...props} />}
      screenOptions={{
        headerShown: false,
      }}>
      <Tabs.Screen name="index" options={{ title: 'Explore' }} />
      <Tabs.Screen name="walk" options={{ title: 'Walk' }} />
      <Tabs.Screen name="collection" options={{ title: 'Cats' }} />
      <Tabs.Screen name="social" options={{ title: 'League' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
