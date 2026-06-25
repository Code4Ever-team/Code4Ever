/**
 * İstemci tarafı dosya/medya şifreleme (Web Crypto API).
 */

const IV_BYTES = 12;

function assertClient() {
  if (typeof window === "undefined") throw new Error("BLOB_CRYPTO_CLIENT_ONLY");
}

function bufToB64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

function b64ToBuf(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export async function generateMediaKey(): Promise<CryptoKey> {
  assertClient();
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

export async function exportMediaKeyB64(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return bufToB64(raw);
}

export async function importMediaKeyB64(b64: string): Promise<CryptoKey> {
  assertClient();
  return crypto.subtle.importKey("raw", b64ToBuf(b64), { name: "AES-GCM", length: 256 }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptBlob(
  key: CryptoKey,
  data: ArrayBuffer
): Promise<{ ciphertext: ArrayBuffer; nonce: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  return { ciphertext, nonce: bufToB64(iv.buffer) };
}

export async function decryptBlob(
  key: CryptoKey,
  ciphertext: ArrayBuffer,
  nonce: string
): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(b64ToBuf(nonce)) },
    key,
    ciphertext
  );
}

export async function encryptFileForUpload(
  file: File
): Promise<{ blob: Blob; nonce: string; keyB64: string; mimeType: string; fileName: string }> {
  const mediaKey = await generateMediaKey();
  const data = await file.arrayBuffer();
  const { ciphertext, nonce } = await encryptBlob(mediaKey, data);
  const keyB64 = await exportMediaKeyB64(mediaKey);
  return {
    blob: new Blob([ciphertext], { type: "application/octet-stream" }),
    nonce,
    keyB64,
    mimeType: file.type || "application/octet-stream",
    fileName: file.name,
  };
}

export async function decryptMediaToObjectUrl(
  url: string,
  nonce: string,
  keyB64: string,
  mimeType: string
): Promise<string> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error("fetch_failed");
  const ciphertext = await res.arrayBuffer();
  const key = await importMediaKeyB64(keyB64);
  const plain = await decryptBlob(key, ciphertext, nonce);
  return URL.createObjectURL(new Blob([plain], { type: mimeType }));
}
