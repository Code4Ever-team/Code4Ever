import Link from "next/link";
import { getJubbioAuthUrl } from "@/lib/jubbio";
import { getTranslations } from "next-intl/server";
import { RegisterForm } from "@/components/auth/RegisterForm";

interface RegisterPageProps {
  params: { locale: string };
}

export default async function RegisterPage({ params }: RegisterPageProps) {
  const { locale } = params;
  const t = await getTranslations();
  const authUrl = getJubbioAuthUrl();

  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center py-10">
      <div className="w-full max-w-md px-4">
        <header className="mb-6 text-center">
          <p className="text-xs font-medium tracking-[0.2em] text-c4e-neon">Code4Ever</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            {t("auth.register.title")}
          </h1>
          <p className="mt-2 text-sm text-c4e-muted">{t("auth.register.subtitle")}</p>
        </header>

        <RegisterForm locale={locale} authUrl={authUrl} />

        <p className="mt-6 text-center text-sm text-c4e-muted">
          {t("common.hasAccount")}{" "}
          <Link href={`/${locale}/login`} className="font-semibold text-c4e-neon hover:underline">
            {t("common.goToLogin")}
          </Link>
        </p>
      </div>
    </main>
  );
}
