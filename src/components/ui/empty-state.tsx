import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { View, type ViewProps } from 'react-native';

import { BrandColors } from '@/constants/theme';

import { Button } from './button';
import { Card } from './card';
import { Text } from './text';

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
  emoji = '🐾',
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
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-pill bg-primary-muted dark:bg-surface-elevated-dark">
        {icon ? (
          <SymbolView name={icon} size={30} tintColor={BrandColors.primary} />
        ) : (
          <Text className="text-3xl">{emoji}</Text>
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
