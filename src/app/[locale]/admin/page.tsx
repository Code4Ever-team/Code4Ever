import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isPlatformFounder } from "@/lib/platform-admin";
import { isDatabaseAvailable } from "@/lib/db-safe";
import { DbOffline } from "@/components/system/DbOffline";
import { Card } from "@/components/ui/card";
import { AdminFeedRow } from "@/components/admin/AdminFeedRow";

interface AdminPageProps {
  params: Promise<{ locale: string }>;
}

export default async function AdminPage({ params }: AdminPageProps) {
  const { locale } = await params;
  const t = await getTranslations("admin");
  const session = await getSession();

  if (!session) {
    redirect(`/${locale}/login?redirect=/${locale}/admin`);
  }

  const founder = await isPlatformFounder(session.id);
  if (!founder) {
    return (
      <main className="mx-auto max-w-3xl py-10">
        <Card className="p-6 text-center">
          <p className="text-sm text-destructive">{t("forbidden")}</p>
        </Card>
      </main>
    );
  }

  const dbOk = await isDatabaseAvailable();
  if (!dbOk) {
    return (
      <main className="mx-auto max-w-3xl py-10">
        <DbOffline />
      </main>
    );
  }

  const [userCount, feedCount, repoCount, feeds, users] = await Promise.all([
    prisma.user.count(),
    prisma.feed.count(),
    prisma.repo.count(),
    prisma.feed.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        content: true,
        createdAt: true,
        user: { select: { username: true } },
      },
    }),
    prisma.user.findMany({
      take: 50,
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        username: true,
        email: true,
        isFounder: true,
        createdAt: true,
      },
    }),
  ]);

  return (
    <main className="mx-auto max-w-3xl py-6 md:py-10">
      <header className="mb-6 border-b border-border pb-4">
        <h1 className="text-xl font-semibold text-foreground">{t("title")}</h1>
        <p className="mt-1 text-sm text-c4e-muted">{t("subtitle")}</p>
      </header>

      <div className="mb-8 grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-c4e-neon">{userCount}</p>
          <p className="mt-1 text-xs text-c4e-muted">{t("statsUsers")}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-c4e-neon">{feedCount}</p>
          <p className="mt-1 text-xs text-c4e-muted">{t("statsFeeds")}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-c4e-neon">{repoCount}</p>
          <p className="mt-1 text-xs text-c4e-muted">{t("statsRepos")}</p>
        </Card>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-c4e-muted">
          {t("feedsSection")}
        </h2>
        {feeds.length === 0 ? (
          <p className="text-sm text-c4e-muted">{t("noFeeds")}</p>
        ) : (
          <ul className="space-y-2">
            {feeds.map((feed) => (
              <AdminFeedRow
                key={feed.id}
                id={feed.id}
                content={feed.content}
                author={feed.user.username}
                createdAt={feed.createdAt}
                locale={locale}
              />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-c4e-muted">
          {t("usersSection")}
        </h2>
        <ul className="space-y-2">
          {users.map((u) => (
            <li
              key={u.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card/40 px-4 py-3 text-sm"
            >
              <span className="font-medium text-foreground">@{u.username}</span>
              <span className="text-xs text-c4e-muted">
                {u.isFounder ? "★" : ""} {new Date(u.createdAt).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
