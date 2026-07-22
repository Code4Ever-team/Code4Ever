"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { JubbioLoginButton } from "@/components/auth/JubbioLoginButton";
import { loginAction } from "@/lib/actions/auth.actions";
import { initialAuthFormState, type AuthFormState } from "@/lib/actions/auth.form-state";

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations();

  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? t("auth.login.submitting") : t("auth.login.submit")}
    </Button>
  );
}

interface LoginFormProps {
  locale: string;
  authUrl: string;
}

export function LoginForm({ locale, authUrl }: LoginFormProps) {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "";
  const [state, formAction] = useFormState<AuthFormState, FormData>(
    loginAction,
    initialAuthFormState
  );

  return (
    <Card className="mx-auto max-w-md p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">{t("auth.login.title")}</h2>
        <p className="mt-1 text-sm text-c4e-muted">{t("auth.login.subtitle")}</p>
      </div>

      <Form action={formAction}>
        <input type="hidden" name="locale" value={locale} />
        {redirect ? <input type="hidden" name="redirect" value={redirect} /> : null}

        <div className="space-y-2">
          <label htmlFor="usernameOrEmail" className="text-sm font-medium text-foreground">
            {t("auth.login.identifierLabel")}
          </label>
          <Input
            id="usernameOrEmail"
            name="usernameOrEmail"
            placeholder={t("auth.login.identifierPlaceholder")}
            autoComplete="username"
            required
          />
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              {t("auth.login.passwordLabel")}
            </label>
            <Link
              href={`/${locale}/forgot-password`}
              className="text-xs text-c4e-neon hover:underline"
            >
              {t("auth.login.forgotPassword")}
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder={t("auth.login.passwordPlaceholder")}
            autoComplete="current-password"
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
          <p className="mt-3 text-sm text-destructive TYPE-writer text-center">{state.message}</p>
        )}
      </Form>
    </Card>
  );
}