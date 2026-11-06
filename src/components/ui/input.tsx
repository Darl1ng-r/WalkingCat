import { TextInput as RNTextInput, type TextInputProps as RNTextInputProps, View } from 'react-native';

import { Text } from './text';

export interface InputProps extends RNTextInputProps {
  label?: string;
  hint?: string;
  error?: string;
  containerClassName?: string;
  className?: string;
}

export function Input({
  label,
  hint,
  error,
  containerClassName = '',
  className = '',
  accessibilityLabel,
  ...props
}: InputProps) {
  const borderClass = error
    ? 'border-danger dark:border-danger-light'
    : 'border-border dark:border-border-dark focus:border-primary';

  return (
    <View className={`w-full ${containerClassName}`.trim()}>
      {label ? (
        <Text variant="label" className="mb-1.5">
          {label}
        </Text>
      ) : null}
      <RNTextInput
        accessibilityLabel={accessibilityLabel ?? label}
        placeholderTextColor="#94A3B8"
        className={`min-h-[48px] rounded-button border bg-surface px-4 py-3 text-base text-foreground dark:bg-surface-dark dark:text-foreground-dark ${borderClass} ${className}`.trim()}
        {...props}
      />
      {error ? (
        <Text variant="caption" className="mt-1 text-danger dark:text-danger-light">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" className="mt-1">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
