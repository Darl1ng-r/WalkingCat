import { router } from 'expo-router';
import { Platform, Pressable, View, type ViewStyle } from 'react-native';
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
  index: { label: 'Explore' },
  walk: { label: 'Walk' },
  collection: { label: 'Cats' },
  social: { label: 'League', badgeCount: 3 },
  profile: { label: 'Profile' },
};

function DockIcon({ name, active }: { name: string; active: boolean }) {
  const strokeColor = active ? '#FFFFFF' : 'rgba(255,255,255,0.92)';
  const iconBg = active ? '#181A22' : 'rgba(255,255,255,0.14)';

  if (name === 'index') {
    // Compass / Explore icon (like Reference Image 2)
    return (
      <View
        style={{ backgroundColor: iconBg }}
        className="h-7 w-7 items-center justify-center rounded-pill">
        <View
          style={{ borderColor: strokeColor }}
          className="h-4 w-4 items-center justify-center rounded-pill border-[1.75px]">
          <View
            style={{
              backgroundColor: strokeColor,
              transform: [{ rotate: '45deg' }],
            }}
            className="h-2 w-1 rounded-[1px]"
          />
        </View>
      </View>
    );
  }

  if (name === 'walk') {
    // Live Route / Map Pin icon
    return (
      <View
        style={{ backgroundColor: iconBg }}
        className="h-7 w-7 items-center justify-center rounded-pill">
        <View
          style={{ borderColor: strokeColor }}
          className="h-3.5 w-3.5 items-center justify-center rounded-pill border-[1.75px]">
          <View
            style={{ backgroundColor: active ? '#58B957' : strokeColor }}
            className="h-1.5 w-1.5 rounded-pill"
          />
        </View>
      </View>
    );
  }

  if (name === 'collection') {
    // Stacked Cards / Quests icon (like Reference Image 2)
    return (
      <View
        style={{ backgroundColor: iconBg }}
        className="h-7 w-7 items-center justify-center rounded-pill">
        <View className="items-center gap-[2px]">
          <View
            style={{
              borderColor: strokeColor,
              transform: [{ rotate: '0deg' }],
            }}
            className="h-1.5 w-3.5 rounded-[2px] border-[1.5px]"
          />
          <View
            style={{ backgroundColor: strokeColor, opacity: 0.85 }}
            className="h-[1.5px] w-3 rounded-pill"
          />
          <View
            style={{ backgroundColor: strokeColor, opacity: 0.6 }}
            className="h-[1.5px] w-2.5 rounded-pill"
          />
        </View>
      </View>
    );
  }

  if (name === 'social') {
    // League / Activity Podium icon
    return (
      <View
        style={{ backgroundColor: iconBg }}
        className="h-7 w-7 items-center justify-center rounded-pill">
        <View className="flex-row items-end gap-[2px]">
          <View style={{ backgroundColor: strokeColor }} className="h-2 w-1 rounded-[1px] opacity-80" />
          <View style={{ backgroundColor: strokeColor }} className="h-3.5 w-1.5 rounded-[1px]" />
          <View style={{ backgroundColor: strokeColor }} className="h-2.5 w-1 rounded-[1px] opacity-80" />
        </View>
      </View>
    );
  }

  // Profile avatar icon
  return (
    <View
      style={{ backgroundColor: iconBg }}
      className="h-7 w-7 items-center justify-center rounded-pill">
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
  const bottomOffset = Math.max(insets.bottom, 14);

  const webGlassStyle: ViewStyle =
    Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(24px) saturate(185%)',
          WebkitBackdropFilter: 'blur(24px) saturate(185%)',
          boxShadow: '0 18px 42px -10px rgba(15, 17, 26, 0.42), inset 0 1px 0 0 rgba(255,255,255,0.22)',
        } as unknown as ViewStyle)
      : {
          shadowColor: '#0F111A',
          shadowOpacity: 0.35,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 12 },
          elevation: 16,
        };

  const webFabStyle: ViewStyle =
    Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 14px 32px -6px rgba(15, 17, 26, 0.28)',
        } as unknown as ViewStyle)
      : {
          shadowColor: '#0F111A',
          shadowOpacity: 0.22,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          elevation: 12,
        };

  return (
    <View
      pointerEvents="box-none"
      style={{ bottom: bottomOffset }}
      className="absolute left-0 right-0 z-50 items-center px-4">
      <View className="w-full max-w-[460px] flex-row items-center gap-2.5">
        {/* Main Frosted Dark-Glass Capsule Dock */}
        <View
          style={[
            {
              backgroundColor: 'rgba(28, 30, 38, 0.82)',
              borderColor: 'rgba(255, 255, 255, 0.18)',
            },
            webGlassStyle,
          ]}
          className="flex-1 flex-row items-center justify-between rounded-pill border p-1.5">
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
                className={`relative flex-1 items-center justify-center rounded-pill py-1.5 transition-all ${
                  isFocused ? 'bg-white shadow-sm' : 'bg-transparent'
                }`}>
                <View className="relative items-center justify-center">
                  <DockIcon name={route.name} active={isFocused} />
                  {meta.badgeCount ? (
                    <View className="absolute -right-2 -top-1 h-4 min-w-[16px] items-center justify-center rounded-pill border border-[#1C1E26] bg-[#E9806E] px-1">
                      <Text className="text-[9px] font-bold leading-none text-white">
                        {meta.badgeCount}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text
                  className={`mt-0.5 text-[10px] font-bold tracking-tight ${
                    isFocused ? 'text-[#181A22]' : 'text-white/85'
                  }`}>
                  {meta.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Detached Circular "+" Quick-Action Button (Spot a Cat) */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log cat sighting"
          onPress={() => router.push('/sighting/capture')}
          style={[
            {
              backgroundColor: 'rgba(255, 255, 255, 0.96)',
              borderColor: 'rgba(255, 255, 255, 0.85)',
            },
            webFabStyle,
          ]}
          className="h-[58px] w-[58px] items-center justify-center rounded-pill border active:scale-95">
          <View className="h-11 w-11 items-center justify-center rounded-pill bg-[#F5F6FA]">
            <Text className="text-2xl font-bold leading-none text-[#181A22]">+</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}
