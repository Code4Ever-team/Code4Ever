import { jwtVerify, type JWTPayload } from "jose";

export interface SessionPayload extends JWTPayload {
  id: string;
  username: string;
  email: string;
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error("JWT_ACCESS_SECRET is not defined.");
  }
  return new TextEncoder().encode(secret);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: process.env.AUTH_ISSUER ?? "c4e",
      audience: process.env.AUTH_AUDIENCE ?? "c4e-users",
    });

    if (
      typeof payload["id"] !== "string" ||
      typeof payload["username"] !== "string" ||
      typeof payload["email"] !== "string"
    ) {
      return null;
    }

    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export function readSessionCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)c4e_session=([^;]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}
