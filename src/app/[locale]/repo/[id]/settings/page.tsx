import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { safeDbQuery, isDatabaseAvailable } from "@/lib/db-safe";
import { SHOWROOM_ENTRY, readFileContent } from "@/lib/showroom";
import { ShowroomSettingsForm } from "@/components/repo/ShowroomSettingsForm";
import { DbOffline } from "@/components/system/DbOffline";
import { Button } from "@/components/ui/button";

interface RepoSettingsPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function RepoSettingsPage({ params }: RepoSettingsPageProps) {
  const { locale, id } = await params;
  const t = await getTranslations("showroom");
  const session = await getSession();

  if (!session) {
    redirect(`/${locale}/login?redirect=/${locale}/repo/${id}/settings`);
  }

  const dbOk = await isDatabaseAvailable();
  if (!dbOk) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <DbOffline />
      </main>
    );
  }

  const repo = await safeDbQuery(
    "repoSettingsPage",
    () =>
      prisma.repo.findUnique({
        where: { id },
        include: {
          files: { where: { path: SHOWROOM_ENTRY }, take: 1 },
        },
      }),
    null
  );

  if (!repo || repo.ownerId !== session.id) notFound();

  const hasPubIndex = repo.files.some((f) => readFileContent(f).trim().length > 0);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">{t("settingsTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{repo.name}</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/${locale}/repo/${repo.id}`}>{t("backToRepo")}</Link>
        </Button>
      </div>

      <ShowroomSettingsForm
        locale={locale}
        repoId={repo.id}
        repoName={repo.name}
        showroomSlug={repo.showroomSlug}
        showroomPublished={repo.showroomPublished}
        hasPubIndex={hasPubIndex}
      />
    </main>
  );
}
