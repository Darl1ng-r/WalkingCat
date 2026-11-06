import { View, type ViewProps } from 'react-native';

export interface CardProps extends ViewProps {
  className?: string;
  elevated?: boolean;
}

export function Card({ className = '', elevated = false, ...props }: CardProps) {
  const bgClass = elevated
    ? 'bg-surface-elevated dark:bg-surface-elevated-dark'
    : 'bg-surface dark:bg-surface-dark';

  return (
    <View
      className={`rounded-card border border-border dark:border-border-dark p-4 ${bgClass} ${className}`.trim()}
      {...props}
    />
  );
}
