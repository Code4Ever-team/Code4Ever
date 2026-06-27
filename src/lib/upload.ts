import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { blobPathname, isBlobConfigured, uploadToBlob } from "@/lib/blob-storage";
import { logger } from "@/lib/logger";

const MAX_BYTES = 2 * 1024 * 1024; // 2MB

const PROFILE_IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "text/plain",
  "text/markdown",
  "application/json",
  "application/javascript",
  "text/javascript",
  "text/css",
  "text/html",
]);

const BLOCKED_EXT = new Set([
  ".exe",
  ".bat",
  ".cmd",
  ".sh",
  ".ps1",
  ".msi",
  ".dll",
  ".scr",
  ".jar",
  ".php",
  ".asp",
  ".aspx",
]);

function buildFilename(originalName: string): string {
  const ext = path.extname(originalName).replace(/[^a-zA-Z0-9.]/g, "").toLowerCase();
  const safeExt = [".jpg", ".jpeg", ".png", ".webp"].includes(ext) ? ext : ".jpg";
  return `${Date.now()}-${randomBytes(8).toString("hex")}${safeExt}`;
}

function assertProfileImage(file: File): void {
  if (file.size > MAX_BYTES) {
    throw new Error("FILE_TOO_LARGE");
  }
  const mime = (file.type || "").toLowerCase();
  if (!PROFILE_IMAGE_MIME.has(mime)) {
    throw new Error("FILE_TYPE_BLOCKED");
  }
  const ext = (path.extname(file.name) || "").toLowerCase();
  if (ext && ![".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
    throw new Error("FILE_TYPE_BLOCKED");
  }
}

async function saveProfileToLocalDisk(
  file: File,
  folder: "avatars" | "banners",
  filename: string
): Promise<string> {
  const dir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(dir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);
  return `/uploads/${folder}/${filename}`;
}

/** Profile avatar/banner — jpeg/png/webp; Vercel Blob when configured. */
export async function saveProfileImageUpload(
  file: File,
  folder: "avatars" | "banners"
): Promise<string> {
  assertProfileImage(file);
  const mime = file.type || "image/jpeg";
  const filename = buildFilename(file.name);

  try {
    if (isBlobConfigured()) {
      const url = await uploadToBlob(file, blobPathname(folder, filename), mime);
      logger.info("saveProfileImageUpload blob ok", { folder, mime });
      return url;
    }

    if (process.env.VERCEL) {
      throw new Error("STORAGE_UNAVAILABLE");
    }

    const url = await saveProfileToLocalDisk(file, folder, filename);
    logger.info("saveProfileImageUpload local ok", { folder, url });
    return url;
  } catch (error) {
    logger.error("saveProfileImageUpload failed", {
      folder,
      mime,
      size: file.size,
      error,
    });
    if (error instanceof Error) {
      if (error.message === "BLOB_NOT_CONFIGURED" || error.message.startsWith("BLOB_")) {
        throw new Error("STORAGE_UNAVAILABLE");
      }
      throw error;
    }
    throw new Error("UPLOAD_FAILED");
  }
}

export async function savePublicUpload(
  file: File,
  folder: "avatars" | "banners" | "repo-files"
): Promise<string> {
  if (folder === "avatars" || folder === "banners") {
    return saveProfileImageUpload(file, folder);
  }

  if (file.size > MAX_BYTES) {
    throw new Error("FILE_TOO_LARGE");
  }

  const ext = (path.extname(file.name) || "").toLowerCase();
  if (BLOCKED_EXT.has(ext)) {
    throw new Error("FILE_TYPE_BLOCKED");
  }

  if (file.type && !ALLOWED_MIME.has(file.type)) {
    throw new Error("FILE_TYPE_BLOCKED");
  }

  const safeExt = ext.replace(/[^a-zA-Z0-9.]/g, "") || "";
  const filename = `${Date.now()}-${randomBytes(6).toString("hex")}${safeExt}`;
  const dir = path.join(process.cwd(), "public", "uploads", folder);

  await mkdir(dir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  return `/uploads/${folder}/${filename}`;
}
