import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

export type TextVariant = 'title' | 'heading' | 'body' | 'caption' | 'label';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  className?: string;
}

const variantSizeClasses: Record<TextVariant, string> = {
  title: 'text-3xl tracking-tight',
  heading: 'text-xl tracking-tight',
  body: 'text-base',
  caption: 'text-sm',
  label: 'text-xs uppercase tracking-wider',
};

const variantWeightClasses: Record<TextVariant, string> = {
  title: 'font-extrabold',
  heading: 'font-bold',
  body: 'font-normal',
  caption: 'font-normal',
  label: 'font-bold',
};

const variantColorClasses: Record<TextVariant, string> = {
  title: 'text-[#191A26] dark:text-[#FAF8F5]',
  heading: 'text-[#191A26] dark:text-[#FAF8F5]',
  body: 'text-[#191A26] dark:text-[#FAF8F5]',
  caption: 'text-[#6E7085] dark:text-[#9EA1B8]',
  label: 'text-[#6E7085] dark:text-[#9EA1B8]',
};

const CUSTOM_SIZE_RE =
  /(?:^|\s)text-(?:xs|sm|base|lg|xl|[2-9]xl|\[\d+px\])(?=\s|$)/;
const CUSTOM_WEIGHT_RE =
  /(?:^|\s)font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black)(?=\s|$)/;
const CUSTOM_COLOR_RE =
  /(?:^|\s)text-(?:white|black|transparent|current|primary|secondary|coral|charcoal|foreground|muted|danger|surface|background|text-|\[#[^\]]+\])/;

export function Text({ variant = 'body', className = '', ...props }: TextProps) {
  const sizePart = CUSTOM_SIZE_RE.test(className) ? '' : variantSizeClasses[variant];
  const weightPart = CUSTOM_WEIGHT_RE.test(className)
    ? ''
    : variantWeightClasses[variant];
  const colorPart = CUSTOM_COLOR_RE.test(className)
    ? ''
    : variantColorClasses[variant];

  const combinedClassName = [sizePart, weightPart, colorPart, className]
    .filter(Boolean)
    .join(' ')
    .trim();

  return <RNText allowFontScaling className={combinedClassName} {...props} />;
}
