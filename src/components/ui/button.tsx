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
  primary: 'bg-primary active:bg-primary-dark shadow-sm',
  secondary: 'bg-secondary active:bg-secondary-dark shadow-sm',
  action: 'bg-secondary active:bg-secondary-dark shadow-sm',
  charcoal: 'bg-charcoal active:bg-charcoal-light dark:bg-white dark:active:bg-white/90 shadow-sm',
  ghost:
    'bg-surface-elevated/80 dark:bg-surface-elevated-dark border border-border dark:border-border-dark active:opacity-80',
  danger: 'bg-danger active:opacity-90 shadow-sm',
};

const variantTextClasses: Record<ButtonVariant, string> = {
  primary: 'text-white font-bold tracking-tight',
  secondary: 'text-white font-bold tracking-tight',
  action: 'text-white font-bold tracking-tight',
  charcoal: 'text-white dark:text-charcoal font-bold tracking-tight',
  ghost: 'text-foreground dark:text-foreground-dark font-semibold',
  danger: 'text-white font-bold tracking-tight',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-[40px] px-4 py-2 rounded-pill',
  md: 'min-h-[48px] px-5 py-3 rounded-pill',
  lg: 'min-h-[56px] px-6 py-4 rounded-pill',
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
