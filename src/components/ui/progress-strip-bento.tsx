import { Pressable, View } from 'react-native';

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

export function ProgressStripBento({
  title = 'MY PROGRESS',
  metrics,
}: ProgressStripBentoProps) {
  // Styled after the reference image's 3-pill attribute row ("Черный | 10 месяцев | 14 кг" & warm peach progress pills)
  return (
    <View className="gap-2">
      {title ? (
        <Text
          variant="label"
          className="px-1 text-xs font-extrabold uppercase tracking-wider text-[#191A26] dark:text-[#FAF8F5]">
          {title}
        </Text>
      ) : null}

      <View className="flex-row items-center justify-between gap-2.5">
        {metrics.map((m) => {
          const pct = Math.min(
            100,
            Math.max(12, Math.round((m.current / Math.max(1, m.target)) * 100))
          );
          const formatted = m.displayValue ?? `${m.current}/${m.target}`;
          const isDark = m.color === 'secondary';
          const isPeach = m.color === 'coral';

          const content = (
            <View
              className={`items-center justify-between rounded-pill border-[1.5px] border-[#191A26] px-3 py-2.5 ${
                isDark
                  ? 'bg-[#191A26]'
                  : isPeach
                    ? 'bg-[#FCE8D5]'
                    : 'bg-white'
              }`}>
              <View className="flex-row items-center gap-1">
                <Text className="text-xs">{m.icon}</Text>
                <Text
                  numberOfLines={1}
                  className={`text-xs font-extrabold ${
                    isDark ? 'text-white' : 'text-[#191A26]'
                  }`}>
                  {formatted}
                </Text>
              </View>

              <Text
                numberOfLines={1}
                className={`mt-0.5 text-[10px] font-semibold ${
                  isDark ? 'text-[#F4A97B]' : 'text-[#6E7085]'
                }`}>
                {m.label}
              </Text>

              {/* Slim progress bar inside the pill */}
              <View
                className={`mt-1.5 h-1.5 w-full overflow-hidden rounded-pill ${
                  isDark ? 'bg-white/20' : 'bg-[#191A26]/12'
                }`}>
                <View
                  style={{ width: `${pct}%` }}
                  className={`h-full rounded-pill ${
                    isDark ? 'bg-[#F4A97B]' : 'bg-[#191A26]'
                  }`}
                />
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
      </View>
    </View>
  );
}
