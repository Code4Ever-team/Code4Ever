import { randomBytes } from "crypto";
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import {
  getStorageBucket,
  getSupabaseAdmin,
  isSupabaseStorageConfigured,
} from "@/lib/supabase-admin";

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

function buildObjectName(folder: MediaFolder, originalName: string): string {
  const ext = path.extname(originalName).replace(/[^a-zA-Z0-9.]/g, "") || "";
  const filename = `${Date.now()}-${randomBytes(8).toString("hex")}${ext}`;
  return `${folder}/${filename}`;
}

function classifyKind(mime: string): "image" | "video" | "file" {
  if (IMAGE_TYPES.has(mime)) return "image";
  if (VIDEO_TYPES.has(mime)) return "video";
  return "file";
}

/**
 * Supabase Storage — File.stream() ile belleğe tamponlamadan yükleme.
 * Bucket public olmalı; dönen URL getPublicUrl ile üretilir.
 */
async function saveToSupabaseStorage(
  file: File,
  objectPath: string,
  mime: string
): Promise<string> {
  const supabase = getSupabaseAdmin();
  const bucket = getStorageBucket();

  const { error } = await supabase.storage.from(bucket).upload(objectPath, file.stream(), {
    contentType: mime,
    upsert: false,
    duplex: "half",
  });

  if (error) {
    throw new Error(`SUPABASE_UPLOAD_FAILED: ${error.message}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
  if (!data.publicUrl) {
    throw new Error("SUPABASE_PUBLIC_URL_MISSING");
  }

  return data.publicUrl;
}

/** Vercel Blob — stream veya buffer ile yükleme. */
async function saveToVercelBlob(
  file: File,
  objectPath: string,
  mime: string,
  useStream: boolean
): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_NOT_CONFIGURED");
  }

  const body = useStream ? file.stream() : Buffer.from(await file.arrayBuffer());
  const { put } = await import("@vercel/blob");
  const blob = await put(objectPath, body, {
    access: "public",
    contentType: mime,
    addRandomSuffix: false,
  });

  if (!blob.url?.startsWith("http")) {
    throw new Error("BLOB_URL_INVALID");
  }

  return blob.url;
}

/** Yalnızca yerel geliştirme — Vercel'de kullanılmaz. */
async function saveToLocalDisk(
  file: File,
  objectPath: string
): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const dir = path.join(process.cwd(), "public", "uploads", path.dirname(objectPath));
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(process.cwd(), "public", "uploads", objectPath), buffer);
  return `/uploads/${objectPath}`;
}

export async function saveMediaUpload(file: File, folder: MediaFolder): Promise<SavedMedia> {
  const max = maxFor(folder);
  if (file.size > max) throw new Error("FILE_TOO_LARGE");

  const mime = file.type || "application/octet-stream";
  if (!FILE_TYPES.has(mime)) throw new Error("FILE_TYPE_BLOCKED");

  const kind = classifyKind(mime);
  const objectPath = buildObjectName(folder, file.name);

  let url: string | null = null;
  const errors: string[] = [];
  let streamConsumed = false;

  if (isSupabaseStorageConfigured()) {
    try {
      url = await saveToSupabaseStorage(file, objectPath, mime);
      streamConsumed = true;
      console.info("[media-upload] supabase ok", { objectPath, bytes: file.size });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`supabase: ${msg}`);
      streamConsumed = true;
      console.error("[media-upload] supabase failed", { objectPath, error: msg });
    }
  }

  if (!url && process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      url = await saveToVercelBlob(file, objectPath, mime, !streamConsumed);
      console.info("[media-upload] vercel blob ok", { objectPath });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`blob: ${msg}`);
      console.error("[media-upload] vercel blob failed", { objectPath, error: msg });
    }
  }

  if (!url && !process.env.VERCEL) {
    try {
      url = await saveToLocalDisk(file, objectPath);
      console.info("[media-upload] local disk ok", { objectPath });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`local: ${msg}`);
      console.error("[media-upload] local failed", { objectPath, error: msg });
    }
  }

  if (!url) {
    console.error("[media-upload] all backends failed", { errors, folder, size: file.size });
    throw new Error("STORAGE_UNAVAILABLE");
  }

  return { url, mimeType: mime, kind, fileName: file.name };
}
