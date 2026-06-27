import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Sabitler
// ---------------------------------------------------------------------------

const COOKIE_NAME = "c4e_session";
const ACCESS_TTL = "7d"; // 7 gün

function getSecret(): Uint8Array {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error("JWT_ACCESS_SECRET is not defined in environment variables.");
  }
  return new TextEncoder().encode(secret);
}

// ---------------------------------------------------------------------------
// Payload tipi
// ---------------------------------------------------------------------------

export interface SessionPayload extends JWTPayload {
  id: string;
  username: string;
  email: string;
}

// ---------------------------------------------------------------------------
// Token işlemleri
// ---------------------------------------------------------------------------

/**
 * Verilen kullanıcı verisiyle imzalı JWT üretir.
 * Yalnızca sunucu tarafında (Server Action / Route Handler) çağrılır.
 */
export async function signToken(payload: Omit<SessionPayload, keyof JWTPayload>): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(process.env.AUTH_ISSUER ?? "c4e")
    .setAudience(process.env.AUTH_AUDIENCE ?? "c4e-users")
    .setExpirationTime(ACCESS_TTL)
    .sign(getSecret());
}

/**
 * JWT string'i doğrular ve payload'ı döner.
 * Hatalı veya süresi dolmuş token'da `null` döner, asla fırlatmaz.
 */
export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: process.env.AUTH_ISSUER ?? "c4e",
      audience: process.env.AUTH_AUDIENCE ?? "c4e-users",
    });

    // Gerekli alanlar payload'da var mı?
    if (
      typeof payload["id"] !== "string" ||
      typeof payload["username"] !== "string" ||
      typeof payload["email"] !== "string"
    ) {
      return null;
    }

    return payload as SessionPayload;
  } catch (err) {
    // Süresi dolmuş, imza hatalı vb. — bilerek sessiz geçiyoruz.
    console.warn("[verifyToken] Invalid token:", (err as Error).message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Cookie yönetimi
// ---------------------------------------------------------------------------

/**
 * JWT'yi tarayıcıya güvenli cookie olarak yazar.
 * Yalnızca Server Action / Route Handler içinden çağrılır.
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 gün (saniye cinsinden)
  });
}

/**
 * Oturumu sonlandırır; cookie'yi siler.
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// ---------------------------------------------------------------------------
// Session okuyucu — Server Component / Action / Route Handler
// ---------------------------------------------------------------------------

/**
 * Mevcut isteğin cookie'sinden oturumu okur ve doğrular.
 *
 * @returns Doğrulanmış `SessionPayload` veya `null` (misafir / süresi dolmuş).
 *
 * @example
 * ```ts
 * // Server Component içinde:
 * const session = await getSession();
 * const isLoggedIn = session !== null;
 * ```
 */
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
      /* DB offline — keep session for read paths */
    }

    return payload;
  } catch (err) {
    console.error("[getSession] Unexpected error:", err);
    return null;
  }
}
