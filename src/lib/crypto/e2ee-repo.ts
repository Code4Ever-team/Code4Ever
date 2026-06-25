/**
 * Repo E2EE — Web Crypto API only. Password/DEK sunucuya gitmez.
 */

const PBKDF2_ITERATIONS = 310_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

export interface KeyEnvelope {
  v: 1;
  kdf: "PBKDF2";
  iterations: number;
  salt: string;
  wrapIv: string;
  wrappedDek: string;
}

export interface EncryptedBlob {
  ciphertext: string;
  nonce: string;
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

function assertClient() {
  if (typeof window === "undefined") throw new Error("REPO_CRYPTO_CLIENT_ONLY");
}

export async function deriveKek(password: string, salt: ArrayBuffer): Promise<CryptoKey> {
  assertClient();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function generateDek(): Promise<CryptoKey> {
  assertClient();
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
}

export async function exportDekRaw(dek: CryptoKey): Promise<ArrayBuffer> {
  return crypto.subtle.exportKey("raw", dek);
}

export async function importDekRaw(raw: ArrayBuffer): Promise<CryptoKey> {
  assertClient();
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM", length: 256 }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function wrapDek(dek: CryptoKey, kek: CryptoKey): Promise<{ iv: string; wrapped: string }> {
  const raw = await exportDekRaw(dek);
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const wrapped = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, kek, raw);
  return { iv: bufToB64(iv.buffer), wrapped: bufToB64(wrapped) };
}

export async function unwrapDek(wrappedB64: string, ivB64: string, kek: CryptoKey): Promise<CryptoKey> {
  const raw = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(b64ToBuf(ivB64)) },
    kek,
    b64ToBuf(wrappedB64)
  );
  return importDekRaw(raw);
}

export async function createKeyEnvelope(password: string, dek: CryptoKey): Promise<KeyEnvelope> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const kek = await deriveKek(password, salt.buffer);
  const { iv, wrapped } = await wrapDek(dek, kek);
  return {
    v: 1,
    kdf: "PBKDF2",
    iterations: PBKDF2_ITERATIONS,
    salt: bufToB64(salt.buffer),
    wrapIv: iv,
    wrappedDek: wrapped,
  };
}

export async function unlockDekFromEnvelope(
  password: string,
  envelopeJson: string
): Promise<CryptoKey> {
  const envelope = JSON.parse(envelopeJson) as KeyEnvelope;
  const kek = await deriveKek(password, b64ToBuf(envelope.salt));
  return unwrapDek(envelope.wrappedDek, envelope.wrapIv, kek);
}

export async function encryptText(dek: CryptoKey, plaintext: string): Promise<EncryptedBlob> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    dek,
    new TextEncoder().encode(plaintext)
  );
  return { ciphertext: bufToB64(ciphertext), nonce: bufToB64(iv.buffer) };
}

export async function decryptText(
  dek: CryptoKey,
  ciphertext: string,
  nonce: string
): Promise<string> {
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(b64ToBuf(nonce)) },
    dek,
    b64ToBuf(ciphertext)
  );
  return new TextDecoder().decode(plain);
}

const DEK_STORAGE_PREFIX = "c4e_repo_dek_";
const dekByRepo = new Map<string, CryptoKey>();

export async function storeRepoDek(repoId: string, dek: CryptoKey): Promise<void> {
  dekByRepo.set(repoId, dek);
  if (typeof window !== "undefined") {
    const raw = await exportDekRaw(dek);
    localStorage.setItem(`${DEK_STORAGE_PREFIX}${repoId}`, bufToB64(raw));
  }
}

export function getRepoDek(repoId: string): CryptoKey | null {
  return dekByRepo.get(repoId) ?? null;
}

export async function loadPersistedRepoDek(repoId: string): Promise<CryptoKey | null> {
  const cached = dekByRepo.get(repoId);
  if (cached) return cached;
  if (typeof window === "undefined") return null;

  const stored = localStorage.getItem(`${DEK_STORAGE_PREFIX}${repoId}`);
  if (!stored) return null;

  try {
    const dek = await importDekRaw(b64ToBuf(stored));
    dekByRepo.set(repoId, dek);
    return dek;
  } catch {
    localStorage.removeItem(`${DEK_STORAGE_PREFIX}${repoId}`);
    return null;
  }
}

export function clearRepoDek(repoId: string) {
  dekByRepo.delete(repoId);
  if (typeof window !== "undefined") {
    localStorage.removeItem(`${DEK_STORAGE_PREFIX}${repoId}`);
  }
}

export function serializeEnvelope(envelope: KeyEnvelope): string {
  return JSON.stringify(envelope);
}
