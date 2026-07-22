import type { RepoFile } from "@prisma/client";

export interface RepoFileWire {
  path: string;
  content: string;
  ciphertext: string | null;
  nonce: string | null;
  revision: number;
}

export function toWireFiles(
  files: Pick<
    RepoFile,
    "path" | "content" | "encryptedContent" | "ciphertext" | "nonce" | "revision"
  >[],
  isEncrypted: boolean
): RepoFileWire[] {
  return files.map((f) => {
    if (isEncrypted) {
      return {
        path: f.path,
        content: "",
        ciphertext: f.ciphertext ?? f.encryptedContent ?? null,
        nonce: f.nonce ?? null,
        revision: f.revision ?? 0,
      };
    }
    return {
      path: f.path,
      content: f.content ?? f.encryptedContent ?? "",
      ciphertext: null,
      nonce: null,
      revision: f.revision ?? 0,
    };
  });
}

export function readPlainFile(f: {
  content: string | null;
  encryptedContent: string | null;
  ciphertext?: string | null;
}): string {
  return f.content ?? f.encryptedContent ?? "";
}
