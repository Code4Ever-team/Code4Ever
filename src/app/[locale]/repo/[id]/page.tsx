import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { safeDbQuery, isDatabaseAvailable } from "@/lib/db-safe";
import { DbOffline } from "@/components/system/DbOffline";
import { Card } from "@/components/ui/card";
import { ForkRepoButton } from "@/components/platform/ForkRepoButton";
import { RepoFileUploadForm } from "@/components/platform/RepoFileUploadForm";

interface RepoPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function RepoPage({ params }: RepoPageProps) {
  const { locale, id } = await params;
  const t = await getTranslations("platform");
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
  const canFork = !isOwner && !repo.isPrivate;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">{repo.name}</h1>
            {repo.description && (
              <p className="mt-2 text-sm text-c4e-muted">{repo.description}</p>
            )}
            <p className="mt-2 text-xs text-c4e-muted">
              {repo.isPrivate ? t("visibilityPrivate") : t("visibilityPublic")}
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
          <ForkRepoButton
            locale={locale}
            repoId={repo.id}
            isLoggedIn={session !== null}
            canFork={canFork}
          />
        </div>
      </Card>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-foreground">{t("files")}</h2>
        {repo.files.length === 0 ? (
          <p className="text-sm text-c4e-muted">{t("noFiles")}</p>
        ) : (
          <ul className="space-y-2">
            {repo.files.map((file) => (
              <li
                key={file.id}
                className="rounded-md border border-border bg-card/40 px-4 py-3"
              >
                <p className="font-mono text-sm text-c4e-neon">{file.path}</p>
                <p className="mt-1 text-xs text-c4e-muted">
                  {file.mimeType ?? "text"} · {file.size} bytes
                </p>
                {(file.content ?? file.encryptedContent) && (
                  <pre className="mt-2 max-h-48 overflow-auto rounded bg-black/50 p-2 text-xs text-foreground">
                    {(file.content ?? file.encryptedContent ?? "").slice(0, 2000)}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <RepoFileUploadForm locale={locale} repoId={repo.id} canUpload={isOwner} />
    </main>
  );
}
