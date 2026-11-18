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

  // Ordered left-to-right: #2 (Warm Peach #F4A97B), #1 (Tall Midnight Ink #191A26), #3 (Warm Cream #FCE8D5)
  const columns = [
    {
      spot: 2,
      entry: second,
      height: 108,
      bgClass: 'bg-[#F4A97B] border-[1.5px] border-[#191A26]',
      numClass: 'text-[#191A26]',
    },
    {
      spot: 1,
      entry: first,
      height: 144,
      bgClass: 'bg-[#191A26] border-[1.5px] border-[#191A26]',
      numClass: 'text-white',
    },
    {
      spot: 3,
      entry: third,
      height: 94,
      bgClass: 'bg-[#FCE8D5] border-[1.5px] border-[#191A26]',
      numClass: 'text-[#191A26]',
    },
  ];

  return (
    <Card className="overflow-hidden px-4 pb-0 pt-4">
      <View className="flex-row items-center justify-between">
        <Text variant="label" className="text-xs font-extrabold text-[#191A26] dark:text-[#FAF8F5]">
          TOP WALKERS
        </Text>
        {onTogglePeriod ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Switch period from ${periodLabel}`}
            onPress={onTogglePeriod}
            className="flex-row items-center gap-1 rounded-pill border-[1.5px] border-[#191A26] bg-[#FCE8D5] px-3 py-1">
            <Text variant="caption" className="text-xs font-extrabold text-[#191A26]">
              {periodLabel} ▾
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* Podium Columns */}
      <View className="mt-3 flex-row items-end justify-center gap-3">
        {columns.map(({ spot, entry, height, bgClass, numClass }) => {
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
              {/* Circular Avatar with crisp #191A26 ink ring */}
              <View className="mb-1.5 h-14 w-14 items-center justify-center overflow-hidden rounded-pill border-2 border-[#191A26] bg-white">
                {entry.avatarUrl ? (
                  <Image
                    source={{ uri: entry.avatarUrl }}
                    style={{ width: 56, height: 56 }}
                    contentFit="cover"
                  />
                ) : (
                  <Text variant="body" className="font-extrabold text-[#191A26]">
                    {getInitials(entry.displayName)}
                  </Text>
                )}
              </View>

              {/* Walker Name */}
              <Text
                variant="caption"
                numberOfLines={1}
                className="mb-2 text-center text-xs font-extrabold text-[#191A26] dark:text-[#FAF8F5]">
                {entry.displayName}
              </Text>

              {/* Pillar Block */}
              <View
                style={{ height }}
                className={`w-full items-center justify-between rounded-t-3xl border-b-0 pb-3 pt-2.5 ${bgClass}`}>
                <View className="items-center rounded-pill border border-[#191A26] bg-white px-2.5 py-0.5">
                  <Text
                    variant="caption"
                    className="text-[10px] font-extrabold text-[#191A26]">
                    {Math.round(entry.value).toLocaleString()}
                  </Text>
                </View>

                <Text className={`text-3xl font-black ${numClass}`}>{spot}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}
