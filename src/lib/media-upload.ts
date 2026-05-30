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

export async function saveMediaUpload(
  file: File,
  folder: MediaFolder
): Promise<{ url: string; mimeType: string; kind: "image" | "video" | "file" }> {
  const max = maxFor(folder);
  if (file.size > max) throw new Error("FILE_TOO_LARGE");

  const mime = file.type || "application/octet-stream";
  if (!FILE_TYPES.has(mime)) throw new Error("FILE_TYPE_BLOCKED");

  let kind: "image" | "video" | "file" = "file";
  if (IMAGE_TYPES.has(mime)) kind = "image";
  else if (VIDEO_TYPES.has(mime)) kind = "video";

  const ext = path.extname(file.name).replace(/[^a-zA-Z0-9.]/g, "") || "";
  const filename = `${Date.now()}-${randomBytes(8).toString("hex")}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(dir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  return {
    url: `/uploads/${folder}/${filename}`,
    mimeType: mime,
    kind,
  };
}
