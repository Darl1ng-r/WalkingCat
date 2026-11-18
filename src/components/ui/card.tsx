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
    ? 'bg-white/95 dark:bg-[#191A26]/95 border-[#191A26] dark:border-[#35384F]'
    : elevated
      ? 'bg-[#FCE8D5] dark:bg-[#232536] border-[#191A26] dark:border-[#35384F]'
      : 'bg-white dark:bg-[#191A26] border-[#191A26] dark:border-[#35384F]';

  return (
    <View
      className={`rounded-card border-[1.5px] p-4 ${bgClass} ${className}`.trim()}
      {...props}
    />
  );
}
