import { View, type ViewProps } from 'react-native';

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
  // Styled after the reference image's "Динамика" dark midnight-ink stat tiles with dotted wave curve & warm peach accent
  const isWarmCard = accentColor === 'coral';

  return (
    <View
      accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ''}`}
      className={`flex-1 justify-between overflow-hidden rounded-card border-[1.5px] border-[#191A26] p-3.5 ${
        isWarmCard ? 'bg-[#FCE8D5]' : 'bg-[#191A26]'
      } ${className}`.trim()}
      {...props}>
      <View className="flex-row items-center justify-between gap-1.5">
        <Text
          numberOfLines={1}
          className={`flex-1 text-[11px] font-bold ${
            isWarmCard ? 'text-[#191A26]' : 'text-white/90'
          }`}>
          {label}
        </Text>
        {icon ? (
          <Text className="text-xs">{icon}</Text>
        ) : (
          <View
            className={`h-2 w-2 rounded-pill ${
              isWarmCard ? 'bg-[#191A26]' : 'bg-[#F4A97B]'
            }`}
          />
        )}
      </View>

      {/* Decorative dotted curve line from the "Динамика" cards in the reference */}
      <View className="my-2 flex-row items-center justify-between opacity-45">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((idx) => (
          <View
            key={idx}
            style={{
              marginTop: idx % 3 === 0 ? -3 : idx % 2 === 0 ? 3 : 0,
            }}
            className={`h-1 w-1.5 rounded-pill ${
              isWarmCard ? 'bg-[#191A26]' : idx === 6 ? 'bg-[#F4A97B]' : 'bg-white'
            }`}
          />
        ))}
      </View>

      <View className="flex-row items-baseline gap-1">
        <Text
          className={`text-lg font-extrabold tracking-tight ${
            isWarmCard ? 'text-[#191A26]' : 'text-white'
          }`}>
          {value}
        </Text>
        {unit ? (
          <Text
            numberOfLines={1}
            className={`text-[10px] font-semibold ${
              isWarmCard ? 'text-[#191A26]/75' : 'text-[#F4A97B]'
            }`}>
            {unit}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
