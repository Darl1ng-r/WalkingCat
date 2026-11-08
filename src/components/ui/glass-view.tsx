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
      ? 'bg-[#1C1E26]/78 border-white/15 backdrop-blur-xl'
      : 'bg-white/80 dark:bg-[#1C1E26]/80 border-white/50 dark:border-white/15 backdrop-blur-xl';

  return (
    <View
      style={style}
      className={`border shadow-sm ${toneClass} ${className}`.trim()}
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
      className={`flex-row items-center gap-1.5 rounded-pill px-4 py-2 ${
        active
          ? 'bg-white shadow-sm'
          : 'border border-white/20 bg-[#1C1E26]/65 backdrop-blur-xl'
      }`}>
      {icon ? <Text className="text-xs">{icon}</Text> : null}
      <Text
        variant="caption"
        className={`text-xs font-bold ${
          active ? 'text-[#141720]' : 'text-white'
        }`}>
        {label}
      </Text>
      {badgeCount !== undefined ? (
        <View
          className={`rounded-pill px-1.5 py-0.5 ${
            active ? 'bg-[#141720]/10' : 'bg-white'
          }`}>
          <Text
            variant="caption"
            className="text-[10px] font-extrabold text-[#141720]">
            {badgeCount}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
