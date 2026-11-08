import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

import { Card } from './card';
import { Text } from './text';

export interface PodiumEntry {
  rank: number;
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  value: number;
  formattedValue: string;
  isSelf?: boolean;
}

export interface LeaguePodiumProps {
  entries: readonly PodiumEntry[];
  periodLabel: string;
  onTogglePeriod?: () => void;
  onPressUser?: (userId: string, isSelf?: boolean) => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function LeaguePodium({
  entries,
  periodLabel,
  onTogglePeriod,
  onPressUser,
}: LeaguePodiumProps) {
  const first = entries.find((e) => e.rank === 1) ?? entries[0];
  const second = entries.find((e) => e.rank === 2) ?? entries[1];
  const third = entries.find((e) => e.rank === 3) ?? entries[2];

  // Ordered left-to-right: #2 (Coral), #1 (Tall Purple), #3 (Coral)
  const columns = [
    { spot: 2, entry: second, height: 112, bgClass: 'bg-coral' },
    { spot: 1, entry: first, height: 148, bgClass: 'bg-primary' },
    { spot: 3, entry: third, height: 96, bgClass: 'bg-coral' },
  ];

  return (
    <Card className="overflow-hidden px-4 pb-0 pt-4">
      {/* Top right period selector pill ("This Week ⌄") */}
      <View className="flex-row items-center justify-between">
        <Text variant="label" className="text-xs text-muted dark:text-muted-dark">
          TOP WALKERS
        </Text>
        {onTogglePeriod ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Switch period from ${periodLabel}`}
            onPress={onTogglePeriod}
            className="flex-row items-center gap-1 rounded-pill bg-[#F1F3F8] px-3 py-1.5 dark:bg-surface-elevated-dark">
            <Text
              variant="caption"
              className="text-xs font-bold text-foreground dark:text-foreground-dark">
              {periodLabel} ▾
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* Podium Columns */}
      <View className="mt-3 flex-row items-end justify-center gap-3">
        {columns.map(({ spot, entry, height, bgClass }) => {
          if (!entry) {
            return <View key={spot} className="flex-1" />;
          }

          return (
            <Pressable
              key={spot}
              accessibilityRole="button"
              accessibilityLabel={`Rank ${spot}: ${entry.displayName}, ${entry.formattedValue}`}
              onPress={() => onPressUser?.(entry.userId, entry.isSelf)}
              className="flex-1 items-center">
              {/* Circular Avatar above pillar */}
              <View
                className={`mb-1.5 h-14 w-14 items-center justify-center overflow-hidden rounded-pill border-2 ${
                  spot === 1
                    ? 'border-primary bg-primary-muted'
                    : 'border-coral bg-coral-muted'
                }`}>
                {entry.avatarUrl ? (
                  <Image
                    source={{ uri: entry.avatarUrl }}
                    style={{ width: 56, height: 56 }}
                    contentFit="cover"
                  />
                ) : (
                  <Text variant="body" className="font-extrabold text-primary-dark">
                    {getInitials(entry.displayName)}
                  </Text>
                )}
              </View>

              {/* Walker Name */}
              <Text
                variant="caption"
                numberOfLines={1}
                className="mb-2 text-center text-xs font-bold text-foreground dark:text-foreground-dark">
                {entry.displayName}
              </Text>

              {/* Pillar Block */}
              <View
                style={{ height }}
                className={`w-full items-center justify-between rounded-t-3xl pb-3 pt-2.5 ${bgClass}`}>
                {/* Score Pill floating at top of pillar */}
                <View className="items-center rounded-2xl bg-white px-2.5 py-1 shadow-sm">
                  <Text className="text-[10px]">⭐</Text>
                  <Text
                    variant="caption"
                    className="text-[11px] font-extrabold text-[#141720]">
                    {Math.round(entry.value).toLocaleString()}
                  </Text>
                </View>

                {/* Giant Rank Number */}
                <Text className="text-4xl font-black text-white">{spot}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}
