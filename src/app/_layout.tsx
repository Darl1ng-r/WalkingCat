import '../global.css';
import '@/features/walk/location-task';

import { QueryClientProvider } from '@tanstack/react-query';
import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  useRootNavigationState,
  useRouter,
  useSegments,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SessionProvider, useSession } from '@/features/auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { queryClient } from '@/lib/query-client';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const { isLoading, isAuthenticated, isOnboarded } = useSession();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (!isLoading && navigationState?.key) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isLoading, navigationState?.key]);

  useEffect(() => {
    if (isLoading || !navigationState?.key) {
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = inAuthGroup && segments[1] === 'onboarding';

    if (!isAuthenticated) {
      if (!inAuthGroup || inOnboarding) {
        router.replace('/(auth)/sign-in');
      }
      return;
    }

    if (!isOnboarded) {
      if (!inOnboarding) {
        router.replace('/(auth)/onboarding');
      }
      return;
    }

    if (inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isLoading, isAuthenticated, isOnboarded, segments, navigationState?.key, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen
        name="settings/edit-profile"
        options={{ presentation: 'modal', headerShown: false }}
      />
      <Stack.Screen name="+not-found" options={{ headerShown: true, title: 'Not Found' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <SessionProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
              <RootNavigator />
            </ThemeProvider>
          </SessionProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
