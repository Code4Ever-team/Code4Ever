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
    select: {
      id: true,
      ownerId: true,
      isPrivate: true,
      isEncrypted: true,
      showroomSlug: true,
    },
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
    const revision = Number(formData.get("revision") ?? 0);

    const { repo } = await requireRepoOwner(repoId);
    if (repo.isEncrypted) {
      return { success: false, message: msg(locale, "errors.repoEncryptedUseClient") };
    }
    if (!filePath || filePath.includes("..")) {
      return { success: false, message: msg(locale, "errors.filePathRequired") };
    }
    if (Buffer.byteLength(content, "utf8") > MAX_FILE_BYTES) {
      return { success: false, message: msg(locale, "errors.fileTooLarge") };
    }

    const size = Buffer.byteLength(content, "utf8");
    const mimeType = guessMime(filePath);

    await prisma.repoFile.upsert({
      where: { repoId_path: { repoId, path: filePath } },
      create: {
        repoId,
        path: filePath,
        content: repo.isPrivate ? null : content,
        encryptedContent: repo.isPrivate ? content : null,
        mimeType,
        size,
        revision: revision + 1,
      },
      update: {
        content: repo.isPrivate ? null : content,
        encryptedContent: repo.isPrivate ? content : null,
        mimeType,
        size,
        revision: { increment: 1 },
      },
    });

    revalidateRepoPaths(locale, repoId, repo.showroomSlug);
    return { success: true, message: msg(locale, "errors.fileSaved") };
  } catch (error) {
    return repoActionError(error, locale, "errors.fileSaveFailed");
  }
}

export async function saveRepoFileEncryptedAction(
  _prev: PlatformResult,
  formData: FormData
): Promise<PlatformResult> {
  const locale = localeOf(formData);
  try {
    const repoId = String(formData.get("repoId") ?? "");
    const filePath = String(formData.get("path") ?? "").trim();
    const ciphertext = String(formData.get("ciphertext") ?? "");
    const nonce = String(formData.get("nonce") ?? "");

    const { repo } = await requireRepoOwner(repoId);
    if (!repo.isEncrypted) {
      return { success: false, message: msg(locale, "errors.repoNotEncrypted") };
    }
    if (!filePath || !ciphertext || !nonce) {
      return { success: false, message: msg(locale, "errors.filePathRequired") };
    }
    if (ciphertext.length > MAX_FILE_BYTES * 2) {
      return { success: false, message: msg(locale, "errors.fileTooLarge") };
    }

    await prisma.repoFile.upsert({
      where: { repoId_path: { repoId, path: filePath } },
      create: {
        repoId,
        path: filePath,
        ciphertext,
        nonce,
        content: null,
        encryptedContent: null,
        mimeType: guessMime(filePath),
        size: ciphertext.length,
        revision: 1,
      },
      update: {
        ciphertext,
        nonce,
        content: null,
        encryptedContent: null,
        size: ciphertext.length,
        revision: { increment: 1 },
      },
    });

    revalidateRepoPaths(locale, repoId, repo.showroomSlug);
    return { success: true, message: msg(locale, "errors.fileSaved") };
  } catch (error) {
    return repoActionError(error, locale, "errors.fileSaveFailed");
  }
}

export async function enableRepoEncryptionAction(
  _prev: PlatformResult,
  formData: FormData
): Promise<PlatformResult> {
  const locale = localeOf(formData);
  try {
    const repoId = String(formData.get("repoId") ?? "");
    const keyEnvelope = String(formData.get("keyEnvelope") ?? "").trim();
    const encryptedFilesRaw = String(formData.get("encryptedFiles") ?? "[]");

    const { repo } = await requireRepoOwner(repoId);
    if (repo.isEncrypted) {
      return { success: false, message: msg(locale, "errors.repoAlreadyEncrypted") };
    }
    if (!keyEnvelope) {
      return { success: false, message: msg(locale, "errors.encryptFailed") };
    }

    const files = JSON.parse(encryptedFilesRaw) as Array<{
      path: string;
      ciphertext: string;
      nonce: string;
    }>;

    await prisma.$transaction(async (tx) => {
      await tx.repo.update({
        where: { id: repoId },
        data: {
          isEncrypted: true,
          keyEnvelope,
          keyVersion: 1,
          showroomPublished: false,
        },
      });

      for (const f of files) {
        await tx.repoFile.upsert({
          where: { repoId_path: { repoId, path: f.path } },
          create: {
            repoId,
            path: f.path,
            ciphertext: f.ciphertext,
            nonce: f.nonce,
            content: null,
            encryptedContent: null,
            mimeType: guessMime(f.path),
            size: f.ciphertext.length,
          },
          update: {
            ciphertext: f.ciphertext,
            nonce: f.nonce,
            content: null,
            encryptedContent: null,
            size: f.ciphertext.length,
          },
        });
      }
    });

    revalidateRepoPaths(locale, repoId, repo.showroomSlug);
    return { success: true, message: msg(locale, "errors.repoEncrypted") };
  } catch (error) {
    return repoActionError(error, locale, "errors.encryptFailed");
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

    revalidateRepoPaths(locale, repoId, repo.showroomSlug);
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

    if (repo.isEncrypted && publish) {
      return { success: false, message: msg(locale, "errors.showroomEncryptedDenied") };
    }

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

    revalidateRepoPaths(locale, repoId, nextSlug);
    if (repo.showroomSlug && repo.showroomSlug !== nextSlug) {
      revalidatePath(`/${locale}/p/${repo.showroomSlug}`);
    }

    return {
      success: true,
      message: msg(locale, publish ? "errors.showroomPublished" : "errors.showroomSaved"),
    };
  } catch (error) {
    return repoActionError(error, locale, "errors.showroomSaveFailed");
  }
}

function revalidateRepoPaths(locale: string, repoId: string, showroomSlug: string | null) {
  revalidatePath(`/${locale}/repo/${repoId}`);
  revalidatePath(`/${locale}/repo/${repoId}/settings`);
  if (showroomSlug) revalidatePath(`/${locale}/p/${showroomSlug}`);
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
