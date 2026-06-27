"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { msg } from "@/lib/messages";
import { AuthorizationError, AuthRequiredError } from "@/lib/errors";
import { savePublicUpload, saveProfileImageUpload } from "@/lib/upload";
import { saveMediaUpload } from "@/lib/media-upload";

export interface PlatformResult {
  success: boolean;
  message: string;
}

function localeOf(formData: FormData): string {
  return String(formData.get("locale") ?? "tr");
}

async function requireSession() {
  const session = await getSession();
  if (!session) {
    throw new AuthRequiredError();
  }
  return session;
}

export async function createFeedAction(
  _prev: PlatformResult,
  formData: FormData
): Promise<PlatformResult> {
  const locale = localeOf(formData);
  try {
    const session = await requireSession();
    const content = String(formData.get("content") ?? "").trim();
    const media = formData.get("media");

    if (content.length < 1 && !(media instanceof File)) {
      return { success: false, message: msg(locale, "errors.feedEmpty") };
    }

    let mediaUrl: string | null = null;
    let mediaType: string | null = null;
    let mediaNonce: string | null = null;
    let mediaKey: string | null = null;
    let mediaMimeType: string | null = null;
    if (media instanceof File && media.size > 0) {
      const saved = await saveMediaUpload(media, "feed-media");
      mediaUrl = saved.url;
      mediaType = saved.kind;
      const nonce = String(formData.get("mediaNonce") ?? "").trim();
      const key = String(formData.get("mediaKey") ?? "").trim();
      const originalMime = String(formData.get("originalMime") ?? "").trim();
      if (nonce && key) {
        mediaNonce = nonce;
        mediaKey = key;
        mediaMimeType = originalMime || null;
      }
    }

    await prisma.feed.create({
      data: {
        content: content || " ",
        mediaUrl,
        mediaType,
        mediaNonce,
        mediaKey,
        mediaMimeType,
        userId: session.id,
      },
    });

    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/feed`);
    revalidatePath(`/${locale}/${session.username}`);
    return { success: true, message: msg(locale, "errors.feedCreated") };
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return { success: false, message: msg(locale, "errors.authRequired") };
    }
    if (error instanceof Error && error.message === "FILE_TOO_LARGE") {
      return { success: false, message: msg(locale, "errors.fileTooLarge") };
    }
    if (error instanceof Error && error.message === "FILE_TYPE_BLOCKED") {
      return { success: false, message: msg(locale, "errors.fileTypeBlocked") };
    }
    logger.error("createFeedAction failed", { error });
    return { success: false, message: msg(locale, "errors.server") };
  }
}

export async function deleteFeedAction(
  _prev: PlatformResult,
  formData: FormData
): Promise<PlatformResult> {
  const locale = localeOf(formData);
  try {
    const session = await requireSession();
    const feedId = String(formData.get("feedId") ?? "");

    const feed = await prisma.feed.findUnique({
      where: { id: feedId },
      select: { id: true, userId: true, user: { select: { username: true } } },
    });

    if (!feed) {
      return { success: false, message: msg(locale, "errors.feedDeleteFailed") };
    }

    if (feed.userId !== session.id) {
      throw new AuthorizationError("FEED_DELETE_FORBIDDEN");
    }

    await prisma.feed.delete({ where: { id: feedId } });

    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/feed`);
    revalidatePath(`/${locale}/admin`);
    revalidatePath(`/${locale}/${feed.user.username}`);
    return { success: true, message: msg(locale, "errors.feedDeleted") };
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return { success: false, message: msg(locale, "errors.authRequired") };
    }
    if (error instanceof AuthorizationError) {
      logger.warn("deleteFeedAction forbidden", { feedId: String(formData.get("feedId") ?? "") });
      return { success: false, message: msg(locale, "errors.forbidden") };
    }
    logger.error("deleteFeedAction failed", { error });
    return { success: false, message: msg(locale, "errors.feedDeleteFailed") };
  }
}

export async function createRepoAction(
  _prev: PlatformResult,
  formData: FormData
): Promise<PlatformResult> {
  const locale = localeOf(formData);
  try {
    const session = await requireSession();
    const name = String(formData.get("name") ?? "").trim().toLowerCase();
    const description = String(formData.get("description") ?? "").trim();
    const isPrivate = formData.get("isPrivate") === "on";

    if (name.length < 2) {
      return { success: false, message: msg(locale, "errors.repoNameShort") };
    }

    const repo = await prisma.repo.create({
      data: {
        name,
        description: description || null,
        isPrivate,
        ownerId: session.id,
      },
    });

    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/repos`);
    return {
      success: true,
      message: msg(locale, "errors.repoCreated", { name: repo.name }),
    };
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return { success: false, message: msg(locale, "errors.authRequired") };
    }
    logger.error("createRepoAction failed", { error });
    return { success: false, message: msg(locale, "errors.repoCreateFailed") };
  }
}

export async function forkRepoAction(
  _prev: PlatformResult,
  formData: FormData
): Promise<PlatformResult> {
  const locale = localeOf(formData);
  try {
    const session = await requireSession();
    const sourceRepoId = String(formData.get("sourceRepoId") ?? "");

    const source = await prisma.repo.findUnique({
      where: { id: sourceRepoId },
      include: { files: true },
    });

    if (!source) {
      return { success: false, message: msg(locale, "errors.sourceRepoNotFound") };
    }
    if (source.isPrivate) {
      return { success: false, message: msg(locale, "errors.privateForkDenied") };
    }
    if (source.isEncrypted) {
      return { success: false, message: msg(locale, "errors.encryptedForkDenied") };
    }

    const forkName = `${source.name}-fork-${session.username}`.slice(0, 60);

    const forked = await prisma.repo.create({
      data: {
        name: forkName,
        description: source.description,
        isPrivate: false,
        ownerId: session.id,
        files: {
          create: source.files.map((f) => ({
            path: f.path,
            content: f.content,
            encryptedContent: f.encryptedContent,
            mimeType: f.mimeType,
            size: f.size,
          })),
        },
      },
    });

    await prisma.fork.create({
      data: {
        sourceRepoId: source.id,
        forkedRepoId: forked.id,
        userId: session.id,
      },
    });

    revalidatePath(`/${locale}/repo/${forked.id}`);
    return { success: true, message: msg(locale, "errors.forkDone") };
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return { success: false, message: msg(locale, "errors.authRequired") };
    }
    logger.error("forkRepoAction failed", { error });
    return { success: false, message: msg(locale, "errors.forkFailed") };
  }
}

export async function updateProfileAction(
  _prev: PlatformResult,
  formData: FormData
): Promise<PlatformResult> {
  const locale = localeOf(formData);
  try {
    const session = await requireSession();
    const bio = String(formData.get("bio") ?? "").trim();

    const avatar = formData.get("avatar");
    const banner = formData.get("banner");

    let avatarUrl: string | undefined;
    let bannerUrl: string | undefined;

    if (avatar instanceof File && avatar.size > 0) {
      try {
        avatarUrl = await saveProfileImageUpload(avatar, "avatars");
        logger.info("updateProfileAction avatar uploaded", { userId: session.id, avatarUrl });
      } catch (uploadErr) {
        logger.error("updateProfileAction avatar upload failed", {
          userId: session.id,
          size: avatar.size,
          type: avatar.type,
          error: uploadErr,
        });
        if (uploadErr instanceof Error) {
          if (uploadErr.message === "FILE_TOO_LARGE") {
            return { success: false, message: msg(locale, "errors.fileTooLarge") };
          }
          if (uploadErr.message === "FILE_TYPE_BLOCKED") {
            return { success: false, message: msg(locale, "errors.fileTypeBlocked") };
          }
          if (uploadErr.message === "STORAGE_UNAVAILABLE") {
            return { success: false, message: msg(locale, "errors.storageUnavailable") };
          }
        }
        return { success: false, message: msg(locale, "errors.profileUpdateFailed") };
      }
    }

    if (banner instanceof File && banner.size > 0) {
      try {
        bannerUrl = await saveProfileImageUpload(banner, "banners");
        logger.info("updateProfileAction banner uploaded", { userId: session.id, bannerUrl });
      } catch (uploadErr) {
        logger.error("updateProfileAction banner upload failed", {
          userId: session.id,
          error: uploadErr,
        });
        return { success: false, message: msg(locale, "errors.profileUpdateFailed") };
      }
    }

    try {
      await prisma.user.update({
        where: { id: session.id },
        data: {
          bio: bio || null,
          ...(avatarUrl ? { avatarUrl } : {}),
          ...(bannerUrl ? { bannerUrl } : {}),
        },
      });
    } catch (dbErr) {
      logger.error("updateProfileAction database update failed", {
        userId: session.id,
        error: dbErr,
      });
      return { success: false, message: msg(locale, "errors.profileUpdateFailed") };
    }

    revalidatePath(`/${locale}/${session.username}`);
    revalidatePath(`/${locale}/settings`);
    return { success: true, message: msg(locale, "errors.profileUpdated") };
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return { success: false, message: msg(locale, "errors.authRequired") };
    }
    logger.error("updateProfileAction failed", { error });
    return { success: false, message: msg(locale, "errors.profileUpdateFailed") };
  }
}

export async function uploadRepoFileAction(
  _prev: PlatformResult,
  formData: FormData
): Promise<PlatformResult> {
  const locale = localeOf(formData);
  try {
    const session = await requireSession();
    const repoId = String(formData.get("repoId") ?? "");
    const filePath = String(formData.get("path") ?? "").trim();
    const file = formData.get("file");

    const repo = await prisma.repo.findUnique({ where: { id: repoId } });
    if (!repo) return { success: false, message: msg(locale, "errors.repoNotFound") };
    if (repo.ownerId !== session.id) {
      return { success: false, message: msg(locale, "errors.uploadNoPermission") };
    }
    if (repo.isEncrypted) {
      return { success: false, message: msg(locale, "errors.repoEncryptedUseClient") };
    }
    if (!(file instanceof File) || file.size === 0) {
      return { success: false, message: msg(locale, "errors.fileNotSelected") };
    }
    if (!filePath) {
      return { success: false, message: msg(locale, "errors.filePathRequired") };
    }

    const text = await file.text();

    if (repo.isPrivate) {
      await prisma.repoFile.upsert({
        where: { repoId_path: { repoId, path: filePath } },
        create: {
          repoId,
          path: filePath,
          encryptedContent: text,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
        },
        update: {
          encryptedContent: text,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
        },
      });
    } else {
      await prisma.repoFile.upsert({
        where: { repoId_path: { repoId, path: filePath } },
        create: {
          repoId,
          path: filePath,
          content: text,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
        },
        update: {
          content: text,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
        },
      });
    }

    revalidatePath(`/${locale}/repo/${repoId}`);
    return { success: true, message: msg(locale, "errors.fileUploaded") };
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return { success: false, message: msg(locale, "errors.authRequired") };
    }
    if (error instanceof Error && error.message === "FILE_TOO_LARGE") {
      return { success: false, message: msg(locale, "errors.fileTooLarge") };
    }
    if (error instanceof Error && error.message === "FILE_TYPE_BLOCKED") {
      return { success: false, message: msg(locale, "errors.fileTypeBlocked") };
    }
    logger.error("uploadRepoFileAction failed", { error });
    return { success: false, message: msg(locale, "errors.fileUploadFailed") };
  }
}
