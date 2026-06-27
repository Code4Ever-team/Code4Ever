"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { AuthorizationError, AuthRequiredError } from "@/lib/errors";
import { isPlatformPanelAdmin } from "@/lib/platform-panel";
import { saveProfileImageUpload } from "@/lib/upload";
import { sendAdminChangeEmail, sendAdminCustomEmail } from "@/lib/mail/admin-email";
import type { BadgeRarity } from "@prisma/client";

export interface AdminResult {
  success: boolean;
  message: string;
}

export interface AdminUserDetail {
  id: string;
  username: string;
  email: string;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  isFounder: boolean;
  suspendedAt: Date | null;
  createdAt: Date;
  _count: {
    feeds: number;
    reposOwned: number;
    followerEdges: number;
    followingEdges: number;
  };
  userBadges: Array<{
    badgeId: string;
    badge: {
      id: string;
      slug: string;
      nameEn: string;
      nameTr: string;
      descriptionEn: string;
      descriptionTr: string;
      icon: string;
      rarity: BadgeRarity;
    };
  }>;
  feeds: Array<{ id: string; content: string; createdAt: Date }>;
}

async function requirePanelAdmin() {
  const session = await getSession();
  if (!session) throw new AuthRequiredError();
  const ok = await isPlatformPanelAdmin(session.id);
  if (!ok) throw new AuthorizationError("ADMIN_FORBIDDEN");
  return session;
}

async function notifyUserChange(
  userId: string,
  locale: string,
  summary: string,
  adminUsername: string
) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (user?.email) {
      await sendAdminChangeEmail(user.email, locale, summary, adminUsername);
    }
  } catch (err) {
    logger.error("notifyUserChange email failed", { userId, err });
  }
}

function slugify(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function fetchAdminUserDetail(userId: string): Promise<AdminUserDetail | null> {
  try {
    await requirePanelAdmin();
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        bio: true,
        avatarUrl: true,
        bannerUrl: true,
        isFounder: true,
        suspendedAt: true,
        createdAt: true,
        _count: {
          select: { feeds: true, reposOwned: true, followerEdges: true, followingEdges: true },
        },
        userBadges: {
          select: {
            badgeId: true,
            badge: {
              select: {
                id: true,
                slug: true,
                nameEn: true,
                nameTr: true,
                descriptionEn: true,
                descriptionTr: true,
                icon: true,
                rarity: true,
              },
            },
          },
        },
        feeds: {
          take: 10,
          orderBy: { createdAt: "desc" },
          select: { id: true, content: true, createdAt: true },
        },
      },
    });
  } catch {
    return null;
  }
}

export async function adminDeleteFeedAction(
  _prev: AdminResult,
  formData: FormData
): Promise<AdminResult> {
  const locale = String(formData.get("locale") ?? "tr");
  const feedId = String(formData.get("feedId") ?? "");

  try {
    await requirePanelAdmin();
    const feed = await prisma.feed.findUnique({
      where: { id: feedId },
      select: { user: { select: { username: true } } },
    });
    if (!feed) return { success: false, message: "not_found" };

    await prisma.feed.delete({ where: { id: feedId } });
    revalidatePath(`/${locale}/admin`);
    revalidatePath(`/${locale}/feed`);
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/${feed.user.username}`);
    return { success: true, message: "deleted" };
  } catch (error) {
    if (error instanceof AuthRequiredError || error instanceof AuthorizationError) {
      return { success: false, message: "forbidden" };
    }
    logger.error("adminDeleteFeedAction failed", { error });
    return { success: false, message: "failed" };
  }
}

export async function adminDeleteUserAction(userId: string, locale: string): Promise<AdminResult> {
  try {
    const admin = await requirePanelAdmin();
    if (admin.id === userId) return { success: false, message: "self" };

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, isFounder: true, email: true },
    });
    if (!target) return { success: false, message: "not_found" };
    if (target.isFounder) return { success: false, message: "founder" };

    try {
      await sendAdminChangeEmail(
        target.email,
        locale,
        locale === "tr" ? "Hesabın kalıcı olarak silindi." : "Your account was permanently deleted.",
        admin.username
      );
    } catch {
      /* continue */
    }

    await prisma.user.delete({ where: { id: userId } });
    revalidatePath(`/${locale}/admin`);
    return { success: true, message: "deleted" };
  } catch (error) {
    if (error instanceof AuthRequiredError || error instanceof AuthorizationError) {
      return { success: false, message: "forbidden" };
    }
    logger.error("adminDeleteUserAction failed", { error });
    return { success: false, message: "failed" };
  }
}

export async function adminSuspendUserAction(
  userId: string,
  locale: string,
  suspend: boolean
): Promise<AdminResult> {
  try {
    const admin = await requirePanelAdmin();
    if (admin.id === userId) return { success: false, message: "self" };

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { isFounder: true },
    });
    if (!target) return { success: false, message: "not_found" };
    if (target.isFounder) return { success: false, message: "founder" };

    await prisma.user.update({
      where: { id: userId },
      data: { suspendedAt: suspend ? new Date() : null },
    });

    const summary = suspend
      ? locale === "tr"
        ? "Hesabın askıya alındı."
        : "Your account was suspended."
      : locale === "tr"
        ? "Hesabının askısı kaldırıldı."
        : "Your account suspension was lifted.";

    await notifyUserChange(userId, locale, summary, admin.username);
    revalidatePath(`/${locale}/admin`);
    return { success: true, message: suspend ? "suspended" : "unsuspended" };
  } catch (error) {
    if (error instanceof AuthRequiredError || error instanceof AuthorizationError) {
      return { success: false, message: "forbidden" };
    }
    logger.error("adminSuspendUserAction failed", { error });
    return { success: false, message: "failed" };
  }
}

export async function adminUpdateUserAction(
  _prev: AdminResult,
  formData: FormData
): Promise<AdminResult> {
  const locale = String(formData.get("locale") ?? "tr");
  const userId = String(formData.get("userId") ?? "");
  const newUsername = String(formData.get("username") ?? "").trim().toLowerCase();

  try {
    const admin = await requirePanelAdmin();

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, isFounder: true },
    });
    if (!target) return { success: false, message: "not_found" };

    const changes: string[] = [];
    const data: { username?: string; avatarUrl?: string } = {};

    if (newUsername && newUsername !== target.username) {
      if (newUsername.length < 3) return { success: false, message: "username_short" };
      const taken = await prisma.user.findUnique({ where: { username: newUsername } });
      if (taken && taken.id !== userId) return { success: false, message: "username_taken" };
      data.username = newUsername;
      changes.push(
        locale === "tr"
          ? `Kullanıcı adın @${target.username} → @${newUsername} olarak değiştirildi.`
          : `Username changed from @${target.username} to @${newUsername}.`
      );
    }

    const avatar = formData.get("avatar");
    if (avatar instanceof File && avatar.size > 0) {
      try {
        data.avatarUrl = await saveProfileImageUpload(avatar, "avatars");
        changes.push(locale === "tr" ? "Profil fotoğrafın güncellendi." : "Profile photo was updated.");
      } catch (err) {
        logger.error("adminUpdateUser avatar failed", { err });
        return { success: false, message: "avatar_failed" };
      }
    }

    if (Object.keys(data).length === 0) {
      return { success: false, message: "no_changes" };
    }

    await prisma.user.update({ where: { id: userId }, data });

    if (changes.length > 0) {
      await notifyUserChange(userId, locale, changes.join("\n"), admin.username);
    }

    revalidatePath(`/${locale}/admin`);
    if (data.username) {
      revalidatePath(`/${locale}/${data.username}`);
      revalidatePath(`/${locale}/${target.username}`);
    }
    return { success: true, message: "updated" };
  } catch (error) {
    if (error instanceof AuthRequiredError || error instanceof AuthorizationError) {
      return { success: false, message: "forbidden" };
    }
    logger.error("adminUpdateUserAction failed", { error });
    return { success: false, message: "failed" };
  }
}

export async function adminSendMailAction(
  _prev: AdminResult,
  formData: FormData
): Promise<AdminResult> {
  const locale = String(formData.get("locale") ?? "tr");
  const userId = String(formData.get("userId") ?? "");
  const subject = String(formData.get("subject") ?? "").trim();
  const intro = String(formData.get("intro") ?? "").trim();
  const buttonText = String(formData.get("buttonText") ?? "").trim();
  const buttonUrl = String(formData.get("buttonUrl") ?? "").trim();
  const footer = String(formData.get("footer") ?? "").trim();

  try {
    await requirePanelAdmin();
    if (!subject || !intro) return { success: false, message: "empty" };

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user) return { success: false, message: "not_found" };

    await sendAdminCustomEmail(
      user.email,
      locale,
      subject,
      intro,
      buttonText || undefined,
      buttonUrl || undefined,
      footer || undefined
    );
    return { success: true, message: "sent" };
  } catch (error) {
    if (error instanceof AuthRequiredError || error instanceof AuthorizationError) {
      return { success: false, message: "forbidden" };
    }
    if (error instanceof Error && error.message === "SMTP_NOT_CONFIGURED") {
      return { success: false, message: "smtp" };
    }
    logger.error("adminSendMailAction failed", { error });
    return { success: false, message: "failed" };
  }
}

export async function adminCreateBadgeAction(
  _prev: AdminResult,
  formData: FormData
): Promise<AdminResult> {
  try {
    await requirePanelAdmin();
    const slug = slugify(String(formData.get("slug") ?? ""));
    const nameEn = String(formData.get("nameEn") ?? "").trim();
    const nameTr = String(formData.get("nameTr") ?? "").trim();
    const descriptionEn = String(formData.get("descriptionEn") ?? "").trim();
    const descriptionTr = String(formData.get("descriptionTr") ?? "").trim();
    const icon = String(formData.get("icon") ?? "").trim();
    const rarity = String(formData.get("rarity") ?? "COMMON").toUpperCase() as BadgeRarity;

    if (!slug || !nameEn || !nameTr || !icon) {
      return { success: false, message: "missing_fields" };
    }

    await prisma.badge.create({
      data: {
        slug,
        nameEn,
        nameTr,
        descriptionEn: descriptionEn || nameEn,
        descriptionTr: descriptionTr || nameTr,
        icon,
        rarity,
      },
    });
    return { success: true, message: "badge_created" };
  } catch (error) {
    if (error instanceof AuthRequiredError || error instanceof AuthorizationError) {
      return { success: false, message: "forbidden" };
    }
    logger.error("adminCreateBadgeAction failed", { error });
    return { success: false, message: "failed" };
  }
}

export async function adminGrantBadgeAction(userId: string, badgeId: string, locale: string): Promise<AdminResult> {
  try {
    await requirePanelAdmin();
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } });
    if (!user) return { success: false, message: "not_found" };

    await prisma.userBadge.upsert({
      where: { userId_badgeId: { userId, badgeId } },
      create: { userId, badgeId },
      update: {},
    });

    revalidatePath(`/${locale}/${user.username}`);
    revalidatePath(`/${locale}/admin`);
    return { success: true, message: "granted" };
  } catch (error) {
    logger.error("adminGrantBadgeAction failed", { error });
    return { success: false, message: "failed" };
  }
}

export async function adminRevokeBadgeAction(userId: string, badgeId: string, locale: string): Promise<AdminResult> {
  try {
    await requirePanelAdmin();
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } });
    if (!user) return { success: false, message: "not_found" };

    await prisma.userBadge.deleteMany({ where: { userId, badgeId } });
    revalidatePath(`/${locale}/${user.username}`);
    revalidatePath(`/${locale}/admin`);
    return { success: true, message: "revoked" };
  } catch (error) {
    logger.error("adminRevokeBadgeAction failed", { error });
    return { success: false, message: "failed" };
  }
}
