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
  social: { label: 'League' },
  profile: { label: 'Profile' },
};

function DockIcon({ name, active }: { name: string; active: boolean }) {
  // Reference bottom nav uses circular slate-violet/peach icon badges inside the #191A26 bar
  const circleBg = active ? '#F4A97B' : '#32344A';
  const strokeColor = active ? '#191A26' : '#FFFFFF';

  if (name === 'index') {
    // House / Home icon (like "Главная" in the reference bottom bar)
    return (
      <View
        style={{ backgroundColor: circleBg }}
        className="h-8 w-8 items-center justify-center rounded-pill">
        <View className="items-center">
          <View
            style={{
              borderBottomColor: strokeColor,
            }}
            className="h-0 w-0 border-b-[6px] border-l-[7px] border-r-[7px] border-l-transparent border-r-transparent"
          />
          <View
            style={{ backgroundColor: strokeColor }}
            className="h-2 w-2.5 rounded-b-[2px]"
          />
        </View>
      </View>
    );
  }

  if (name === 'walk') {
    // GPS Teardrop Pin icon (matching the reference bottom bar middle pin icon)
    return (
      <View
        style={{ backgroundColor: circleBg }}
        className="h-8 w-8 items-center justify-center rounded-pill">
        <View
          style={{ borderColor: strokeColor }}
          className="h-3.5 w-3.5 items-center justify-center rounded-pill border-[2px]">
          <View
            style={{ backgroundColor: strokeColor }}
            className="h-1.5 w-1.5 rounded-pill"
          />
        </View>
      </View>
    );
  }

  if (name === 'collection') {
    // Cards / Book icon (matching "Статьи" in the reference bottom bar)
    return (
      <View
        style={{ backgroundColor: circleBg }}
        className="h-8 w-8 items-center justify-center rounded-pill">
        <View
          style={{ borderColor: strokeColor }}
          className="h-3.5 w-3.5 items-center justify-center rounded-[3px] border-[1.75px]">
          <View
            style={{ backgroundColor: strokeColor }}
            className="h-[1.5px] w-2 rounded-pill"
          />
        </View>
      </View>
    );
  }

  if (name === 'social') {
    // League / Calendar-Events icon
    return (
      <View
        style={{ backgroundColor: circleBg }}
        className="h-8 w-8 items-center justify-center rounded-pill">
        <View className="flex-row items-end gap-[2px]">
          <View style={{ backgroundColor: strokeColor }} className="h-2 w-1 rounded-[1px]" />
          <View style={{ backgroundColor: strokeColor }} className="h-3.5 w-1.5 rounded-[1px]" />
          <View style={{ backgroundColor: strokeColor }} className="h-2.5 w-1 rounded-[1px]" />
        </View>
      </View>
    );
  }

  // Profile / Blob Cat face icon
  return (
    <View
      style={{ backgroundColor: circleBg }}
      className="h-8 w-8 items-center justify-center rounded-pill">
      <View className="items-center gap-[1.5px]">
        <View style={{ backgroundColor: strokeColor }} className="h-1.5 w-1.5 rounded-pill" />
        <View style={{ backgroundColor: strokeColor }} className="h-1.5 w-3 rounded-t-pill" />
      </View>
    </View>
  );
}

export function FloatingDock({
  state,
  descriptors,
  navigation,
  emitter,
  navigateToTab,
}: FloatingDockProps) {
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(insets.bottom, 10);

  return (
    <View
      style={{ bottom: bottomOffset, pointerEvents: 'box-none' }}
      className="absolute left-0 right-0 z-50 items-center px-3">
      <View className="w-full max-w-[460px] flex-row items-center gap-2.5">
        {/* Solid Deep Midnight-Ink Bottom Bar (#191A26) matching the Reference */}
        <View className="flex-1 flex-row items-center justify-between rounded-pill border-[1.5px] border-[#191A26] bg-[#191A26] px-2 py-2 shadow-lg">
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
                className="relative flex-1 items-center justify-center rounded-pill py-0.5 transition-opacity duration-150 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4A97B]">
                <View className="relative items-center justify-center">
                  <DockIcon name={route.name} active={isFocused} />
                  {meta.badgeCount ? (
                    <View className="absolute -right-1.5 -top-1 h-4 min-w-[16px] items-center justify-center rounded-pill border border-[#191A26] bg-[#F4A97B] px-1">
                      <Text className="text-[9px] font-extrabold leading-none text-[#191A26]">
                        {meta.badgeCount}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text
                  className={`mt-1 text-[10px] font-bold tracking-tight ${
                    isFocused ? 'text-[#F4A97B]' : 'text-white/75'
                  }`}>
                  {meta.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Warm Peach Circular "+" Button (#F4A97B with #191A26 border) from Reference */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log cat sighting"
          onPress={() => router.push('/sighting/capture')}
          className="h-14 w-14 items-center justify-center rounded-pill border-[2px] border-[#191A26] bg-[#F4A97B] shadow-md transition-transform duration-150 hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-95">
          <Text className="text-2xl font-bold leading-none text-[#191A26]">+</Text>
        </Pressable>
      </View>
    </View>
  );
}
