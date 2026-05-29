import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export function isDbConnectionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("can't reach database server") ||
    msg.includes("prismaclientinitializationerror") ||
    msg.includes("p1001") ||
    msg.includes("connection")
  );
}

/**
 * Veritabanı sorgusunu güvenli çalıştırır; hata durumunda fallback döner.
 */
export async function safeDbQuery<T>(
  label: string,
  query: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await query();
  } catch (error) {
    logger.error(`${label} failed`, {
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return fallback;
  }
}

/**
 * DB erişilebilir mi? (tek satır ping)
 */
export async function isDatabaseAvailable(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error("Database ping failed", {
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return false;
  }
}
