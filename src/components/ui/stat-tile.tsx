import { View, type ViewProps } from 'react-native';

import { Card } from './card';
import { Text } from './text';

export interface StatTileProps extends ViewProps {
  label: string;
  value: string;
  unit?: string;
  className?: string;
}

export function StatTile({ label, value, unit, className = '', ...props }: StatTileProps) {
  return (
    <Card
      accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ''}`}
      className={`flex-1 items-start justify-between ${className}`.trim()}
      {...props}>
      <Text variant="label" className="mb-1">
        {label}
      </Text>
      <View className="flex-row items-baseline gap-1">
        <Text variant="title" className="text-2xl">
          {value}
        </Text>
        {unit ? <Text variant="caption">{unit}</Text> : null}
      </View>
    </Card>
  );
}
