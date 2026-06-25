"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { enableRepoEncryptionAction } from "@/lib/actions/repo.actions";
import {
  createKeyEnvelope,
  encryptText,
  generateDek,
  serializeEnvelope,
  storeRepoDek,
} from "@/lib/crypto/e2ee-repo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RepoSecuritySettingsProps {
  locale: string;
  repoId: string;
  isEncrypted: boolean;
  files: Array<{ path: string; content: string }>;
}

export function RepoSecuritySettings({
  locale,
  repoId,
  isEncrypted,
  files,
}: RepoSecuritySettingsProps) {
  const t = useTranslations("repoSecurity");
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleEncrypt() {
    if (password.length < 8) {
      setError(t("passwordShort"));
      return;
    }
    if (password !== confirm) {
      setError(t("passwordMismatch"));
      return;
    }

    startTransition(async () => {
      setError(null);
      try {
        const dek = await generateDek();
        const envelope = await createKeyEnvelope(password, dek);
        await storeRepoDek(repoId, dek);

        const encryptedFiles = await Promise.all(
          files.map(async (f) => {
            const blob = await encryptText(dek, f.content);
            return { path: f.path, ciphertext: blob.ciphertext, nonce: blob.nonce };
          })
        );

        const fd = new FormData();
        fd.set("locale", locale);
        fd.set("repoId", repoId);
        fd.set("keyEnvelope", serializeEnvelope(envelope));
        fd.set("encryptedFiles", JSON.stringify(encryptedFiles));

        const result = await enableRepoEncryptionAction({ success: false, message: "" }, fd);
        if (!result.success) {
          setError(result.message);
          return;
        }
        router.refresh();
      } catch {
        setError(t("encryptFailed"));
      }
    });
  }

  return (
    <Card className="mt-6 p-6">
      <h2 className="text-lg font-semibold text-foreground">{t("title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("desc")}</p>

      {isEncrypted ? (
        <p className="mt-4 text-sm text-primary">{t("encryptedActive")}</p>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="space-y-1">
            <Label htmlFor="enc-pass">{t("password")}</Label>
            <Input
              id="enc-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="enc-confirm">{t("passwordConfirm")}</Label>
            <Input
              id="enc-confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <p className="text-xs text-amber-400">{t("warning")}</p>
          <Button type="button" disabled={pending} onClick={handleEncrypt}>
            {pending ? t("encrypting") : t("encryptButton")}
          </Button>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </Card>
  );
}
