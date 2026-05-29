import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { HomeFeedItem, HomeRepoItem } from "@/lib/home-data";

interface FeedRepoListProps {
  locale: string;
  feedItems: HomeFeedItem[];
  repoItems: HomeRepoItem[];
  showAuthActions?: boolean;
  mode?: "home" | "feed" | "repos";
}

function SectionHeader({ title, href, linkLabel }: { title: string; href: string; linkLabel: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-c4e-muted">{title}</h2>
      <Link href={href} className="text-xs font-medium text-c4e-neon hover:underline">
        {linkLabel}
      </Link>
    </div>
  );
}

export async function FeedRepoList({
  locale,
  feedItems,
  repoItems,
  showAuthActions = false,
  mode = "home",
}: FeedRepoListProps) {
  const t = await getTranslations("home");
  const tp = await getTranslations("platform");
  const base = `/${locale}`;

  const showFeeds = mode === "home" || mode === "feed";
  const showRepos = mode === "home" || mode === "repos";
  const hasFeeds = feedItems.length > 0;
  const hasRepos = repoItems.length > 0;

  if (!hasFeeds && !hasRepos) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-c4e-muted">{t("empty")}</p>
        {showAuthActions && (
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button asChild>
              <Link href={`${base}/login`}>{t("ctaLogin")}</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={`${base}/register`}>{t("ctaRegister")}</Link>
            </Button>
          </div>
        )}
      </Card>
    );
  }

  return (
    <div className={mode === "home" ? "grid gap-6 lg:grid-cols-2" : "space-y-2"}>
      {showFeeds && (
      <section>
        {mode === "home" && (
          <SectionHeader title={t("feedSection")} href={`${base}/feed`} linkLabel={t("seeAll")} />
        )}
        {!hasFeeds ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-c4e-muted">
            {t("noFeeds")}
          </p>
        ) : (
          <div className="space-y-2">
            {feedItems.map((item) => (
              <Link
                key={item.id}
                href={`${base}/${item.user.username}`}
                className="block rounded-lg border border-border bg-card/40 p-4 transition-colors hover:border-c4e-neon/40"
              >
                <p className="line-clamp-4 text-sm leading-relaxed text-foreground">{item.content}</p>
                <div className="mt-3 flex items-center justify-between text-xs text-c4e-muted">
                  <span className="font-medium text-c4e-neon">@{item.user.username}</span>
                  <time dateTime={item.createdAt.toISOString()}>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </time>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
      )}

      {showRepos && (
      <section>
        {mode === "home" && (
          <SectionHeader title={t("repoSection")} href={`${base}/repos`} linkLabel={t("seeAll")} />
        )}
        {!hasRepos ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-c4e-muted">
            {t("noRepos")}
          </p>
        ) : (
          <div className="space-y-2">
            {repoItems.map((repo) => (
              <Link key={repo.id} href={`${base}/repo/${repo.id}`}>
                <Card className="p-4 transition-colors hover:border-c4e-neon/40">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-mono text-sm font-medium text-foreground">{repo.name}</p>
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        repo.isPrivate
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-c4e-neon/10 text-c4e-neon"
                      }`}
                    >
                      {repo.isPrivate ? tp("visibilityPrivate") : tp("visibilityPublic")}
                    </span>
                  </div>
                  {repo.owner?.username && (
                    <p className="mt-2 text-xs text-c4e-muted">@{repo.owner.username}</p>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        )}

        {showAuthActions && (
          <div className="mt-4 flex gap-2">
            <Button asChild className="flex-1 sm:flex-none">
              <Link href={`${base}/login`}>{t("ctaLogin")}</Link>
            </Button>
            <Button asChild variant="secondary" className="flex-1 sm:flex-none">
              <Link href={`${base}/register`}>{t("ctaRegister")}</Link>
            </Button>
          </div>
        )}
      </section>
      )}
    </div>
  );
}
