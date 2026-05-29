"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { createFeedAction } from "@/lib/actions/platform.actions";
import type { PlatformResult } from "@/lib/actions/platform.actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Form } from "@/components/ui/Form";
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
      {pending ? t("feedSubmitting") : t("feedSubmit")}
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
  const [state, action] = useFormState(createFeedAction, initial);

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

  return (
    <Card className="mb-6 p-4">
      <Form action={action} className="space-y-3">
        <input type="hidden" name="locale" value={locale} />
        <div className="space-y-2">
          <Label htmlFor="feed-content">{t("postFeed")}</Label>
          <Textarea
            id="feed-content"
            name="content"
            placeholder={t("feedPlaceholder")}
            required
            maxLength={2000}
          />
        </div>
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
