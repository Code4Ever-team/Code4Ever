"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { SecurityLockModal } from "@/components/security/SecurityLockModal";
import { FeedPostCard } from "@/components/feed/FeedPostCard";
import { FollowButton } from "@/components/profile/FollowButton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UserProfile as UserProfileType } from "@/types/profile";

interface UserProfileProps {
  user: UserProfileType;
  locale: string;
  isLoggedIn?: boolean;
  isOwnProfile?: boolean;
  canModerateFeeds?: boolean;
  isFollowing?: boolean;
  canMessage?: boolean;
}

type TabKey = "feed" | "repositories" | "forks";

function Avatar({
  url,
  username,
  size = 80,
}: {
  url: string | null;
  username: string;
  size?: number;
}) {
  if (url) {
    return (
      <Image
        src={url}
        alt={username}
        width={size}
        height={size}
        className="rounded-full object-cover ring-2 ring-c4e-neon/40"
        priority
      />
    );
  }
  const initials = username.slice(0, 2).toUpperCase();
  return (
    <div
      style={{ width: size, height: size }}
      className="flex items-center justify-center rounded-full bg-c4e-slate ring-2 ring-c4e-neon/40 text-lg font-bold text-c4e-neon select-none"
    >
      {initials}
    </div>
  );
}

function Banner({ url }: { url: string | null }) {
  if (url) {
    return (
      <div className="relative h-40 w-full overflow-hidden">
        <Image src={url} alt="" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50" />
      </div>
    );
  }
  return <div className="h-40 w-full bg-gradient-to-r from-c4e-slate via-black to-c4e-slate" />;
}

export function UserProfile({
  user,
  locale,
  isLoggedIn = false,
  isOwnProfile = false,
  canModerateFeeds = false,
  isFollowing = false,
  canMessage = false,
}: UserProfileProps) {
  const t = useTranslations("profile");
  const tp = useTranslations("platform");
  const [activeTab, setActiveTab] = useState<TabKey>("feed");
  const [lockOpen, setLockOpen] = useState(false);

  const tabs: { key: TabKey; label: string }[] = [
    { key: "feed", label: t("tabs.feed") },
    { key: "repositories", label: t("tabs.repos") },
    { key: "forks", label: t("tabs.forks") },
  ];

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <section className="rounded-xl border border-border bg-c4e-slate/60 shadow-2xl">
        <div className="overflow-hidden rounded-t-xl">
          <Banner url={user.bannerUrl} />
        </div>
        <div className="relative px-6 pb-6">
          <div className="relative z-10 -mt-14 mb-4 w-fit">
            <div className="rounded-full bg-c4e-slate p-1 ring-4 ring-c4e-slate shadow-lg">
              <Avatar url={user.avatarUrl} username={user.username} size={92} />
            </div>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-foreground truncate">{user.username}</h1>
              {user.bio && (
                <p className="mt-1.5 text-sm text-c4e-muted leading-relaxed">{user.bio}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-5 text-sm text-c4e-muted">
                <span>
                  <strong className="text-foreground">{user._count.followerEdges}</strong>{" "}
                  {t("followers")}
                </span>
                <span>
                  <strong className="text-foreground">{user._count.followingEdges}</strong>{" "}
                  {t("following")}
                </span>
                <span>
                  <strong className="text-foreground">{user._count.reposOwned}</strong> {t("repos")}
                </span>
                <span>
                  <strong className="text-foreground">{user._count.forks}</strong> {t("forks")}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2 pt-1">
              {isOwnProfile && (
                <Button asChild variant="secondary" className="h-9 text-sm">
                  <Link href={`/${locale}/settings`}>{t("settingsLink")}</Link>
                </Button>
              )}
              {!isOwnProfile && (
                <FollowButton
                  locale={locale}
                  targetUserId={user.id}
                  targetUsername={user.username}
                  isFollowing={isFollowing}
                  canMessage={canMessage}
                  isLoggedIn={isLoggedIn}
                  onGuestClick={() => setLockOpen(true)}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      <nav className="mt-6 flex border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "relative px-5 py-2.5 text-sm font-medium transition-colors",
              activeTab === tab.key
                ? "text-c4e-neon after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-c4e-neon"
                : "text-c4e-muted hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="mt-4 space-y-2">
        {activeTab === "feed" &&
          (user.feeds.length === 0 ? (
            <p className="py-8 text-center text-sm text-c4e-muted">{t("emptyFeed")}</p>
          ) : (
            user.feeds.map((feed) => (
              <FeedPostCard
                key={feed.id}
                id={feed.id}
                content={feed.content}
                mediaUrl={feed.mediaUrl}
                mediaType={feed.mediaType}
                createdAt={feed.createdAt}
                locale={locale}
                authorUsername={user.username}
                canDelete={isOwnProfile || canModerateFeeds}
              />
            ))
          ))}

        {activeTab === "repositories" &&
          (user.reposOwned.length === 0 ? (
            <p className="py-8 text-center text-sm text-c4e-muted">{t("emptyRepos")}</p>
          ) : (
            user.reposOwned.map((repo) => (
              <Link
                key={repo.id}
                href={`/${locale}/repo/${repo.id}`}
                className="block rounded-lg border border-border bg-card/40 p-4 transition-colors hover:border-c4e-neon/40"
              >
                <p className="font-medium text-foreground">{repo.name}</p>
                {repo.description && (
                  <p className="mt-1 text-sm text-c4e-muted line-clamp-2">{repo.description}</p>
                )}
                <p className="mt-2 text-xs text-c4e-muted">
                  {repo.isPrivate ? tp("visibilityPrivate") : tp("visibilityPublic")}
                </p>
              </Link>
            ))
          ))}

        {activeTab === "forks" &&
          (user.forks.length === 0 ? (
            <p className="py-8 text-center text-sm text-c4e-muted">{t("emptyForks")}</p>
          ) : (
            user.forks.map((fork) => (
              <div key={fork.id} className="rounded-lg border border-border bg-card/40 p-4">
                <p className="text-sm text-foreground">
                  <Link
                    href={`/${locale}/repo/${fork.sourceRepo.id}`}
                    className="text-c4e-neon hover:underline"
                  >
                    {fork.sourceRepo.name}
                  </Link>
                  {" → "}
                  <Link
                    href={`/${locale}/repo/${fork.forkedRepo.id}`}
                    className="text-c4e-neon hover:underline"
                  >
                    {fork.forkedRepo.name}
                  </Link>
                </p>
                <p className="mt-2 text-xs text-c4e-muted">
                  {new Date(fork.createdAt).toLocaleString(locale === "tr" ? "tr-TR" : "en-US")}
                </p>
              </div>
            ))
          ))}
      </div>

      <SecurityLockModal
        open={lockOpen}
        onClose={() => setLockOpen(false)}
        title={t("followLockedTitle")}
        description={t("followLockedDesc")}
      />
    </main>
  );
}
