import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "c4e_session";
const ACCESS_TTL = "7d"; // 7 gün

function getSecret(): Uint8Array {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error("JWT_ACCESS_SECRET is not defined in environment variables.");
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload extends JWTPayload {
  id: string;
  username: string;
  email: string;
}

export async function signToken(payload: Omit<SessionPayload, keyof JWTPayload>): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(process.env.AUTH_ISSUER ?? "c4e")
    .setAudience(process.env.AUTH_AUDIENCE ?? "c4e-users")
    .setExpirationTime(ACCESS_TTL)
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
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
  } catch (err) {
    console.warn("[verifyToken] Invalid token:", (err as Error).message);
    return null;
  }
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) return null;

    const payload = await verifyToken(token);
    if (!payload) return null;

    try {
      const user = await prisma.user.findUnique({
        where: { id: payload.id },
        select: { suspendedAt: true },
      });
      if (user?.suspendedAt) {
        cookieStore.delete(COOKIE_NAME);
        return null;
      }
    } catch {
    }

    return payload;
  } catch (err) {
    console.error("[getSession] Unexpected error:", err);
    return null;
  }
}
