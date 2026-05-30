import { randomBytes } from "crypto";
import path from "path";
import { Readable } from "stream";
import type { ReadableStream as NodeReadableStream } from "stream/web";
import { mkdir, writeFile } from "fs/promises";
import { Upload } from "@aws-sdk/lib-storage";
import {
  buildS3PublicUrl,
  getS3Bucket,
  getS3Client,
  isS3Configured,
} from "@/lib/s3-client";

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

function buildObjectKey(folder: MediaFolder, originalName: string): string {
  const ext = path.extname(originalName).replace(/[^a-zA-Z0-9.]/g, "") || "";
  const filename = `${Date.now()}-${randomBytes(8).toString("hex")}${ext}`;
  return `${folder}/${filename}`;
}

function classifyKind(mime: string): "image" | "video" | "file" {
  if (IMAGE_TYPES.has(mime)) return "image";
  if (VIDEO_TYPES.has(mime)) return "video";
  return "file";
}

function fileToNodeStream(file: File): Readable {
  return Readable.fromWeb(file.stream() as unknown as NodeReadableStream);
}

/**
 * Multipart stream upload — dosya belleğe tamponlanmaz.
 */
async function saveToS3Stream(
  file: File,
  objectKey: string,
  mime: string
): Promise<string> {
  const client = getS3Client();
  const bucket = getS3Bucket();

  const upload = new Upload({
    client,
    params: {
      Bucket: bucket,
      Key: objectKey,
      Body: fileToNodeStream(file),
      ContentType: mime,
      ContentLength: file.size,
    },
    queueSize: 2,
    partSize: 5 * 1024 * 1024,
    leavePartsOnError: false,
  });

  await upload.done();

  const publicUrl = buildS3PublicUrl(objectKey);
  if (!publicUrl.startsWith("http")) {
    throw new Error("S3_PUBLIC_URL_INVALID");
  }

  return publicUrl;
}

/** Yalnızca yerel geliştirme — production'da S3 zorunlu. */
async function saveToLocalDisk(file: File, objectKey: string): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const dir = path.join(process.cwd(), "public", "uploads", path.dirname(objectKey));
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(process.cwd(), "public", "uploads", objectKey), buffer);
  return `/uploads/${objectKey}`;
}

export async function saveMediaUpload(file: File, folder: MediaFolder): Promise<SavedMedia> {
  const max = maxFor(folder);
  if (file.size > max) throw new Error("FILE_TOO_LARGE");

  const mime = file.type || "application/octet-stream";
  if (!FILE_TYPES.has(mime)) throw new Error("FILE_TYPE_BLOCKED");

  const kind = classifyKind(mime);
  const objectKey = buildObjectKey(folder, file.name);

  let url: string;

  try {
    if (isS3Configured()) {
      url = await saveToS3Stream(file, objectKey, mime);
      console.info("[media-upload] s3 ok", { objectKey, bytes: file.size });
    } else if (!process.env.VERCEL) {
      url = await saveToLocalDisk(file, objectKey);
      console.info("[media-upload] local ok", { objectKey });
    } else {
      throw new Error("S3_NOT_CONFIGURED");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[UPLOAD_ERROR] saveMediaUpload failed", {
      objectKey,
      bytes: file.size,
      message,
      stack: error instanceof Error ? error.stack : undefined,
    });
    if (message === "S3_NOT_CONFIGURED" || message.startsWith("S3_")) {
      throw new Error("STORAGE_UNAVAILABLE");
    }
    throw error;
  }

  return { url, mimeType: mime, kind, fileName: file.name };
}
