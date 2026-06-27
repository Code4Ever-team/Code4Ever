import { put } from "@vercel/blob";

export type BlobMediaFolder = "chat-media" | "feed-media" | "avatars" | "banners";

export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

/** file.stream() ile belleğe tamponlamadan Vercel Blob'a yükle. */
export async function uploadToBlob(
  file: File,
  pathname: string,
  mime: string
): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) throw new Error("BLOB_NOT_CONFIGURED");

  const blob = await put(pathname, file.stream(), {
    access: "public",
    contentType: mime,
    token,
    addRandomSuffix: false,
  });

  if (!blob.url?.startsWith("http")) {
    throw new Error("BLOB_URL_INVALID");
  }

  return blob.url;
}

export function blobPathname(folder: BlobMediaFolder, filename: string): string {
  return `${folder}/${filename}`;
}
