"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { createFeedAction } from "@/lib/actions/platform.actions";
import type { PlatformResult } from "@/lib/actions/platform.actions";
import { encryptFileForUpload } from "@/lib/crypto/e2ee-blob";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Form } from "@/components/ui/Form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SecurityLockModal } from "@/components/security/SecurityLockModal";

const initial: PlatformResult = { success: false, message: "" };

function SubmitBtn({ encrypting }: { encrypting: boolean }) {
  const { pending } = useFormStatus();
  const t = useTranslations("platform");
  const busy = pending || encrypting;
  return (
    <Button type="submit" disabled={busy}>
      {busy ? t("feedSubmitting") : t("feedSubmit")}
    </Button>
  );
}

interface CreateFeedFormProps {
  locale: string;
  isLoggedIn: boolean;
}

export function CreateFeedForm({ locale, isLoggedIn }: CreateFeedFormProps) {
  const t = useTranslations("platform");
  const [lockOpen, setLockOpen] = useState(false);
  const [encrypting, setEncrypting] = useState(false);
  const [state, action] = useFormState(createFeedAction, initial);
  const formRef = useRef<HTMLFormElement>(null);

  if (!isLoggedIn) {
    return (
      <>
        <Button type="button" variant="secondary" onClick={() => setLockOpen(true)}>
          {t("postFeed")}
        </Button>
        <SecurityLockModal
          open={lockOpen}
          onClose={() => setLockOpen(false)}
          title={t("guestLockTitle")}
          description={t("guestLockDesc")}
        />
      </>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const mediaInput = form.querySelector<HTMLInputElement>('input[name="media"]');
    const file = mediaInput?.files?.[0];

    try {
      if (file && file.size > 0) {
        setEncrypting(true);
        const enc = await encryptFileForUpload(file);
        fd.set("media", new File([enc.blob], "media.enc", { type: "application/octet-stream" }));
        fd.set("mediaNonce", enc.nonce);
        fd.set("mediaKey", enc.keyB64);
        fd.set("originalMime", enc.mimeType);
      }
      setEncrypting(false);
      await action(fd);
      form.reset();
    } catch {
      setEncrypting(false);
    }
  }

  return (
    <Card className="mb-6 p-4">
      <Form ref={formRef} action={action} onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
        <input type="hidden" name="locale" value={locale} />
        <div className="space-y-2">
          <Label htmlFor="feed-content">{t("postFeed")}</Label>
          <Textarea
            id="feed-content"
            name="content"
            placeholder={t("feedPlaceholder")}
            rows={4}
            maxLength={10000}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="feed-media">{t("feedMedia")}</Label>
          <input
            id="feed-media"
            name="media"
            type="file"
            accept="image/*,video/*,application/pdf,.doc,.docx,.txt"
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground"
          />
        </div>
        <SubmitBtn encrypting={encrypting} />
        {state.message && (
          <p className={`text-sm ${state.success ? "text-c4e-neon" : "text-destructive"}`}>
            {state.message}
          </p>
        )}
      </Form>
    </Card>
  );
}
