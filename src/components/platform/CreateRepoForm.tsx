"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { createRepoAction } from "@/lib/actions/platform.actions";
import type { PlatformResult } from "@/lib/actions/platform.actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Form } from "@/components/ui/Form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SecurityLockModal } from "@/components/security/SecurityLockModal";
import { useState } from "react";

const initial: PlatformResult = { success: false, message: "" };

function SubmitBtn() {
  const { pending } = useFormStatus();
  const t = useTranslations("platform");
  return (
    <Button type="submit" disabled={pending}>
      {pending ? t("repoSubmitting") : t("repoSubmit")}
    </Button>
  );
}

interface CreateRepoFormProps {
  locale: string;
  isLoggedIn: boolean;
}

export function CreateRepoForm({ locale, isLoggedIn }: CreateRepoFormProps) {
  const t = useTranslations("platform");
  const [lockOpen, setLockOpen] = useState(false);
  const [state, action] = useFormState(createRepoAction, initial);

  if (!isLoggedIn) {
    return (
      <>
        <Button type="button" variant="secondary" onClick={() => setLockOpen(true)}>
          {t("createRepo")}
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

  return (
    <Card className="mb-6 p-4">
      <Form action={action} className="space-y-3">
        <input type="hidden" name="locale" value={locale} />
        <div className="space-y-2">
          <Label htmlFor="repo-name">{t("repoName")}</Label>
          <Input id="repo-name" name="name" required minLength={2} maxLength={60} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="repo-desc">{t("repoDescription")}</Label>
          <Textarea id="repo-desc" name="description" rows={2} maxLength={500} />
        </div>
        <label className="flex items-center gap-2 text-sm text-c4e-muted">
          <input type="checkbox" name="isPrivate" className="rounded border-border" />
          {t("repoPrivate")}
        </label>
        <SubmitBtn />
        {state.message && (
          <p className={`text-sm ${state.success ? "text-c4e-neon" : "text-destructive"}`}>
            {state.message}
          </p>
        )}
      </Form>
    </Card>
  );
}
