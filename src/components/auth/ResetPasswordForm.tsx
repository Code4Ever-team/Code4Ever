"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Form } from "@/components/ui/Form";
import { Input } from "@/components/ui/input";
import { resetPasswordAction } from "@/lib/actions/auth.actions";
import { initialAuthFormState, type AuthFormState } from "@/lib/actions/auth.form-state";

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("auth.reset");

  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? t("submitting") : t("submit")}
    </Button>
  );
}

interface ResetPasswordFormProps {
  locale: string;
  token: string;
}

export function ResetPasswordForm({ locale, token }: ResetPasswordFormProps) {
  const t = useTranslations("auth.reset");
  const [state, formAction] = useFormState<AuthFormState, FormData>(
    resetPasswordAction,
    initialAuthFormState
  );

  if (!token) {
    return (
      <Card className="mx-auto max-w-md p-6">
        <p className="text-sm text-destructive">{t("invalidLink")}</p>
        <p className="mt-4 text-center text-sm">
          <Link href={`/${locale}/forgot-password`} className="text-c4e-neon hover:underline">
            {t("requestNew")}
          </Link>
        </p>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-md p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">{t("title")}</h2>
        <p className="mt-1 text-sm text-c4e-muted">{t("subtitle")}</p>
      </div>

      <Form action={formAction}>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="token" value={token} />

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            {t("passwordLabel")}
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder={t("passwordPlaceholder")}
            autoComplete="new-password"
            required
          />
        </div>

        <div className="mt-4 space-y-2">
          <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
            {t("confirmLabel")}
          </label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder={t("confirmPlaceholder")}
            autoComplete="new-password"
            required
          />
        </div>

        <div className="mt-5">
          <SubmitButton />
        </div>

        {state.message && !state.success && (
          <p className="mt-3 text-sm text-destructive">{state.message}</p>
        )}
      </Form>
    </Card>
  );
}
