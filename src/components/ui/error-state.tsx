import { View, type ViewProps } from 'react-native';

import { Button } from './button';
import { Card } from './card';
import { Text } from './text';

export interface ErrorStateProps extends ViewProps {
  title?: string;
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  retryLabel = 'Try again',
  onRetry,
  className = '',
  ...props
}: ErrorStateProps) {
  return (
    <Card
      className={`items-center justify-center border-danger/30 p-6 ${className}`.trim()}
      {...props}>
      <View className="mb-3 h-12 w-12 items-center justify-center rounded-pill bg-danger-muted">
        <Text className="text-xl">⚠️</Text>
      </View>
      <Text variant="heading" className="mb-1 text-center">
        {title}
      </Text>
      <Text variant="caption" className="mb-4 text-center">
        {message}
      </Text>
      {onRetry ? (
        <Button label={retryLabel} onPress={onRetry} variant="secondary" size="sm" />
      ) : null}
    </Card>
  );
}
