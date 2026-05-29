"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { signToken, setSessionCookie, clearSessionCookie } from "@/lib/auth";
import {
  LoginFormSchema,
  RegisterFormSchema,
  type LoginFormValues,
  type RegisterFormValues,
} from "@/lib/validations/auth";
import { msg } from "@/lib/messages";
import { clientRateLimitKey, rateLimit } from "@/lib/rate-limit";

// ---------------------------------------------------------------------------
// Sabitler
// ---------------------------------------------------------------------------

const BCRYPT_ROUNDS = 12;

// ---------------------------------------------------------------------------
// Paylaşılan tip tanımları
// ---------------------------------------------------------------------------

export interface ActionResult<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
}

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
}

/**
 * Yeni kullanıcı kaydı oluşturur.
 *
 * Kontroller:
 * - Şifre en az 6 karakter olmalı.
 * - Email ve username veritabanında benzersiz olmalı.
 * - Şifre bcrypt ile hashlenir; düz metin asla saklanmaz.
 */
export async function registerUser(
  input: RegisterInput,
  locale = "tr"
): Promise<ActionResult<AuthUser>> {
  const { username, email, password } = input;

  try {
    if (!username || !email || !password) {
      return { success: false, message: msg(locale, "errors.registerFields") };
    }

    const trimmedUsername = username.trim().toLowerCase();
    const trimmedEmail = email.trim().toLowerCase();

    const rlKey = clientRateLimitKey("register", trimmedEmail);
    if (!rateLimit(rlKey, 5, 15 * 60_000)) {
      return { success: false, message: msg(locale, "errors.rateLimited") };
    }

    if (password.length < 6) {
      return { success: false, message: msg(locale, "errors.passwordShort") };
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ username: trimmedUsername }, { email: trimmedEmail }],
      },
      select: { username: true, email: true },
    });

    if (existing) {
      if (existing.username === trimmedUsername) {
        return { success: false, message: msg(locale, "errors.usernameTaken") };
      }
      return { success: false, message: msg(locale, "errors.emailTaken") };
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const userCount = await prisma.user.count();

    const user = await prisma.user.create({
      data: {
        username: trimmedUsername,
        email: trimmedEmail,
        passwordHash,
        isFounder: userCount === 0,
      },
      select: { id: true, username: true, email: true },
    });

    return {
      success: true,
      message: msg(locale, "errors.registerSuccess"),
      data: user,
    };
  } catch (err) {
    console.error("[registerUser] Unexpected error:", err);
    return { success: false, message: msg(locale, "errors.server") };
  }
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

export interface LoginInput {
  usernameOrEmail: string;
  password: string;
}

/**
 * Kullanıcı girişi yapar ve JWT cookie'sini tarayıcıya yazar.
 *
 * Güvenlik notu: Kullanıcı bulunamasa da "yanlış şifre" mesajı döner —
 * hangi alanın hatalı olduğunu açıklamamak için kasıtlı olarak belirsiz
 * bırakılmıştır (timing-safe değil ama UX açısından yeterli).
 */
export async function loginUser(
  input: LoginInput,
  locale = "tr"
): Promise<ActionResult<AuthUser>> {
  const { usernameOrEmail, password } = input;

  try {
    if (!usernameOrEmail || !password) {
      return { success: false, message: msg(locale, "errors.registerFields") };
    }

    const trimmed = usernameOrEmail.trim().toLowerCase();

    const loginRl = clientRateLimitKey("login", trimmed);
    if (!rateLimit(loginRl, 10, 15 * 60_000)) {
      return { success: false, message: msg(locale, "errors.rateLimited") };
    }

    // Email mi yoksa kullanıcı adı mı?
    const isEmail = trimmed.includes("@");

    const user = await prisma.user.findUnique({
      where: isEmail ? { email: trimmed } : { username: trimmed },
      select: {
        id: true,
        username: true,
        email: true,
        passwordHash: true,
      },
    });

    if (!user) {
      // Kullanıcı bulunamadı — timing attack'ı zorlaştırmak için yine de bcrypt çalıştır
      await bcrypt.compare(password, "$2b$12$invalidhashpadding.invalidhashpadding.invalid");
      return { success: false, message: msg(locale, "errors.loginFailed") };
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatch) {
      return { success: false, message: msg(locale, "errors.loginFailed") };
    }

    // JWT üret ve cookie'ye yaz
    const token = await signToken({
      id: user.id,
      username: user.username,
      email: user.email,
    });

    await setSessionCookie(token);

    return {
      success: true,
      message: msg(locale, "errors.registerSuccess"),
      data: { id: user.id, username: user.username, email: user.email },
    };
  } catch (err) {
    console.error("[loginUser] Unexpected error:", err);
    return { success: false, message: msg(locale, "errors.server") };
  }
}

// ---------------------------------------------------------------------------
// Next.js form state wrappers (useFormState/useActionState uyumlu)
// ---------------------------------------------------------------------------
import type { AuthFormState } from "@/lib/actions/auth.form-state";

export async function registerAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const locale = String(formData.get("locale") ?? "en");

  try {
    const raw: RegisterFormValues = {
      username: String(formData.get("username") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    };

    const parsed = RegisterFormSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0].message };
    }

    const res = await registerUser(parsed.data, locale);
    if (!res.success) {
      return { success: false, message: res.message };
    }
  } catch (err) {
    console.error("[registerAction] Unexpected error:", err);
    return { success: false, message: msg(locale, "errors.server") };
  }

  redirect(`/${locale}/login`);
}

export async function loginAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const locale = String(formData.get("locale") ?? "en");
  const redirectTo = String(formData.get("redirect") ?? "").trim();

  try {
    const raw: LoginFormValues = {
      usernameOrEmail: String(formData.get("usernameOrEmail") ?? ""),
      password: String(formData.get("password") ?? ""),
    };

    const parsed = LoginFormSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0].message };
    }

    const res = await loginUser(parsed.data, locale);
    if (!res.success) {
      return { success: false, message: res.message };
    }
  } catch (err) {
    console.error("[loginAction] Unexpected error:", err);
    return { success: false, message: msg(locale, "errors.server") };
  }

  redirect(redirectTo || `/${locale}`);
}

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

/**
 * Aktif oturumu sonlandırır; cookie'yi temizler.
 */
export async function logoutUser(): Promise<ActionResult> {
  try {
    await clearSessionCookie();
    return { success: true, message: "Oturum kapatıldı." };
  } catch (err) {
    console.error("[logoutUser] Unexpected error:", err);
    return { success: false, message: "Sunucu hatası." };
  }
}

/**
 * Server Action: Logout + /login'e redirect.
 * Form action'ı olarak kullanılabilir.
 */
export async function logoutAction(formData: FormData): Promise<never> {
  const locale = String(formData.get("locale") ?? "tr");
  await logoutUser();
  redirect(`/${locale}/login`);
}

