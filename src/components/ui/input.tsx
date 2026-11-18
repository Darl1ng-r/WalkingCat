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
    : 'border-[#191A26] dark:border-[#FAF8F5]/40 focus:border-[#F4A97B]';

  return (
    <View className={`w-full ${containerClassName}`.trim()}>
      {label ? (
        <Text variant="label" className="mb-1.5 px-1 text-[#191A26] dark:text-[#FAF8F5]">
          {label}
        </Text>
      ) : null}
      <RNTextInput
        accessibilityLabel={accessibilityLabel ?? label}
        placeholderTextColor="#8C8E9E"
        className={`min-h-[48px] rounded-pill border-[1.5px] bg-white px-5 py-3 text-sm font-medium text-[#191A26] dark:bg-[#232536] dark:text-[#FAF8F5] ${borderClass} ${className}`.trim()}
        {...props}
      />
      {error ? (
        <Text variant="caption" className="mt-1 px-2 text-danger dark:text-danger-light">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" className="mt-1 px-2">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
