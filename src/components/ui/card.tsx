import { View, type ViewProps } from 'react-native';

export interface CardProps extends ViewProps {
  className?: string;
  elevated?: boolean;
  glass?: boolean;
}

export function Card({
  className = '',
  elevated = false,
  glass = false,
  ...props
}: CardProps) {
  const bgClass = glass
    ? 'bg-white/80 dark:bg-surface-dark/80 backdrop-blur-xl border-white/50 dark:border-white/10 shadow-sm'
    : elevated
      ? 'bg-surface-elevated dark:bg-surface-elevated-dark border-border/80 dark:border-border-dark'
      : 'bg-surface dark:bg-surface-dark border-border/80 dark:border-border-dark shadow-sm';

  return (
    <View
      className={`rounded-bento border p-4.5 ${bgClass} ${className}`.trim()}
      {...props}
    />
  );
}
