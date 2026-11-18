import { Pressable, View, type ViewProps } from 'react-native';

import { AppIcon, Text } from './text';

export interface GlassViewProps extends ViewProps {
  tone?: 'light' | 'dark';
  className?: string;
}

export function GlassView({
  tone = 'light',
  className = '',
  style,
  ...props
}: GlassViewProps) {
  const toneClass =
    tone === 'dark'
      ? 'bg-[#191A26] border-[#191A26]'
      : 'bg-white dark:bg-[#191A26] border-[#191A26] dark:border-[#35384F]';

  return (
    <View
      style={style}
      className={`border-[1.5px] ${toneClass} ${className}`.trim()}
      {...props}
    />
  );
}

export interface GlassPillProps {
  label: string;
  badgeCount?: number | string;
  active?: boolean;
  onPress?: () => void;
  icon?: string;
}

export function GlassPill({
  label,
  badgeCount,
  active = false,
  onPress,
  icon,
}: GlassPillProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className={`min-h-[40px] flex-row items-center gap-1.5 rounded-pill border-[1.5px] px-4 py-2 transition-opacity duration-150 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4A97B] ${
        active
          ? 'border-[#191A26] bg-[#191A26] dark:border-[#F4A97B] dark:bg-[#F4A97B]'
          : 'border-[#191A26] bg-white dark:border-[#35384F] dark:bg-[#232536]'
      }`}>
      {icon ? (
        <AppIcon
          name={icon}
          size={13}
          color={active ? '#F4A97B' : '#191A26'}
        />
      ) : null}
      <Text
        variant="caption"
        className={`text-xs font-bold ${
          active
            ? 'text-white dark:text-[#191A26]'
            : 'text-[#191A26] dark:text-[#FAF8F5]'
        }`}>
        {label}
      </Text>
      {badgeCount !== undefined ? (
        <View
          className={`rounded-pill px-1.5 py-0.5 ${
            active ? 'bg-[#F4A97B] dark:bg-[#191A26]' : 'bg-[#FCE8D5]'
          }`}>
          <Text
            variant="caption"
            className={`text-[10px] font-bold ${
              active ? 'text-[#191A26] dark:text-white' : 'text-[#191A26]'
            }`}>
            {badgeCount}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
