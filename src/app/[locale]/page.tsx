import { getSession } from "@/lib/auth";
import { isDatabaseAvailable } from "@/lib/db-safe";
import { loadHomeFeedAndRepos } from "@/lib/home-data";
import { FeedRepoList } from "@/components/feed/FeedRepoList";
import { PlatformQuickActions } from "@/components/platform/PlatformQuickActions";
import { HomeHero } from "@/components/home/HomeHero";
import { DbOffline } from "@/components/system/DbOffline";

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  const session = await getSession();
  const dbOk = await isDatabaseAvailable();

  if (!dbOk) {
    return (
      <main className="py-8 md:py-10">
        <DbOffline />
      </main>
    );
  }

  const { feedItems, repoItems } = await loadHomeFeedAndRepos(session?.id ?? null);

  return (
    <main className="py-6 md:py-10">
      <HomeHero />
      <PlatformQuickActions locale={locale} isLoggedIn={session !== null} />
      <FeedRepoList
        locale={locale}
        feedItems={feedItems}
        repoItems={repoItems}
        showAuthActions={!session}
      />
    </main>
  );
}
