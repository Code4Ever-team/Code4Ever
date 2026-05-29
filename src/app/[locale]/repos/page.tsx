import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/auth";
import { isDatabaseAvailable } from "@/lib/db-safe";
import { loadRepoList } from "@/lib/home-data";
import { FeedRepoList } from "@/components/feed/FeedRepoList";
import { CreateRepoForm } from "@/components/platform/CreateRepoForm";
import { DbOffline } from "@/components/system/DbOffline";

interface ReposPageProps {
  params: Promise<{ locale: string }>;
}

export default async function ReposPage({ params }: ReposPageProps) {
  const { locale } = await params;
  const t = await getTranslations("reposPage");
  const session = await getSession();
  const dbOk = await isDatabaseAvailable();

  if (!dbOk) {
    return (
      <main className="mx-auto max-w-3xl py-10">
        <DbOffline />
      </main>
    );
  }

  const repoItems = await loadRepoList(session?.id ?? null);

  return (
    <main className="mx-auto max-w-3xl py-6 md:py-10">
      <header className="mb-6 border-b border-border pb-4">
        <h1 className="text-xl font-semibold text-foreground">{t("title")}</h1>
        <p className="mt-1 text-sm text-c4e-muted">{t("subtitle")}</p>
      </header>
      <CreateRepoForm locale={locale} isLoggedIn={session !== null} />
      <FeedRepoList locale={locale} feedItems={[]} repoItems={repoItems} mode="repos" />
    </main>
  );
}
