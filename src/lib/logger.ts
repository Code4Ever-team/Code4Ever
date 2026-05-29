type LogContext = Record<string, unknown>;

function serializeContext(context?: LogContext): string {
  if (!context) return "";
  try {
    return ` ${JSON.stringify(context)}`;
  } catch {
    return "";
  }
}

export const logger = {
  info(message: string, context?: LogContext): void {
    console.info(`[C4E] ${message}${serializeContext(context)}`);
  },
  warn(message: string, context?: LogContext): void {
    console.warn(`[C4E] ${message}${serializeContext(context)}`);
  },
  error(message: string, context?: LogContext): void {
    console.error(`[C4E] ${message}${serializeContext(context)}`);
  },
};

