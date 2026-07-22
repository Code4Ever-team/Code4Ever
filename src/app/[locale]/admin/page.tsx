import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isPlatformPanelAdmin } from "@/lib/platform-panel";
import { isDatabaseAvailable } from "@/lib/db-safe";
import { DbOffline } from "@/components/system/DbOffline";
import { Card } from "@/components/ui/card";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

interface AdminPageProps {
  params: { locale: string };
}

export default async function AdminPage({ params }: AdminPageProps) {
  const { locale } = params;
  const t = await getTranslations("admin");
  const session = await getSession();

  if (!session) {
    redirect(`/${locale}/login?redirect=/${locale}/admin`);
  }

  const panelAdmin = await isPlatformPanelAdmin(session.id);
  if (!panelAdmin) {
    return (
      <main className="mx-auto max-w-3xl py-10">
        <Card className="border-border p-6 text-center">
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

  const [userCount, feedCount, repoCount, feeds, users, badges] = await Promise.all([
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
      take: 200,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        isFounder: true,
        suspendedAt: true,
        createdAt: true,
      },
    }),
    prisma.badge.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <main className="mx-auto max-w-5xl py-6 md:py-10">
      <AdminDashboard
        locale={locale}
        userCount={userCount}
        feedCount={feedCount}
        repoCount={repoCount}
        users={users}
        feeds={feeds.map((f) => ({
          id: f.id,
          content: f.content,
          createdAt: f.createdAt,
          author: f.user.username,
        }))}
        badges={badges}
      />
    </main>
  );
}
