"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { forkRepoAction } from "@/lib/actions/platform.actions";
import type { PlatformResult } from "@/lib/actions/platform.actions";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/Form";
import { SecurityLockModal } from "@/components/security/SecurityLockModal";
import { useState } from "react";

const initial: PlatformResult = { success: false, message: "" };

function SubmitBtn() {
  const { pending } = useFormStatus();
  const t = useTranslations("platform");
  return (
    <Button type="submit" variant="secondary" disabled={pending}>
      {pending ? t("forking") : t("fork")}
    </Button>
  );
}

interface ForkRepoButtonProps {
  locale: string;
  repoId: string;
  isLoggedIn: boolean;
  canFork: boolean;
}

export function ForkRepoButton({ locale, repoId, isLoggedIn, canFork }: ForkRepoButtonProps) {
  const t = useTranslations("platform");
  const [lockOpen, setLockOpen] = useState(false);
  const [state, action] = useFormState(forkRepoAction, initial);

  if (!canFork) return null;

  if (!isLoggedIn) {
    return (
      <>
        <Button type="button" variant="secondary" onClick={() => setLockOpen(true)}>
          {t("fork")}
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
  <div>
    <Form action={action} className="inline">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="sourceRepoId" value={repoId} />
      <SubmitBtn />
    </Form>
    {state.message && (
      <p className={`mt-2 text-sm ${state.success ? "text-c4e-neon" : "text-destructive"}`}>
        {state.message}
      </p>
    )}
  </div>
  );
}
