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

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
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
  primary: 'bg-primary active:bg-primary-dark',
  secondary: 'bg-secondary active:bg-secondary-dark',
  ghost: 'bg-transparent border border-border dark:border-border-dark active:bg-surface-elevated dark:active:bg-surface-elevated-dark',
  danger: 'bg-danger active:opacity-90',
};

const variantTextClasses: Record<ButtonVariant, string> = {
  primary: 'text-white font-semibold',
  secondary: 'text-white font-semibold',
  ghost: 'text-foreground dark:text-foreground-dark font-semibold',
  danger: 'text-white font-semibold',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-[44px] px-3 py-2 rounded-button',
  md: 'min-h-[48px] px-5 py-3 rounded-button',
  lg: 'min-h-[54px] px-6 py-4 rounded-card',
};

const sizeTextClasses: Record<ButtonSize, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
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
      className={`flex-row items-center justify-center ${variantContainerClasses[variant]} ${sizeClasses[size]} ${
        isDisabled ? 'opacity-50' : ''
      } ${className}`.trim()}
      {...props}>
      {loading ? (
        <View className="mr-2">
          <ActivityIndicator
            size="small"
            color={variant === 'ghost' ? '#64748B' : '#FFFFFF'}
          />
        </View>
      ) : null}
      <Text className={`${variantTextClasses[variant]} ${sizeTextClasses[size]}`}>
        {label}
      </Text>
    </Pressable>
  );
}
