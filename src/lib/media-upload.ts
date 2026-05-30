import { randomBytes } from "crypto";
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { blobPathname, isBlobConfigured, uploadToBlob } from "@/lib/blob-storage";

const CHAT_MAX = 15 * 1024 * 1024;
const FEED_MAX = 10 * 1024 * 1024;

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const FILE_TYPES = new Set<string>([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "application/pdf",
  "text/plain",
  "application/zip",
]);

export type MediaFolder = "chat-media" | "feed-media";

export type SavedMedia = {
  url: string;
  mimeType: string;
  kind: "image" | "video" | "file";
  fileName: string;
};

function maxFor(folder: MediaFolder) {
  return folder === "chat-media" ? CHAT_MAX : FEED_MAX;
}

function buildFilename(originalName: string): string {
  const ext = path.extname(originalName).replace(/[^a-zA-Z0-9.]/g, "") || "";
  return `${Date.now()}-${randomBytes(8).toString("hex")}${ext}`;
}

function classifyKind(mime: string): "image" | "video" | "file" {
  if (IMAGE_TYPES.has(mime)) return "image";
  if (VIDEO_TYPES.has(mime)) return "video";
  return "file";
}

async function saveToLocalDisk(
  file: File,
  folder: MediaFolder,
  filename: string
): Promise<string> {
  const objectKey = `${folder}/${filename}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const dir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);
  return `/uploads/${objectKey}`;
}

export async function saveMediaUpload(file: File, folder: MediaFolder): Promise<SavedMedia> {
  if (file.size > maxFor(folder)) throw new Error("FILE_TOO_LARGE");

  const mime = file.type || "application/octet-stream";
  if (!FILE_TYPES.has(mime)) throw new Error("FILE_TYPE_BLOCKED");

  const filename = buildFilename(file.name);
  const kind = classifyKind(mime);

  try {
    let url: string;

    if (isBlobConfigured()) {
      url = await uploadToBlob(file, blobPathname(folder, filename), mime);
    } else if (!process.env.VERCEL) {
      url = await saveToLocalDisk(file, folder, filename);
    } else {
      throw new Error("BLOB_NOT_CONFIGURED");
    }

    if (!url.startsWith("http") && !url.startsWith("/uploads/")) {
      throw new Error("BLOB_URL_INVALID");
    }

    return { url, mimeType: mime, kind, fileName: file.name };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[UPLOAD_ERROR] saveMediaUpload", { folder, filename, message });
    if (message === "BLOB_NOT_CONFIGURED" || message.startsWith("BLOB_")) {
      throw new Error("STORAGE_UNAVAILABLE");
    }
    throw error;
  }
}

export { isBlobConfigured } from "@/lib/blob-storage";
