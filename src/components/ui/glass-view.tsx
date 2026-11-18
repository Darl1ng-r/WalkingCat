import { Pressable, View, type ViewProps } from 'react-native';

import { Text } from './text';

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
  // Styled after the reference's circular/pill filter row (solid #191A26 active pill + crisp outlined white inactive pills)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className={`flex-row items-center gap-1.5 rounded-pill border-[1.5px] border-[#191A26] px-4 py-1.5 ${
        active ? 'bg-[#191A26]' : 'bg-white'
      }`}>
      {icon ? <Text className="text-xs">{icon}</Text> : null}
      <Text
        variant="caption"
        className={`text-xs font-extrabold ${
          active ? 'text-white' : 'text-[#191A26]'
        }`}>
        {label}
      </Text>
      {badgeCount !== undefined ? (
        <View
          className={`rounded-pill px-1.5 py-0.5 ${
            active ? 'bg-[#F4A97B]' : 'bg-[#FCE8D5]'
          }`}>
          <Text
            variant="caption"
            className="text-[10px] font-extrabold text-[#191A26]">
            {badgeCount}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
