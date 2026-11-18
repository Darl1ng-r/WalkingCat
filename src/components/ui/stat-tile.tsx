import { View, type ViewProps } from 'react-native';

import { AppIcon, Text } from './text';

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
          className={`flex-1 text-xs font-semibold ${
            isWarmCard ? 'text-[#191A26]' : 'text-white/90'
          }`}>
          {label}
        </Text>
        {icon ? (
          <AppIcon
            name={icon}
            size={14}
            color={isWarmCard ? '#191A26' : '#F4A97B'}
          />
        ) : (
          <View
            className={`h-2 w-2 rounded-pill ${
              isWarmCard ? 'bg-[#191A26]' : 'bg-[#F4A97B]'
            }`}
          />
        )}
      </View>

      {/* Subtle dotted wave accent */}
      <View className="my-1.5 flex-row items-center justify-between opacity-30">
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
          className={`font-display text-lg font-bold tracking-tight ${
            isWarmCard ? 'text-[#191A26]' : 'text-white'
          }`}>
          {value}
        </Text>
        {unit ? (
          <Text
            numberOfLines={1}
            className={`text-[11px] font-semibold ${
              isWarmCard ? 'text-[#191A26]/75' : 'text-[#F4A97B]'
            }`}>
            {unit}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
