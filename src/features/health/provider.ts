import { Platform } from 'react-native';

import { healthProvider as androidProvider } from './provider.android';
import { healthProvider as iosProvider } from './provider.ios';
import { healthProvider as webProvider } from './provider.web';
import type { HealthProvider } from './types';

export const healthProvider: HealthProvider =
  Platform.OS === 'ios'
    ? iosProvider
    : Platform.OS === 'android'
      ? androidProvider
      : webProvider;
