import { Pressable, View } from 'react-native';

import { Text } from './text';

export interface SegmentedOption<T extends string> {
  key: T;
  label: string;
  badge?: number;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (next: T) => void;
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className = '',
}: SegmentedControlProps<T>) {
  // Styled directly after the "Календарь | Трекеры" pill switcher in the reference image
  return (
    <View
      className={`flex-row rounded-pill border-[1.5px] border-[#191A26] bg-white p-0.5 dark:border-[#FAF8F5]/40 dark:bg-[#232536] ${className}`.trim()}>
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(opt.key)}
            className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-pill px-3 py-2 ${
              active ? 'bg-[#191A26] dark:bg-[#F4A97B]' : 'bg-transparent'
            }`}>
            <Text
              variant="caption"
              numberOfLines={1}
              className={`text-xs font-extrabold ${
                active
                  ? 'text-white dark:text-[#191A26]'
                  : 'text-[#191A26] dark:text-[#FAF8F5]'
              }`}>
              {opt.label}
            </Text>
            {opt.badge && opt.badge > 0 ? (
              <View
                className={`rounded-pill px-1.5 py-0.5 ${
                  active ? 'bg-[#F4A97B] dark:bg-[#191A26]' : 'bg-[#FCE8D5]'
                }`}>
                <Text
                  variant="caption"
                  className={`text-[10px] font-extrabold ${
                    active ? 'text-[#191A26] dark:text-white' : 'text-[#191A26]'
                  }`}>
                  {opt.badge}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
