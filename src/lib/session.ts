import { jwtVerify, type JWTPayload } from "jose";
import type { NextRequest, NextResponse } from "next/server";

export const SESSION_COOKIE_NAME = "c4e_session";

export interface SessionPayload extends JWTPayload {
  id: string;
  username: string;
  email: string;
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error("JWT_ACCESS_SECRET is not set.");
  return new TextEncoder().encode(secret);
}

export function getSessionToken(req: NextRequest): string | null {
  return req.cookies.get(SESSION_COOKIE_NAME)?.value ?? null;
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

export async function verifySession(req: NextRequest): Promise<SessionPayload | null> {
  const token = getSessionToken(req);
  if (!token) return null;
  return await verifySessionToken(token);
}

export function setSessionCookieOnResponse(res: NextResponse, token: string): void {
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearSessionCookieOnResponse(res: NextResponse): void {
  res.cookies.delete(SESSION_COOKIE_NAME);
}

