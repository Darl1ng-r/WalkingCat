import { View, type ViewProps } from 'react-native';

import { Card } from './card';
import { Text } from './text';

export interface StatTileProps extends ViewProps {
  label: string;
  value: string;
  unit?: string;
  icon?: string;
  accentColor?: 'primary' | 'secondary' | 'coral';
  className?: string;
}

export function StatTile({
  label,
  value,
  unit,
  icon,
  accentColor,
  className = '',
  ...props
}: StatTileProps) {
  const dotColor =
    accentColor === 'secondary'
      ? 'bg-secondary'
      : accentColor === 'coral'
        ? 'bg-coral'
        : 'bg-primary';

  return (
    <Card
      accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ''}`}
      className={`flex-1 items-start justify-between p-4 ${className}`.trim()}
      {...props}>
      <View className="mb-1.5 flex-row items-center gap-1.5">
        {icon ? (
          <Text className="text-sm">{icon}</Text>
        ) : (
          <View className={`h-2 w-2 rounded-pill ${dotColor}`} />
        )}
        <Text variant="label" className="text-[11px] uppercase tracking-wider">
          {label}
        </Text>
      </View>
      <View className="flex-row items-baseline gap-1">
        <Text variant="title" className="text-2xl font-extrabold tracking-tight">
          {value}
        </Text>
        {unit ? (
          <Text variant="caption" className="text-xs font-medium">
            {unit}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}
