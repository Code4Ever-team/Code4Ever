"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { SecurityLockModal } from "@/components/security/SecurityLockModal";
import { cn } from "@/lib/utils";
import type { CommunityProfile, CommunityMemberEntry } from "@/types/profile";

interface CommunityPanelProps {
  community: CommunityProfile;
  locale: string;
  isLoggedIn?: boolean;
}

type TabKey = "feed" | "repositories" | "members";

function Banner({ url, name }: { url: string | null; name: string }) {
  if (url) {
    return (
      <div className="relative h-36 w-full overflow-hidden rounded-t-xl">
        <Image src={url} alt={name} fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />
      </div>
    );
  }
  return <div className="h-36 w-full rounded-t-xl bg-gradient-to-br from-c4e-slate to-black" />;
}

function Logo({ url, name }: { url: string | null; name: string }) {
  if (url) {
    return (
      <Image
        src={url}
        alt={name}
        width={72}
        height={72}
        className="rounded-xl object-cover ring-2 ring-c4e-neon/40"
      />
    );
  }
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <div className="flex h-[72px] w-[72px] items-center justify-center rounded-xl bg-c4e-slate ring-2 ring-c4e-neon/40 text-xl font-bold text-c4e-neon select-none">
      {initials}
    </div>
  );
}

export function CommunityPanel({ community, locale: _locale, isLoggedIn = false }: CommunityPanelProps) {
  const t = useTranslations("community");
  const [activeTab, setActiveTab] = useState<TabKey>("feed");
  const [lockOpen, setLockOpen] = useState(false);

  const tabs: { key: TabKey; label: string }[] = [
    { key: "feed", label: t("postsCount") },
    { key: "repositories", label: t("reposCount") },
    { key: "members", label: t("members") },
  ];

  const roleLabels: Record<string, string> = {
    ADMIN: t("roleAdmin"),
    MODERATOR: t("roleMod"),
    MEMBER: t("roleMember"),
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <section className="overflow-hidden rounded-xl border border-border bg-c4e-slate/60 shadow-2xl">
        <Banner url={community.bannerUrl} name={community.name} />
        <div className="flex flex-col gap-4 px-6 pb-6 pt-4 sm:flex-row sm:items-end">
          <div className="-mt-10 shrink-0">
            <Logo url={community.logoUrl} name={community.name} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground truncate">{community.displayName}</h1>
            {community.description && (
              <p className="mt-1.5 text-sm text-c4e-muted leading-relaxed line-clamp-2">
                {community.description}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-5 text-sm text-c4e-muted">
              <span>
                <strong className="text-foreground">{community._count.members}</strong>{" "}
                {t("members")}
              </span>
              <span>
                <strong className="text-foreground">{community._count.repos}</strong>{" "}
                {t("reposCount")}
              </span>
              <span>
                <strong className="text-foreground">{community._count.feeds}</strong>{" "}
                {t("postsCount")}
              </span>
            </div>
          </div>
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => !isLoggedIn && setLockOpen(true)}
              disabled={!isLoggedIn}
              className={cn(
                "rounded-md px-5 py-2 text-sm font-semibold transition-colors",
                isLoggedIn
                  ? "bg-c4e-neon text-white hover:bg-c4e-neon/85"
                  : "cursor-not-allowed bg-border/50 text-c4e-muted opacity-60"
              )}
            >
              {t("join")}
            </button>
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

      <div className="mt-4">
        {activeTab === "feed" && (
          <p className="py-8 text-center text-sm text-c4e-muted">{t("emptyFeed")}</p>
        )}
        {activeTab === "repositories" && (
          <div className="py-4 space-y-3">
            <p className="text-sm text-c4e-muted">{t("reposSoon")}</p>
            <button
              type="button"
              onClick={() => !isLoggedIn && setLockOpen(true)}
              disabled={!isLoggedIn}
              className={cn(
                "rounded border px-4 py-1.5 text-sm font-medium transition-colors",
                isLoggedIn
                  ? "border-c4e-neon text-c4e-neon hover:bg-c4e-neon/10"
                  : "cursor-not-allowed border-border text-c4e-muted opacity-50"
              )}
            >
              {t("fork")}
              {!isLoggedIn && <span className="ml-1 text-xs">({t("forkLogin")})</span>}
            </button>
          </div>
        )}
        {activeTab === "members" && (
          <MembersList members={community.members} roleLabels={roleLabels} emptyLabel={t("emptyMembers")} />
        )}
      </div>

      <SecurityLockModal
        open={lockOpen}
        onClose={() => setLockOpen(false)}
        title={t("joinLockedTitle")}
        description={t("joinLockedDesc")}
      />
    </main>
  );
}

function MembersList({
  members,
  roleLabels,
  emptyLabel,
}: {
  members: CommunityMemberEntry[];
  roleLabels: Record<string, string>;
  emptyLabel: string;
}) {
  if (members.length === 0) {
    return <p className="py-8 text-center text-sm text-c4e-muted">{emptyLabel}</p>;
  }

  const roleColors: Record<string, string> = {
    ADMIN: "text-c4e-neon",
    MODERATOR: "text-amber-400",
    MEMBER: "text-c4e-muted",
  };

  return (
    <ul className="mt-2 space-y-2">
      {members.map((entry) => (
        <li
          key={entry.id}
          className="flex items-center gap-3 rounded-lg border border-border bg-c4e-slate/40 px-4 py-3"
        >
          {entry.user.avatarUrl ? (
            <Image
              src={entry.user.avatarUrl}
              alt={entry.user.username}
              width={36}
              height={36}
              className="rounded-full object-cover ring-1 ring-border"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-c4e-slate ring-1 ring-border text-xs font-bold text-c4e-neon">
              {entry.user.username.slice(0, 2).toUpperCase()}
            </div>
          )}
          <span className="flex-1 min-w-0 font-medium text-foreground truncate">
            {entry.user.username}
          </span>
          <span className={cn("shrink-0 text-xs font-semibold", roleColors[entry.role])}>
            {roleLabels[entry.role] ?? entry.role}
          </span>
        </li>
      ))}
    </ul>
  );
}
