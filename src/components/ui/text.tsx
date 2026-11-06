import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

export type TextVariant = 'title' | 'heading' | 'body' | 'caption' | 'label';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  className?: string;
}

const variantClasses: Record<TextVariant, string> = {
  title: 'text-3xl font-bold tracking-tight text-foreground dark:text-foreground-dark',
  heading: 'text-xl font-semibold text-foreground dark:text-foreground-dark',
  body: 'text-base text-foreground dark:text-foreground-dark',
  caption: 'text-sm text-muted dark:text-muted-dark',
  label: 'text-xs font-semibold uppercase tracking-wider text-muted dark:text-muted-dark',
};

export function Text({ variant = 'body', className = '', ...props }: TextProps) {
  const combinedClassName = `${variantClasses[variant]} ${className}`.trim();

  return <RNText allowFontScaling className={combinedClassName} {...props} />;
}
