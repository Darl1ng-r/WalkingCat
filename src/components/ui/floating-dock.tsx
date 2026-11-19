import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from './text';

export interface FloatingDockRoute {
  key: string;
  name: string;
  params?: object;
}

export interface FloatingDockProps {
  state: {
    index: number;
    routes: readonly FloatingDockRoute[];
  };
  descriptors: Record<
    string,
    {
      options: {
        tabBarLabel?:
          | string
          | ((props: {
              focused: boolean;
              color: string;
              position: any;
              children: string;
            }) => any);
        title?: string;
      };
    }
  >;
  navigation?: {
    emit: (event: {
      type: 'tabPress';
      target: string;
      canPreventDefault: true;
    }) => { defaultPrevented?: boolean };
    navigate: (name: string, params?: object) => void;
  };
  emitter?: {
    emit: (event: {
      type: 'tabPress';
      target: string;
      canPreventDefault: true;
    }) => { defaultPrevented?: boolean };
  };
  navigateToTab?: (routeKey: string) => void;
}

interface DockTabMeta {
  label: string;
  badgeCount?: number;
}

const TAB_META: Record<string, DockTabMeta> = {
  index: { label: 'Home' },
  walk: { label: 'Walk' },
  collection: { label: 'Cats' },
  social: { label: 'Friends' },
  profile: { label: 'Profile' },
};

function getDockSvgUri(name: string, active: boolean): string {
  const color = active ? '#F4A97B' : '#A6A8BA';

  if (name === 'index') {
    const svg = active
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="${color}"><path d="M12 3.2L3.5 10.2V20.5C3.5 21.1 3.9 21.5 4.5 21.5H9.5V15.5H14.5V21.5H19.5C20.1 21.5 20.5 21.1 20.5 20.5V10.2L12 3.2Z"/></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5.5v-6h-5v6H4a1 1 0 0 1-1-1v-9.5z"/></svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  if (name === 'walk') {
    // Clean concentric record/GPS ring icon matching the reference center icon
    const svg = active
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="${color}" stroke-width="2"/><circle cx="12" cy="12" r="5" fill="${color}"/></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.5" stroke="${color}" stroke-width="1.8"/><circle cx="12" cy="12" r="4.5" fill="${color}"/></svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  if (name === 'collection') {
    // Cat silhouette / cards icon
    const svg = active
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="${color}"><path d="M5 4l3 3.5A7.5 7.5 0 0 1 12 6.5c1.5 0 2.9.4 4 1L19 4v7.5a7 7 0 0 1-14 0V4z"/></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4l3.2 3.4A7 7 0 0 1 12 6.5c1.4 0 2.7.3 3.8.9L19 4v7.5a7 7 0 0 1-14 0V4z"/></svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  if (name === 'social') {
    // Clean Friends / Discovery people icon
    const svg = active
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="${color}"><circle cx="9" cy="8.5" r="3.5"/><path d="M2.5 19.5c0-3.1 2.9-5.2 6.5-5.2s6.5 2.1 6.5 5.2"/><circle cx="17" cy="9.5" r="2.6" fill-opacity="0.85"/><path d="M16.2 14.8c2.6.3 5.3 1.9 5.3 4.7h-4.2" fill-opacity="0.85"/></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8.5" r="3.2"/><path d="M3 19.5a6 6 0 0 1 12 0"/><circle cx="17" cy="9.5" r="2.3"/><path d="M16.5 14.5a4.8 4.8 0 0 1 4.5 5"/></svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  // Profile icon
  const svg = active
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="${color}"><circle cx="12" cy="8" r="4"/><path d="M4.5 20c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.8"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function FloatingDock({
  state,
  descriptors,
  navigation,
  emitter,
  navigateToTab,
}: FloatingDockProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 10);

  return (
    <View
      style={{ bottom: 0, pointerEvents: 'box-none' }}
      className="absolute left-0 right-0 z-50 items-center">
      {/* Full-width edge-to-edge bottom navigation bar */}
      <View
        style={{ paddingBottom: bottomPad }}
        className="w-full max-w-[480px] flex-row items-center justify-between border-t border-white/10 bg-[#191A26] px-2 pt-2.5">
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const meta = TAB_META[route.name] ?? {
            label:
              typeof options.tabBarLabel === 'string'
                ? options.tabBarLabel
                : options.title ?? route.name,
          };

          const onPress = () => {
            const emitFn = emitter?.emit ?? navigation?.emit;
            const event = emitFn
              ? emitFn({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                })
              : { defaultPrevented: false };

            if (!isFocused && !event.defaultPrevented) {
              if (navigateToTab) {
                navigateToTab(route.key);
              } else if (navigation?.navigate) {
                navigation.navigate(route.name, route.params);
              } else {
                const targetPath = route.name === 'index' ? '/' : `/${route.name}`;
                router.navigate(targetPath as never);
              }
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={meta.label}
              onPress={onPress}
              className="relative min-h-[44px] flex-1 items-center justify-center py-0.5 transition-opacity duration-150 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4A97B]">
              <View className="relative items-center justify-center">
                <Image
                  source={{ uri: getDockSvgUri(route.name, isFocused) }}
                  style={{ width: 22, height: 22 }}
                  contentFit="contain"
                />
                {meta.badgeCount ? (
                  <View className="absolute -right-2 -top-1 h-4 min-w-[16px] items-center justify-center rounded-pill border border-[#191A26] bg-[#F4A97B] px-1">
                    <Text className="text-[9px] font-extrabold leading-none text-[#191A26]">
                      {meta.badgeCount}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text
                className={`mt-1 text-[11px] font-bold tracking-tight ${
                  isFocused ? 'text-[#F4A97B]' : 'text-[#A6A8BA]'
                }`}>
                {meta.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
