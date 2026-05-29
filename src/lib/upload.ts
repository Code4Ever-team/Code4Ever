import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

const MAX_BYTES = 2 * 1024 * 1024; // 2MB

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

export async function savePublicUpload(
  file: File,
  folder: "avatars" | "banners" | "repo-files"
): Promise<string> {
  if (file.size > MAX_BYTES) {
    throw new Error("FILE_TOO_LARGE");
  }

  const ext = (path.extname(file.name) || "").toLowerCase();
  if (BLOCKED_EXT.has(ext)) {
    throw new Error("FILE_TYPE_BLOCKED");
  }

  if (folder !== "repo-files") {
    if (!file.type.startsWith("image/")) {
      throw new Error("FILE_TYPE_BLOCKED");
    }
  } else if (file.type && !ALLOWED_MIME.has(file.type)) {
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
