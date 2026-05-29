"use client";

import { useLocale, useTranslations } from "next-intl";
import { DockLink } from "@/components/layout/NavLink";
import { ChatIcon, FeedIcon, HomeIcon, RepoIcon, UserIcon } from "@/components/layout/NavIcons";

export interface BottomNavUser {
  username: string;
  avatarUrl: string | null;
}

export interface BottomNavCommunity {
  id: string;
  name: string;
  logoUrl: string | null;
}

interface BottomNavProps {
  user: BottomNavUser | null;
  communities?: BottomNavCommunity[];
}

export function BottomNav({ user }: BottomNavProps) {
  const locale = useLocale();
  const t = useTranslations();
  const base = `/${locale}`;
  const profileHref = user ? `${base}/${user.username}` : `${base}/login`;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-black/90 backdrop-blur-md md:hidden"
      aria-label={t("nav.mobile")}
    >
      <div className="mx-auto flex h-[4.25rem] max-w-lg items-stretch px-1">
        <DockLink href={base} label={t("nav.home")} icon={<HomeIcon />} match="exact" />
        <DockLink href={`${base}/feed`} label={t("nav.feed")} icon={<FeedIcon />} />
        <DockLink href={`${base}/repos`} label={t("nav.repos")} icon={<RepoIcon />} />
        <DockLink href={`${base}/chat`} label={t("nav.chat")} icon={<ChatIcon />} />
        <DockLink
          href={user ? `/${locale}/settings` : profileHref}
          label={user ? t("nav.settings") : t("nav.profile")}
          icon={<UserIcon />}
          match="prefix"
        />
      </div>
    </nav>
  );
}
