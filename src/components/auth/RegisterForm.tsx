"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Form } from "@/components/ui/Form";
import { Input } from "@/components/ui/input";
import { JubbioLoginButton } from "@/components/auth/JubbioLoginButton";
import { registerAction } from "@/lib/actions/auth.actions";
import { initialAuthFormState, type AuthFormState } from "@/lib/actions/auth.form-state";

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations();

  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? t("auth.register.submitting") : t("auth.register.submit")}
    </Button>
  );
}

interface RegisterFormProps {
  locale: string;
  authUrl: string;
}

export function RegisterForm({ locale, authUrl }: RegisterFormProps) {
  const t = useTranslations();
  const [state, formAction] = useFormState<AuthFormState, FormData>(
    registerAction,
    initialAuthFormState
  );

  return (
    <Card className="mx-auto max-w-md p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">{t("auth.register.title")}</h2>
        <p className="mt-1 text-sm text-c4e-muted">{t("auth.register.subtitle")}</p>
      </div>

      <Form action={formAction}>
        <input type="hidden" name="locale" value={locale} />

        <div className="space-y-2">
          <label htmlFor="username" className="text-sm font-medium text-foreground">
            {t("auth.register.usernameLabel")}
          </label>
          <Input
            id="username"
            name="username"
            placeholder={t("auth.register.usernamePlaceholder")}
            autoComplete="username"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            {t("auth.register.emailLabel")}
          </label>
          <Input
            id="email"
            name="email"
            placeholder={t("auth.register.emailPlaceholder")}
            autoComplete="email"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            {t("auth.register.passwordLabel")}
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder={t("auth.register.passwordPlaceholder")}
            autoComplete="new-password"
            required
          />
        </div>

        <div className="mt-5">
          <SubmitButton />
        </div>

        <div className="mt-5 flex flex-col items-center justify-center w-full">
          <div className="relative w-full mb-4 text-center before:content-[''] before:absolute before:top-1/2 before:left-0 before:w-full before:h-[1px] before:bg-zinc-800">
            <span className="relative bg-[#09090b] px-3 text-xs text-c4e-muted uppercase tracking-wider">
              Veya
            </span>
          </div>
          <JubbioLoginButton authUrl={authUrl} />
        </div>

        {state.message && !state.success && (
          <p className="mt-3 text-sm text-destructive">{state.message}</p>
        )}
      </Form>
    </Card>
  );
}
