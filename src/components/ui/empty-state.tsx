import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { View, type ViewProps } from 'react-native';

import { BrandColors } from '@/constants/theme';

import { Button } from './button';
import { Card } from './card';
import { AppIcon, Text } from './text';

export interface EmptyStateProps extends ViewProps {
  icon?: SymbolViewProps['name'];
  emoji?: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  emoji = 'paw',
  title,
  message,
  actionLabel,
  onAction,
  className = '',
  ...props
}: EmptyStateProps) {
  return (
    <Card
      className={`items-center justify-center p-6 ${className}`.trim()}
      {...props}>
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-pill border-[1.5px] border-[#191A26] bg-[#FCE8D5]">
        {icon ? (
          <SymbolView name={icon} size={28} tintColor={BrandColors.primaryDark} />
        ) : (
          <AppIcon name={emoji} size={28} color="#191A26" />
        )}
      </View>
      <Text variant="heading" className="mb-2 text-center">
        {title}
      </Text>
      <Text variant="caption" className="mb-4 text-center leading-5">
        {message}
      </Text>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="primary" size="md" />
      ) : null}
    </Card>
  );
}
