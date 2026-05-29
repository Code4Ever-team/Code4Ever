import { getSession } from "@/lib/auth";
import { isDatabaseAvailable } from "@/lib/db-safe";
import { isPlatformFounder } from "@/lib/platform-admin";
import { loadFeedList } from "@/lib/home-data";
import { CreateFeedForm } from "@/components/platform/CreateFeedForm";
import { FeedPostCard } from "@/components/feed/FeedPostCard";
import { DbOffline } from "@/components/system/DbOffline";
import { getTranslations } from "next-intl/server";

interface FeedPageProps {
  params: Promise<{ locale: string }>;
}

export default async function FeedPage({ params }: FeedPageProps) {
  const { locale } = await params;
  const t = await getTranslations("feedPage");
  const session = await getSession();
  const dbOk = await isDatabaseAvailable();

  if (!dbOk) {
    return (
      <main className="mx-auto max-w-3xl py-10">
        <DbOffline />
      </main>
    );
  }

  const feedItems = await loadFeedList();
  const founder = session ? await isPlatformFounder(session.id) : false;

  return (
    <main className="mx-auto max-w-3xl py-6 md:py-10">
      <header className="mb-6 border-b border-border pb-4">
        <h1 className="text-xl font-semibold text-foreground">{t("title")}</h1>
        <p className="mt-1 text-sm text-c4e-muted">{t("subtitle")}</p>
      </header>
      <CreateFeedForm locale={locale} isLoggedIn={session !== null} />
      <div className="mt-6 space-y-2">
        {feedItems.map((item) => (
          <FeedPostCard
            key={item.id}
            id={item.id}
            content={item.content}
            createdAt={item.createdAt}
            locale={locale}
            authorUsername={item.user.username}
            canDelete={
              session !== null &&
              (item.user.username === session.username || founder)
            }
            showAuthor
          />
        ))}
      </div>
    </main>
  );
}
