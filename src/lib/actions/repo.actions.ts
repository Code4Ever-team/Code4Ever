"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { msg } from "@/lib/messages";
import {
  SHOWROOM_ENTRY,
  getShowroomHtml,
  isShowroomSlugAvailable,
  normalizeShowroomSlug,
  validateShowroomSlug,
} from "@/lib/showroom";
import type { PlatformResult } from "@/lib/actions/platform.actions";

const MAX_FILE_BYTES = 512 * 1024;

function localeOf(formData: FormData): string {
  return String(formData.get("locale") ?? "tr");
}

async function requireRepoOwner(repoId: string) {
  const session = await getSession();
  if (!session) throw new Error("AUTH_REQUIRED");

  const repo = await prisma.repo.findUnique({
    where: { id: repoId },
    select: { id: true, ownerId: true, isPrivate: true, showroomSlug: true },
  });
  if (!repo) throw new Error("REPO_NOT_FOUND");
  if (repo.ownerId !== session.id) throw new Error("FORBIDDEN");
  return { session, repo };
}

export async function saveRepoFileContentAction(
  _prev: PlatformResult,
  formData: FormData
): Promise<PlatformResult> {
  const locale = localeOf(formData);
  try {
    const repoId = String(formData.get("repoId") ?? "");
    const filePath = String(formData.get("path") ?? "").trim();
    const content = String(formData.get("content") ?? "");

    const { repo } = await requireRepoOwner(repoId);
    if (!filePath || filePath.includes("..")) {
      return { success: false, message: msg(locale, "errors.filePathRequired") };
    }
    if (Buffer.byteLength(content, "utf8") > MAX_FILE_BYTES) {
      return { success: false, message: msg(locale, "errors.fileTooLarge") };
    }

    const size = Buffer.byteLength(content, "utf8");
    const mimeType = guessMime(filePath);

    if (repo.isPrivate) {
      await prisma.repoFile.upsert({
        where: { repoId_path: { repoId, path: filePath } },
        create: { repoId, path: filePath, encryptedContent: content, mimeType, size },
        update: { encryptedContent: content, mimeType, size },
      });
    } else {
      await prisma.repoFile.upsert({
        where: { repoId_path: { repoId, path: filePath } },
        create: { repoId, path: filePath, content, mimeType, size },
        update: { content, mimeType, size },
      });
    }

    revalidatePath(`/${locale}/repo/${repoId}`);
    if (repo.showroomSlug) {
      revalidatePath(`/${locale}/p/${repo.showroomSlug}`);
    }
    return { success: true, message: msg(locale, "errors.fileSaved") };
  } catch (error) {
    return repoActionError(error, locale, "errors.fileSaveFailed");
  }
}

export async function deleteRepoFileAction(
  _prev: PlatformResult,
  formData: FormData
): Promise<PlatformResult> {
  const locale = localeOf(formData);
  try {
    const repoId = String(formData.get("repoId") ?? "");
    const filePath = String(formData.get("path") ?? "").trim();
    const { repo } = await requireRepoOwner(repoId);

    await prisma.repoFile.deleteMany({
      where: { repoId, path: filePath },
    });

    revalidatePath(`/${locale}/repo/${repoId}`);
    if (repo.showroomSlug) {
      revalidatePath(`/${locale}/p/${repo.showroomSlug}`);
    }
    return { success: true, message: msg(locale, "errors.fileDeleted") };
  } catch (error) {
    return repoActionError(error, locale, "errors.fileDeleteFailed");
  }
}

export async function updateShowroomAction(
  _prev: PlatformResult,
  formData: FormData
): Promise<PlatformResult> {
  const locale = localeOf(formData);
  try {
    const repoId = String(formData.get("repoId") ?? "");
    const rawSlug = String(formData.get("showroomSlug") ?? "").trim();
    const publish = formData.get("publish") === "on";
    const { repo } = await requireRepoOwner(repoId);

    let nextSlug: string | null = repo.showroomSlug;

    if (rawSlug) {
      const slug = normalizeShowroomSlug(rawSlug);
      const validation = validateShowroomSlug(slug);
      if (validation) {
        return { success: false, message: msg(locale, `errors.${validation}`) };
      }
      const available = await isShowroomSlugAvailable(slug, repoId);
      if (!available) {
        return { success: false, message: msg(locale, "errors.showroomSlugTaken") };
      }
      nextSlug = slug;
    } else if (!publish) {
      nextSlug = null;
    }

    if (publish) {
      if (!nextSlug) {
        return { success: false, message: msg(locale, "errors.showroomSlugRequired") };
      }
      if (repo.isPrivate) {
        return { success: false, message: msg(locale, "errors.showroomPrivateDenied") };
      }
      const html = await getShowroomHtml(repoId);
      if (!html?.trim()) {
        return { success: false, message: msg(locale, "errors.showroomMissingIndex") };
      }
    }

    await prisma.repo.update({
      where: { id: repoId },
      data: {
        showroomSlug: nextSlug,
        showroomPublished: publish && Boolean(nextSlug),
      },
    });

    revalidatePath(`/${locale}/repo/${repoId}`);
    revalidatePath(`/${locale}/repo/${repoId}/settings`);
    if (nextSlug) {
      revalidatePath(`/${locale}/p/${nextSlug}`);
    }
    if (repo.showroomSlug && repo.showroomSlug !== nextSlug) {
      revalidatePath(`/${locale}/p/${repo.showroomSlug}`);
    }

    return { success: true, message: msg(locale, publish ? "errors.showroomPublished" : "errors.showroomSaved") };
  } catch (error) {
    return repoActionError(error, locale, "errors.showroomSaveFailed");
  }
}

function guessMime(path: string): string {
  if (path.endsWith(".html")) return "text/html";
  if (path.endsWith(".css")) return "text/css";
  if (path.endsWith(".js")) return "text/javascript";
  if (path.endsWith(".json")) return "application/json";
  if (path.endsWith(".md")) return "text/markdown";
  return "text/plain";
}

function repoActionError(error: unknown, locale: string, fallbackKey: string): PlatformResult {
  if (error instanceof Error && error.message === "AUTH_REQUIRED") {
    return { success: false, message: msg(locale, "errors.authRequired") };
  }
  if (error instanceof Error && error.message === "FORBIDDEN") {
    return { success: false, message: msg(locale, "errors.forbidden") };
  }
  if (error instanceof Error && error.message === "REPO_NOT_FOUND") {
    return { success: false, message: msg(locale, "errors.repoNotFound") };
  }
  logger.error("repo action failed", { error });
  return { success: false, message: msg(locale, fallbackKey) };
}
