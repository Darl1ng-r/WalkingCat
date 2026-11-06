const isDev = process.env.NODE_ENV !== 'production';

export const logger = {
  info(message: string, meta?: Record<string, unknown>): void {
    if (isDev) {
      if (meta) {
        console.info(`[INFO] ${message}`, meta);
      } else {
        console.info(`[INFO] ${message}`);
      }
    }
  },
  warn(message: string, meta?: Record<string, unknown>): void {
    if (isDev) {
      if (meta) {
        console.warn(`[WARN] ${message}`, meta);
      } else {
        console.warn(`[WARN] ${message}`);
      }
    }
  },
  error(message: string, error?: unknown, meta?: Record<string, unknown>): void {
    if (isDev) {
      if (meta) {
        console.error(`[ERROR] ${message}`, error, meta);
      } else {
        console.error(`[ERROR] ${message}`, error);
      }
    }
  },
};
