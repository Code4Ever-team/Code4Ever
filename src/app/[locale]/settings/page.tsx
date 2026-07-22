import { getJubbioAuthUrl } from "@/lib/jubbio";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileEditForm } from "@/components/platform/ProfileEditForm";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Card } from "@/components/ui/card";

interface SettingsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { locale } = await params;
  const t = await getTranslations("settings");
  const session = await getSession();

  if (!session) {
    redirect(`/${locale}/login?redirect=/${locale}/settings`);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { bio: true },
  });

  const authUrl = getJubbioAuthUrl();

  return (
    <main className="mx-auto max-w-lg py-6 md:py-10">
      <header className="mb-6 border-b border-border pb-4">
        <h1 className="text-xl font-semibold text-foreground">{t("title")}</h1>
        <p className="mt-1 text-sm text-c4e-muted">{t("subtitle")}</p>
      </header>

      <section className="space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{t("profileSection")}</h2>
          <p className="mt-1 text-xs text-c4e-muted">{t("profileHint")}</p>
          <ProfileEditForm locale={locale} bio={user?.bio ?? null} authUrl={authUrl} />
        </div>

        <Card className="p-4">
          <h2 className="text-sm font-semibold text-foreground">{t("languageSection")}</h2>
          <p className="mt-1 mb-3 text-xs text-c4e-muted">{t("languageHint")}</p>
          <LocaleSwitcher />
        </Card>

        <Card className="p-4">
          <h2 className="text-sm font-semibold text-foreground">{t("accountSection")}</h2>
          <p className="mt-1 mb-3 text-xs text-c4e-muted">{t("logoutHint")}</p>
          <LogoutButton locale={locale} variant="destructive" />
        </Card>
      </section>
    </main>
  );
}
