import * as Haptics from 'expo-haptics';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  View,
} from 'react-native';

import { Text } from './text';

export type ButtonVariant = 'primary' | 'secondary' | 'action' | 'charcoal' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  haptic?: boolean;
  className?: string;
}

const variantContainerClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[#F4A97B] border-[1.5px] border-[#191A26] active:opacity-90',
  secondary:
    'bg-[#191A26] border-[1.5px] border-[#191A26] dark:border-[#F4A97B] active:opacity-90',
  action:
    'bg-[#F4A97B] border-[1.5px] border-[#191A26] active:opacity-90',
  charcoal:
    'bg-[#191A26] border-[1.5px] border-[#191A26] dark:bg-white active:opacity-90',
  ghost:
    'bg-white dark:bg-[#232536] border-[1.5px] border-[#191A26] dark:border-[#FAF8F5]/40 active:opacity-80',
  danger:
    'bg-danger border-[1.5px] border-[#191A26] active:opacity-90',
};

const variantTextClasses: Record<ButtonVariant, string> = {
  primary: 'text-[#191A26] font-extrabold tracking-tight',
  secondary: 'text-white font-bold tracking-tight',
  action: 'text-[#191A26] font-extrabold tracking-tight',
  charcoal: 'text-white dark:text-[#191A26] font-bold tracking-tight',
  ghost: 'text-[#191A26] dark:text-[#FAF8F5] font-bold',
  danger: 'text-white font-bold tracking-tight',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-[42px] px-4 py-2 rounded-pill',
  md: 'min-h-[48px] px-5 py-3 rounded-pill',
  lg: 'min-h-[54px] px-6 py-3.5 rounded-pill',
};

const sizeTextClasses: Record<ButtonSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  haptic = true,
  disabled,
  onPress,
  accessibilityLabel,
  className = '',
  ...props
}: ButtonProps) {
  const isDisabled = Boolean(disabled || loading);

  const handlePress = (event: GestureResponderEvent) => {
    if (isDisabled) {
      return;
    }
    if (haptic && Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPress?.(event);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={handlePress}
      className={`flex-row items-center justify-center transition-opacity duration-150 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4A97B] ${variantContainerClasses[variant]} ${sizeClasses[size]} ${
        isDisabled ? 'opacity-50' : ''
      } ${className}`.trim()}
      {...props}>
      {loading ? (
        <View className="mr-2">
          <ActivityIndicator
            size="small"
            color={
              variant === 'secondary' || variant === 'charcoal' || variant === 'danger'
                ? '#FFFFFF'
                : '#191A26'
            }
          />
        </View>
      ) : null}
      <Text className={`${variantTextClasses[variant]} ${sizeTextClasses[size]}`}>
        {label}
      </Text>
    </Pressable>
  );
}
