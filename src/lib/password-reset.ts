import { createHash, randomBytes } from "crypto";

const RESET_TTL_MS = 60 * 60 * 1000;

export function generateResetToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(token);
  return { token, tokenHash };
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function resetExpiresAt(): Date {
  return new Date(Date.now() + RESET_TTL_MS);
}
