/**
 * İstemci tarafı E2EE mesajlaşma (Web Crypto API).
 * Özel anahtar yalnızca localStorage'da; sunucuya düz metin gitmez.
 */

const PRIVATE_KEY_STORAGE = "c4e_chat_private_jwk";

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
}

function bufToB64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function b64ToBuf(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export async function getOrCreateChatKeyPair(): Promise<CryptoKeyPair> {
  if (typeof window === "undefined") {
    throw new Error("CHAT_CRYPTO_CLIENT_ONLY");
  }

  const stored = localStorage.getItem(PRIVATE_KEY_STORAGE);
  if (stored) {
    const privateJwk = JSON.parse(stored) as JsonWebKey;
    const publicJwk = { ...privateJwk };
    delete publicJwk.d;
    const privateKey = await crypto.subtle.importKey(
      "jwk",
      privateJwk,
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveKey"]
    );
    const publicKey = await crypto.subtle.importKey(
      "jwk",
      publicJwk,
      { name: "ECDH", namedCurve: "P-256" },
      true,
      []
    );
    return { privateKey, publicKey };
  }

  const pair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey"]
  );

  const privateJwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  localStorage.setItem(PRIVATE_KEY_STORAGE, JSON.stringify(privateJwk));

  return pair;
}

export async function exportPublicKeyJwk(publicKey: CryptoKey): Promise<string> {
  const jwk = await crypto.subtle.exportKey("jwk", publicKey);
  return JSON.stringify(jwk);
}

export async function importPublicKeyJwk(jwkJson: string): Promise<CryptoKey> {
  const jwk = JSON.parse(jwkJson) as JsonWebKey;
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    []
  );
}

async function deriveAesKey(privateKey: CryptoKey, publicKey: CryptoKey): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    { name: "ECDH", public: publicKey },
    privateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptMessage(
  plaintext: string,
  myPrivateKey: CryptoKey,
  theirPublicKey: CryptoKey
): Promise<EncryptedPayload> {
  const aesKey = await deriveAesKey(myPrivateKey, theirPublicKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, encoded);

  return {
    ciphertext: bufToB64(ciphertext),
    iv: bufToB64(iv.buffer),
  };
}

export async function decryptMessage(
  payload: EncryptedPayload,
  myPrivateKey: CryptoKey,
  theirPublicKey: CryptoKey
): Promise<string> {
  const aesKey = await deriveAesKey(myPrivateKey, theirPublicKey);
  const iv = new Uint8Array(b64ToBuf(payload.iv));
  const ciphertext = b64ToBuf(payload.ciphertext);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, aesKey, ciphertext);
  return new TextDecoder().decode(decrypted);
}

export function serializePayload(payload: EncryptedPayload): string {
  return JSON.stringify(payload);
}

export function parsePayload(raw: string): EncryptedPayload {
  return JSON.parse(raw) as EncryptedPayload;
}

export async function encryptBinaryWithPeer(
  data: ArrayBuffer,
  myPrivateKey: CryptoKey,
  theirPublicKey: CryptoKey
): Promise<EncryptedPayload> {
  const aesKey = await deriveAesKey(myPrivateKey, theirPublicKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, data);
  return { ciphertext: bufToB64(ciphertext), iv: bufToB64(iv.buffer) };
}

export async function decryptBinaryWithPeer(
  payload: EncryptedPayload,
  myPrivateKey: CryptoKey,
  theirPublicKey: CryptoKey
): Promise<ArrayBuffer> {
  const aesKey = await deriveAesKey(myPrivateKey, theirPublicKey);
  const iv = new Uint8Array(b64ToBuf(payload.iv));
  return crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    aesKey,
    b64ToBuf(payload.ciphertext)
  );
}
