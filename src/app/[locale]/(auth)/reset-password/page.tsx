import Link from "next/link";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

interface ResetPasswordPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}

function ResetFormWithToken({ locale, token }: { locale: string; token: string }) {
  return <ResetPasswordForm locale={locale} token={token} />;
}

export default async function ResetPasswordPage({ params, searchParams }: ResetPasswordPageProps) {
  const { locale } = await params;
  const { token = "" } = await searchParams;
  const t = await getTranslations("auth.reset");

  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center py-10">
      <div className="w-full max-w-md px-4">
        <header className="mb-6 text-center">
          <p className="text-xs font-medium tracking-[0.2em] text-c4e-neon">Code4Ever</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
          <p className="mt-2 text-sm text-c4e-muted">{t("subtitle")}</p>
        </header>

        <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-card/40" />}>
          <ResetFormWithToken locale={locale} token={token} />
        </Suspense>

        <p className="mt-6 text-center text-sm text-c4e-muted">
          <Link href={`/${locale}/login`} className="font-semibold text-c4e-neon hover:underline">
            {t("backToLogin")}
          </Link>
        </p>
      </div>
    </main>
  );
}
