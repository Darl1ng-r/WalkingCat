import { logger } from './logger';

export interface CrashContext {
  component?: string;
  action?: string;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}

const SENSITIVE_PATTERNS = [
  /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, // Emails
  /Bearer\s+[a-zA-Z0-9\-._~+/]+=*/gi, // Bearer tokens
  /password["']?\s*[:=]\s*["']?[^"'\s,;]+["']?/gi, // Passwords
  /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, // JWTs
];

/**
 * Scrubs emails, JWTs, bearer tokens, and coordinate strings from text.
 */
export function scrubSensitiveInfo(raw: string): string {
  let result = raw;
  for (const pattern of SENSITIVE_PATTERNS) {
    result = result.replace(pattern, '[REDACTED]');
  }
  return result;
}

/**
 * Recursively sanitizes extra diagnostic context to remove coordinates and secrets.
 */
export function scrubContextExtra(
  extra?: Record<string, unknown>
): Record<string, unknown> {
  if (!extra) return {};

  const clean: Record<string, unknown> = {};
  const forbidden = new Set([
    'latitude',
    'longitude',
    'lat',
    'lng',
    'polyline',
    'route',
    'password',
    'token',
    'email',
  ]);

  for (const [key, value] of Object.entries(extra)) {
    if (forbidden.has(key.toLowerCase())) {
      clean[key] = '[REDACTED]';
    } else if (typeof value === 'string') {
      clean[key] = scrubSensitiveInfo(value);
    } else if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value)
    ) {
      clean[key] = scrubContextExtra(value as Record<string, unknown>);
    } else {
      clean[key] = value;
    }
  }

  return clean;
}

/**
 * Captures an exception with privacy-scrubbed diagnostic context.
 */
export function captureException(
  error: unknown,
  context?: CrashContext
): void {
  const errorMessage =
    error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  const scrubbedMessage = scrubSensitiveInfo(errorMessage);
  const scrubbedStack = errorStack ? scrubSensitiveInfo(errorStack) : undefined;
  const scrubbedExtra = scrubContextExtra(context?.extra);

  logger.error('[CrashReporting] Captured Exception', {
    message: scrubbedMessage,
    component: context?.component,
    action: context?.action,
    stack: scrubbedStack,
    tags: context?.tags,
    extra: scrubbedExtra,
  });
}
