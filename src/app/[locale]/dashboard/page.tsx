import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Card } from "@/components/ui/card";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { getSession } from "@/lib/auth";

interface DashboardPageProps {
  params: Promise<{ locale: string }>;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { locale } = await params;
  const t = await getTranslations();
  const session = await getSession();

  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center py-10">
      <Card className="w-full max-w-lg p-6">
        <header className="mb-4">
          <p className="text-xs font-medium tracking-[0.2em] text-c4e-neon">Code4Ever</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {t("dashboard.title")}
          </h1>
        </header>

        <section className="space-y-2 text-sm text-c4e-muted">
          <p className="text-xs uppercase tracking-[0.2em] text-c4e-muted">
            {t("dashboard.sessionPayload")}
          </p>
          {session ? (
            <div className="rounded-lg border border-border bg-black/40 p-3 font-mono text-xs text-foreground">
              <p>
                <span className="text-c4e-muted">{t("dashboard.id")}:</span> {session.id}
              </p>
              <p>
                <span className="text-c4e-muted">{t("dashboard.username")}:</span>{" "}
                <Link href={`/${locale}/${session.username}`} className="text-c4e-neon hover:underline">
                  {session.username}
                </Link>
              </p>
              <p>
                <span className="text-c4e-muted">{t("dashboard.email")}:</span> {session.email}
              </p>
            </div>
          ) : (
            <p className="text-destructive">{t("dashboard.noSession")}</p>
          )}
        </section>

        <div className="mt-6 flex justify-end">
          <LogoutButton locale={locale} />
        </div>
      </Card>
    </main>
  );
}
