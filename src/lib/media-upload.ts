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
  isInvalidAccessKeyError,
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
  return `${folder}/${Date.now()}-${randomBytes(8).toString("hex")}${ext}`;
}

function classifyKind(mime: string): "image" | "video" | "file" {
  if (IMAGE_TYPES.has(mime)) return "image";
  if (VIDEO_TYPES.has(mime)) return "video";
  return "file";
}

async function uploadStreamToS3(file: File, objectKey: string, mime: string): Promise<string> {
  const body = Readable.fromWeb(file.stream() as unknown as NodeReadableStream);

  await new Upload({
    client: getS3Client(),
    params: {
      Bucket: getS3Bucket(),
      Key: objectKey,
      Body: body,
      ContentType: mime,
      ContentLength: file.size,
    },
    queueSize: 2,
    partSize: 5 * 1024 * 1024,
    leavePartsOnError: false,
  }).done();

  return buildS3PublicUrl(objectKey);
}

async function saveToLocalDisk(file: File, objectKey: string): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const dir = path.join(process.cwd(), "public", "uploads", path.dirname(objectKey));
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(process.cwd(), "public", "uploads", objectKey), buffer);
  return `/uploads/${objectKey}`;
}

export async function saveMediaUpload(file: File, folder: MediaFolder): Promise<SavedMedia> {
  if (file.size > maxFor(folder)) throw new Error("FILE_TOO_LARGE");

  const mime = file.type || "application/octet-stream";
  if (!FILE_TYPES.has(mime)) throw new Error("FILE_TYPE_BLOCKED");

  const objectKey = buildObjectKey(folder, file.name);
  const kind = classifyKind(mime);

  try {
    let url: string;

    if (isS3Configured()) {
      url = await uploadStreamToS3(file, objectKey, mime);
    } else if (!process.env.VERCEL) {
      url = await saveToLocalDisk(file, objectKey);
    } else {
      throw new Error("S3_NOT_CONFIGURED");
    }

    if (!url.startsWith("http")) throw new Error("S3_PUBLIC_URL_INVALID");
    return { url, mimeType: mime, kind, fileName: file.name };
  } catch (error) {
    if (isInvalidAccessKeyError(error)) {
      console.error("[UPLOAD_ERROR] InvalidAccessKeyId — Supabase S3 credentials", {
        hint: "AWS_ACCESS_KEY_ID=anon key, AWS_SECRET_ACCESS_KEY=service_role key",
        endpoint: process.env.AWS_S3_ENDPOINT ? "set" : "missing",
      });
      throw new Error("STORAGE_UNAVAILABLE");
    }

    const message = error instanceof Error ? error.message : String(error);
    console.error("[UPLOAD_ERROR] saveMediaUpload", { objectKey, message });
    if (message === "S3_NOT_CONFIGURED" || message.startsWith("S3_")) {
      throw new Error("STORAGE_UNAVAILABLE");
    }
    throw error;
  }
}
