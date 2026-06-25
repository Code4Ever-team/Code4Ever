"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Form } from "@/components/ui/Form";
import { Input } from "@/components/ui/input";
import { forgotPasswordAction } from "@/lib/actions/auth.actions";
import { initialAuthFormState, type AuthFormState } from "@/lib/actions/auth.form-state";

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("auth.forgot");

  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? t("submitting") : t("submit")}
    </Button>
  );
}

interface ForgotPasswordFormProps {
  locale: string;
}

export function ForgotPasswordForm({ locale }: ForgotPasswordFormProps) {
  const t = useTranslations("auth.forgot");
  const [state, formAction] = useFormState<AuthFormState, FormData>(
    forgotPasswordAction,
    initialAuthFormState
  );

  return (
    <Card className="mx-auto max-w-md p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">{t("title")}</h2>
        <p className="mt-1 text-sm text-c4e-muted">{t("subtitle")}</p>
      </div>

      {state.success ? (
        <div className="space-y-2 rounded-md border border-primary/30 bg-primary/5 p-4">
          <p className="text-sm font-medium text-primary">{t("successMessage")}</p>
          <p className="text-sm text-c4e-muted">{t("successSpamHint")}</p>
        </div>
      ) : (
        <Form action={formAction}>
          <input type="hidden" name="locale" value={locale} />

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              {t("emailLabel")}
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder={t("emailPlaceholder")}
              autoComplete="email"
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
      )}

      <p className="mt-6 text-center text-sm text-c4e-muted">
        <Link href={`/${locale}/login`} className="font-semibold text-c4e-neon hover:underline">
          {t("backToLogin")}
        </Link>
      </p>
    </Card>
  );
}
