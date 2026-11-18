import { Image } from 'expo-image';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

export type TextVariant = 'title' | 'heading' | 'body' | 'caption' | 'label';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  className?: string;
}

const variantSizeClasses: Record<TextVariant, string> = {
  title: 'font-display text-2xl leading-8 tracking-tight',
  heading: 'font-display text-lg leading-6 tracking-tight',
  body: 'font-sans text-sm leading-5',
  caption: 'font-sans text-xs leading-4',
  label: 'font-sans text-xs leading-4 tracking-tight',
};

const variantWeightClasses: Record<TextVariant, string> = {
  title: 'font-bold',
  heading: 'font-bold',
  body: 'font-medium',
  caption: 'font-medium',
  label: 'font-bold',
};

const variantColorClasses: Record<TextVariant, string> = {
  title: 'text-[#191A26] dark:text-[#FAF8F5]',
  heading: 'text-[#191A26] dark:text-[#FAF8F5]',
  body: 'text-[#191A26] dark:text-[#FAF8F5]',
  caption: 'text-[#6E7085] dark:text-[#9EA1B8]',
  label: 'text-[#191A26] dark:text-[#FAF8F5]',
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

export type AppIconName =
  | 'paw'
  | 'cat'
  | 'camera'
  | 'sparkles'
  | 'palette'
  | 'award'
  | 'trophy'
  | 'gem'
  | 'shield'
  | 'target'
  | 'walk'
  | 'chart'
  | 'pin'
  | 'lock'
  | 'settings'
  | 'heart'
  | 'mail'
  | 'flame'
  | 'cards'
  | 'sun'
  | 'edit'
  | 'share'
  | 'link'
  | 'clock'
  | 'signal'
  | 'warning'
  | 'check'
  | 'clap'
  | 'search'
  | 'navigation'
  | 'chevronLeft'
  | 'chevronRight'
  | 'chevronDown'
  | 'moreVertical';

const EMOJI_TO_ICON_MAP: Record<string, AppIconName> = {
  '🐾': 'paw',
  '🐱': 'cat',
  '😺': 'cat',
  '😸': 'cat',
  '📷': 'camera',
  '✨': 'sparkles',
  '🌟': 'sparkles',
  '⭐': 'sparkles',
  '🎨': 'palette',
  '🏅': 'award',
  '🥇': 'award',
  '🥈': 'award',
  '🥉': 'award',
  '🏆': 'trophy',
  '👑': 'trophy',
  '💎': 'gem',
  '🛡️': 'shield',
  '🛡': 'shield',
  '🎯': 'target',
  '🥾': 'walk',
  '👟': 'walk',
  '👣': 'walk',
  '📊': 'chart',
  '📍': 'pin',
  '🗺️': 'pin',
  '🗺': 'pin',
  '🧭': 'navigation',
  '🔒': 'lock',
  '👀': 'lock',
  '👁️': 'lock',
  '⚙️': 'settings',
  '⚙': 'settings',
  '❤️': 'heart',
  '❤': 'heart',
  '💌': 'mail',
  '📬': 'mail',
  '🔥': 'flame',
  '🃏': 'cards',
  '☀️': 'sun',
  '☀': 'sun',
  '🌿': 'sun',
  '🏡': 'sun',
  '✏️': 'edit',
  '✏': 'edit',
  '🤝': 'share',
  '🔗': 'link',
  '🕒': 'clock',
  '📅': 'clock',
  '📡': 'signal',
  '⚡': 'signal',
  '⚠️': 'warning',
  '⚠': 'warning',
  '✓': 'check',
  '🎉': 'check',
  '👏': 'clap',
  '🔍': 'search',
  '🔭': 'search',
  '➤': 'navigation',
};

export function resolveIconName(input?: string | null): AppIconName {
  if (!input) return 'paw';
  const trimmed = input.trim();
  if (trimmed in EMOJI_TO_ICON_MAP) {
    return EMOJI_TO_ICON_MAP[trimmed];
  }
  return (trimmed as AppIconName) || 'paw';
}

function buildVectorIconSvg(name: AppIconName, color: string): string {
  const s = `stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
  let paths = '';

  switch (name) {
    case 'paw':
      paths = `<circle cx="7" cy="9" r="2" fill="${color}" />
        <circle cx="12" cy="7" r="2" fill="${color}" />
        <circle cx="17" cy="9" r="2" fill="${color}" />
        <path d="M12 12c-3 0-5 2.2-5 4.5 0 1.5 1.3 2.5 3 2.5.8 0 1.4-.3 2-.3s1.2.3 2 .3c1.7 0 3-1 3-2.5 0-2.3-2-4.5-5-4.5Z" fill="${color}" />`;
      break;
    case 'cat':
      paths = `<path d="M5 11 L6.5 4.5 L10.5 8 H13.5 L17.5 4.5 L19 11 C19.8 12.2 20 13.5 20 15 C20 18.3 16.4 20.5 12 20.5 C7.6 20.5 4 18.3 4 15 C4 13.5 4.2 12.2 5 11 Z" ${s} />
        <circle cx="9.2" cy="14" r="1.3" fill="${color}" />
        <circle cx="14.8" cy="14" r="1.3" fill="${color}" />`;
      break;
    case 'camera':
      paths = `<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" ${s} />
        <circle cx="12" cy="13" r="3.5" ${s} />`;
      break;
    case 'sparkles':
      paths = `<path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2L12 3z" ${s} />`;
      break;
    case 'palette':
      paths = `<circle cx="12" cy="12" r="9" ${s} />
        <circle cx="8.5" cy="10.5" r="1.2" fill="${color}" />
        <circle cx="12" cy="7.5" r="1.2" fill="${color}" />
        <circle cx="15.5" cy="10.5" r="1.2" fill="${color}" />
        <path d="M12 16.5c2 0 3.5-1.2 3.5-2.5 0-1-.8-1.5-1.8-1.5h-3.4c-1 0-1.8.5-1.8 1.5 0 1.3 1.5 2.5 3.5 2.5z" ${s} />`;
      break;
    case 'award':
      paths = `<circle cx="12" cy="9" r="6" ${s} />
        <path d="M8.5 14.2 7 21l5-2.5L17 21l-1.5-6.8" ${s} />`;
      break;
    case 'trophy':
      paths = `<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z" ${s} />`;
      break;
    case 'gem':
      paths = `<polygon points="6 3 18 3 22 9 12 21 2 9" ${s} />
        <path d="M2 9h20M12 21 8 9l4-6 4 6-4 12z" ${s} />`;
      break;
    case 'shield':
      paths = `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" ${s} />`;
      break;
    case 'target':
      paths = `<circle cx="12" cy="12" r="9" ${s} />
        <circle cx="12" cy="12" r="5" ${s} />
        <circle cx="12" cy="12" r="1.5" fill="${color}" />`;
      break;
    case 'walk':
      paths = `<circle cx="13" cy="4.5" r="2" ${s} />
        <path d="M10 9.5 13 8l3 2.5 2 2M8 14l3-4.5 2.5 3.5v6M11 13l-3 7" ${s} />`;
      break;
    case 'chart':
      paths = `<path d="M18 20V10M12 20V4M6 20v-6" ${s} />`;
      break;
    case 'pin':
      paths = `<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" ${s} />
        <circle cx="12" cy="10" r="3" ${s} />`;
      break;
    case 'lock':
      paths = `<rect width="16" height="11" x="4" y="11" rx="2" ry="2" ${s} />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" ${s} />`;
      break;
    case 'settings':
      paths = `<circle cx="12" cy="12" r="3" ${s} />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.77 1.02 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" ${s} />`;
      break;
    case 'heart':
      paths = `<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" ${s} />`;
      break;
    case 'mail':
      paths = `<rect width="18" height="14" x="3" y="5" rx="2" ${s} />
        <path d="m3 7 9 6 9-6" ${s} />`;
      break;
    case 'flame':
      paths = `<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" ${s} />`;
      break;
    case 'cards':
      paths = `<rect width="12" height="16" x="4" y="4" rx="2" ${s} />
        <path d="M16 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8" ${s} />`;
      break;
    case 'sun':
      paths = `<circle cx="12" cy="12" r="4" ${s} />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" ${s} />`;
      break;
    case 'edit':
      paths = `<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" ${s} />`;
      break;
    case 'share':
      paths = `<circle cx="18" cy="5" r="3" ${s} />
        <circle cx="6" cy="12" r="3" ${s} />
        <circle cx="18" cy="19" r="3" ${s} />
        <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" ${s} />`;
      break;
    case 'link':
      paths = `<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" ${s} />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" ${s} />`;
      break;
    case 'clock':
      paths = `<circle cx="12" cy="12" r="9" ${s} />
        <path d="M12 7v5l3 2" ${s} />`;
      break;
    case 'signal':
      paths = `<path d="M2 20h.01M7 20v-4M12 20v-8M17 20V8M22 4v16" ${s} />`;
      break;
    case 'warning':
      paths = `<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" ${s} />
        <path d="M12 9v4M12 17h.01" ${s} />`;
      break;
    case 'check':
      paths = `<path d="M20 6 9 17l-5-5" ${s} />`;
      break;
    case 'clap':
      paths = `<path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7L12 16.4 5.7 21l2.3-7-6-4.6h7.6L12 2z" ${s} />`;
      break;
    case 'search':
      paths = `<circle cx="11" cy="11" r="7" ${s} />
        <path d="m20 20-3.5-3.5" ${s} />`;
      break;
    case 'chevronLeft':
      paths = `<path d="m15 18-6-6 6-6" ${s} />`;
      break;
    case 'chevronRight':
      paths = `<path d="m9 18 6-6-6-6" ${s} />`;
      break;
    case 'chevronDown':
      paths = `<path d="m6 9 6 6 6-6" ${s} />`;
      break;
    case 'moreVertical':
      paths = `<circle cx="12" cy="6" r="1.5" fill="${color}" />
        <circle cx="12" cy="12" r="1.5" fill="${color}" />
        <circle cx="12" cy="18" r="1.5" fill="${color}" />`;
      break;
    case 'navigation':
    default:
      paths = `<polygon points="3 11 22 2 13 21 11 13 3 11" ${s} />`;
      break;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">${paths}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export interface AppIconProps {
  name: AppIconName | string;
  size?: number;
  color?: string;
}

export function AppIcon({
  name,
  size = 16,
  color = '#191A26',
}: AppIconProps) {
  const resolved = resolveIconName(name);
  const uri = buildVectorIconSvg(resolved, color);

  return (
    <Image
      source={{ uri }}
      style={{ width: size, height: size }}
      contentFit="contain"
    />
  );
}
