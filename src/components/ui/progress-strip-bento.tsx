import { Pressable, View } from 'react-native';

import { Card } from './card';
import { Text } from './text';

export interface ProgressStripMetric {
  id: string;
  label: string;
  current: number;
  target: number;
  displayValue?: string;
  color: 'coral' | 'primary' | 'secondary';
  icon: string;
  onPress?: () => void;
}

export interface ProgressStripBentoProps {
  title?: string;
  metrics: readonly ProgressStripMetric[];
}

const barFillClasses: Record<ProgressStripMetric['color'], string> = {
  coral: 'bg-coral',
  primary: 'bg-primary',
  secondary: 'bg-secondary',
};

const iconBgClasses: Record<ProgressStripMetric['color'], string> = {
  coral: 'bg-coral/20',
  primary: 'bg-primary/20',
  secondary: 'bg-secondary/20',
};

export function ProgressStripBento({
  title = 'MY PROGRESS',
  metrics,
}: ProgressStripBentoProps) {
  return (
    <View className="gap-2">
      {title ? (
        <Text
          variant="label"
          className="px-1 text-xs font-bold uppercase tracking-wider text-muted dark:text-muted-dark">
          {title}
        </Text>
      ) : null}

      <Card className="flex-row items-center justify-between gap-3.5 p-4">
        {metrics.map((m) => {
          const pct = Math.min(
            100,
            Math.max(8, Math.round((m.current / Math.max(1, m.target)) * 100))
          );
          const formatted =
            m.displayValue ?? `${m.current}/${m.target}`;

          const content = (
            <View className="flex-1 gap-2">
              {/* Progress Track */}
              <View className="h-3 w-full overflow-hidden rounded-pill bg-[#EEF0F6] dark:bg-surface-elevated-dark">
                <View
                  style={{ width: `${pct}%` }}
                  className={`h-full rounded-pill ${barFillClasses[m.color]}`}
                />
              </View>

              {/* Icon + Value Counter */}
              <View className="flex-row items-center gap-1.5">
                <View
                  className={`h-5 w-5 items-center justify-center rounded-pill ${iconBgClasses[m.color]}`}>
                  <Text className="text-[11px]">{m.icon}</Text>
                </View>
                <Text
                  variant="caption"
                  numberOfLines={1}
                  className="text-xs font-bold text-foreground dark:text-foreground-dark">
                  {formatted}
                </Text>
              </View>
            </View>
          );

          if (m.onPress) {
            return (
              <Pressable
                key={m.id}
                accessibilityRole="button"
                accessibilityLabel={`${m.label}: ${formatted}`}
                onPress={m.onPress}
                className="flex-1 active:opacity-80">
                {content}
              </Pressable>
            );
          }

          return (
            <View key={m.id} className="flex-1">
              {content}
            </View>
          );
        })}
      </Card>
    </View>
  );
}
