import { View, type ViewProps } from 'react-native';

export interface CardProps extends ViewProps {
  className?: string;
  elevated?: boolean;
  glass?: boolean;
}

const CUSTOM_PAD_RE = /(?:^|\s)p[xytrbl]?-(?:\d+|\[\d+px\])(?=\s|$)/;
const CUSTOM_BG_RE = /(?:^|\s)bg-[^\s]+/;

export function Card({
  className = '',
  elevated = false,
  glass = false,
  ...props
}: CardProps) {
  const defaultBg = glass
    ? 'bg-white/95 dark:bg-[#191A26]/95'
    : elevated
      ? 'bg-[#FCE8D5] dark:bg-[#232536]'
      : 'bg-white dark:bg-[#191A26]';

  const bgPart = CUSTOM_BG_RE.test(className) && !elevated && !glass ? '' : defaultBg;
  const padPart = CUSTOM_PAD_RE.test(className) ? '' : 'p-4';

  return (
    <View
      className={`rounded-card border-[1.5px] border-[#191A26] dark:border-[#35384F] ${padPart} ${bgPart} ${className}`.trim()}
      {...props}
    />
  );
}
