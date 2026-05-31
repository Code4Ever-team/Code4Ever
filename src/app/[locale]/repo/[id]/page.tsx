import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { safeDbQuery, isDatabaseAvailable } from "@/lib/db-safe";
import { toWireFiles } from "@/lib/repo-files";
import { DbOffline } from "@/components/system/DbOffline";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ForkRepoButton } from "@/components/platform/ForkRepoButton";
import { RepoFileUploadForm } from "@/components/platform/RepoFileUploadForm";
import { RepoWorkspace } from "@/components/repo/RepoWorkspace";

interface RepoPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function RepoPage({ params }: RepoPageProps) {
  const { locale, id } = await params;
  const t = await getTranslations("platform");
  const tShow = await getTranslations("showroom");
  const dbOk = await isDatabaseAvailable();

  if (!dbOk) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <DbOffline />
      </main>
    );
  }

  const session = await getSession();
  const repo = await safeDbQuery(
    "repoPage",
    () =>
      prisma.repo.findUnique({
        where: { id },
        include: {
          owner: { select: { id: true, username: true } },
          files: { orderBy: { path: "asc" } },
          _count: { select: { sourceForks: true } },
        },
      }),
    null
  );

  if (!repo) notFound();
  if (repo.isPrivate && repo.ownerId !== session?.id) notFound();

  const isOwner = session?.id === repo.ownerId;
  const canFork = !isOwner && !repo.isPrivate && !repo.isEncrypted;
  const wireFiles = toWireFiles(repo.files, repo.isEncrypted);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">{repo.name}</h1>
            {repo.description && (
              <p className="mt-2 text-sm text-c4e-muted">{repo.description}</p>
            )}
            <p className="mt-2 text-xs text-c4e-muted">
              {repo.isPrivate ? t("visibilityPrivate") : t("visibilityPublic")}
              {repo.isEncrypted ? ` · ${tShow("encryptedBadge")}` : null}
              {repo.owner?.username ? (
                <>
                  {" · "}
                  <Link href={`/${locale}/${repo.owner.username}`} className="text-c4e-neon hover:underline">
                    @{repo.owner.username}
                  </Link>
                </>
              ) : null}
              {" · "}
              {repo._count.sourceForks} fork
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isOwner && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/${locale}/repo/${repo.id}/settings`}>{tShow("settingsLink")}</Link>
              </Button>
            )}
            {repo.showroomSlug && repo.showroomPublished && !repo.isEncrypted && (
              <Button variant="secondary" size="sm" asChild>
                <Link href={`/${locale}/p/${repo.showroomSlug}`}>{tShow("openShowroom")}</Link>
              </Button>
            )}
            <ForkRepoButton
              locale={locale}
              repoId={repo.id}
              isLoggedIn={session !== null}
              canFork={canFork}
            />
          </div>
        </div>
      </Card>

      <RepoWorkspace
        locale={locale}
        repoId={repo.id}
        files={wireFiles}
        canEdit={isOwner}
        isEncrypted={repo.isEncrypted}
        keyEnvelope={repo.keyEnvelope}
        collabEnabled={repo.collabEnabled}
        userId={session?.id}
        username={session?.username}
      />

      <RepoFileUploadForm locale={locale} repoId={repo.id} canUpload={isOwner && !repo.isEncrypted} />
    </main>
  );
}
