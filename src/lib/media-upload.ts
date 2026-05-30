import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

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

function maxFor(folder: MediaFolder) {
  return folder === "chat-media" ? CHAT_MAX : FEED_MAX;
}

async function saveToVercelBlob(
  buffer: Buffer,
  folder: MediaFolder,
  filename: string,
  mime: string
): Promise<string | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const { put } = await import("@vercel/blob");
    const blob = await put(`${folder}/${filename}`, buffer, {
      access: "public",
      contentType: mime,
    });
    return blob.url;
  } catch {
    return null;
  }
}

export async function saveMediaUpload(
  file: File,
  folder: MediaFolder
): Promise<{ url: string; mimeType: string; kind: "image" | "video" | "file"; fileName: string }> {
  const max = maxFor(folder);
  if (file.size > max) throw new Error("FILE_TOO_LARGE");

  const mime = file.type || "application/octet-stream";
  if (!FILE_TYPES.has(mime)) throw new Error("FILE_TYPE_BLOCKED");

  let kind: "image" | "video" | "file" = "file";
  if (IMAGE_TYPES.has(mime)) kind = "image";
  else if (VIDEO_TYPES.has(mime)) kind = "video";

  const ext = path.extname(file.name).replace(/[^a-zA-Z0-9.]/g, "") || "";
  const filename = `${Date.now()}-${randomBytes(8).toString("hex")}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const blobUrl = await saveToVercelBlob(buffer, folder, filename, mime);
  if (blobUrl) {
    return { url: blobUrl, mimeType: mime, kind, fileName: file.name };
  }

  if (process.env.VERCEL) {
    throw new Error("STORAGE_UNAVAILABLE");
  }

  try {
    const dir = path.join(process.cwd(), "public", "uploads", folder);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), buffer);
  } catch {
    throw new Error("STORAGE_UNAVAILABLE");
  }

  return {
    url: `/uploads/${folder}/${filename}`,
    mimeType: mime,
    kind,
    fileName: file.name,
  };
}
