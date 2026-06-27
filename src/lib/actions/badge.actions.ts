"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { AuthorizationError, AuthRequiredError } from "@/lib/errors";
import { isPlatformPanelAdmin } from "@/lib/platform-panel";
import type { BadgeRarity } from "@prisma/client";

export interface PanelResult {
  success: boolean;
  message: string;
}

async function requirePanelAdmin() {
  const session = await getSession();
  if (!session) {
    throw new AuthRequiredError();
  }
  const ok = await isPlatformPanelAdmin(session.id);
  if (!ok) {
    throw new AuthorizationError("PANEL_FORBIDDEN");
  }
  return session;
}

function slugify(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function createBadgeAction(_prev: PanelResult, formData: FormData): Promise<PanelResult> {
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
      return { success: false, message: "Missing required fields." };
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

    return { success: true, message: "Badge created." };
  } catch (error) {
    if (error instanceof AuthRequiredError || error instanceof AuthorizationError) {
      return { success: false, message: "Forbidden." };
    }
    logger.error("createBadgeAction failed", { error });
    return { success: false, message: "Create failed." };
  }
}

export async function grantBadgeAction(_prev: PanelResult, formData: FormData): Promise<PanelResult> {
  try {
    await requirePanelAdmin();

    const username = String(formData.get("username") ?? "").trim();
    const badgeId = String(formData.get("badgeId") ?? "").trim();

    const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (!user) return { success: false, message: "User not found." };

    const badge = await prisma.badge.findUnique({ where: { id: badgeId }, select: { id: true } });
    if (!badge) return { success: false, message: "Badge not found." };

    await prisma.userBadge.upsert({
      where: { userId_badgeId: { userId: user.id, badgeId: badge.id } },
      create: { userId: user.id, badgeId: badge.id },
      update: {},
    });

    for (const loc of ["en", "tr"] as const) {
      revalidatePath(`/${loc}/${username}`);
    }
    return { success: true, message: `Granted to @${username}.` };
  } catch (error) {
    if (error instanceof AuthRequiredError || error instanceof AuthorizationError) {
      return { success: false, message: "Forbidden." };
    }
    logger.error("grantBadgeAction failed", { error });
    return { success: false, message: "Grant failed." };
  }
}

export async function revokeBadgeAction(_prev: PanelResult, formData: FormData): Promise<PanelResult> {
  try {
    await requirePanelAdmin();

    const username = String(formData.get("username") ?? "").trim();
    const badgeId = String(formData.get("badgeId") ?? "").trim();

    const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (!user) return { success: false, message: "User not found." };

    await prisma.userBadge.deleteMany({
      where: { userId: user.id, badgeId },
    });

    for (const loc of ["en", "tr"] as const) {
      revalidatePath(`/${loc}/${username}`);
    }
    return { success: true, message: `Revoked from @${username}.` };
  } catch (error) {
    if (error instanceof AuthRequiredError || error instanceof AuthorizationError) {
      return { success: false, message: "Forbidden." };
    }
    logger.error("revokeBadgeAction failed", { error });
    return { success: false, message: "Revoke failed." };
  }
}

export async function loadPanelBadges() {
  try {
    await requirePanelAdmin();
    return prisma.badge.findMany({ orderBy: { createdAt: "desc" } });
  } catch {
    return [];
  }
}

export async function loadUserBadgesForPanel(username: string) {
  try {
    await requirePanelAdmin();
    const user = await prisma.user.findUnique({
      where: { username: username.trim() },
      select: {
        id: true,
        username: true,
        userBadges: {
          select: {
            badgeId: true,
            badge: true,
          },
        },
      },
    });
    return user;
  } catch {
    return null;
  }
}
