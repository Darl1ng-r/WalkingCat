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
  return (
    <View
      className={`flex-row rounded-2xl bg-[#ECEEF5] p-1 dark:bg-surface-elevated-dark ${className}`.trim()}>
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(opt.key)}
            className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-2.5 px-3 ${
              active ? 'bg-charcoal shadow-sm dark:bg-primary' : 'bg-transparent'
            }`}>
            <Text
              variant="caption"
              className={`text-xs font-bold ${
                active
                  ? 'text-white'
                  : 'text-muted dark:text-muted-dark'
              }`}>
              {opt.label}
            </Text>
            {opt.badge && opt.badge > 0 ? (
              <View
                className={`rounded-pill px-1.5 py-0.5 ${
                  active ? 'bg-coral' : 'bg-coral/20'
                }`}>
                <Text
                  variant="caption"
                  className={`text-[10px] font-extrabold ${
                    active ? 'text-white' : 'text-coral-dark'
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
