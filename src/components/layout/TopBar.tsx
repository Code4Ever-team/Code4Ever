"use client";

import Link from "next/link";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { NavLink } from "@/components/layout/NavLink";
import { ChatIcon, FeedIcon, HomeIcon, RepoIcon } from "@/components/layout/NavIcons";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/auth/LogoutButton";
import type { BottomNavCommunity, BottomNavUser } from "@/components/layout/BottomNav";

interface TopBarProps {
  user: BottomNavUser | null;
  communities: BottomNavCommunity[];
  isLoggedIn: boolean;
  isPanelAdmin?: boolean;
}

function UserAvatar({ user }: { user: BottomNavUser }) {
  if (user.avatarUrl) {
    return (
      <Image
        src={user.avatarUrl}
        alt={user.username}
        width={32}
        height={32}
        className="h-8 w-8 rounded-md object-cover ring-1 ring-border"
      />
    );
  }
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-c4e-slate text-xs font-bold text-c4e-neon ring-1 ring-border">
      {user.username.slice(0, 2).toUpperCase()}
    </div>
  );
}

export function TopBar({ user, communities, isLoggedIn, isPanelAdmin = false }: TopBarProps) {
  const locale = useLocale();
  const t = useTranslations();
  const base = `/${locale}`;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-black/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <Link href={base} className="flex shrink-0 items-center gap-2.5">
          <span className="relative flex h-8 w-8 items-center justify-center rounded-md border border-c4e-neon/40 bg-c4e-neon/5">
            <span className="h-1.5 w-1.5 rounded-full bg-c4e-neon shadow-[0_0_10px_rgba(0,122,204,0.9)]" />
          </span>
          <span className="hidden sm:block text-sm font-semibold tracking-wide text-foreground">
            {t("common.brand")}
          </span>
        </Link>

        <nav className="hidden md:flex flex-1 items-center justify-center gap-1">
          <NavLink href={base} label={t("nav.home")} icon={<HomeIcon />} match="exact" />
          <NavLink href={`${base}/feed`} label={t("nav.feed")} icon={<FeedIcon />} />
          <NavLink href={`${base}/repos`} label={t("nav.repos")} icon={<RepoIcon />} />
          <NavLink href={`${base}/chat`} label={t("nav.chat")} icon={<ChatIcon />} />
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {isLoggedIn && communities.length > 0 && (
            <div className="hidden lg:flex items-center gap-1.5 border-l border-border pl-2">
              {communities.slice(0, 4).map((c) => (
                <Link
                  key={c.id}
                  href={`/${locale}/${c.name}`}
                  title={c.name}
                  className="shrink-0 rounded-md ring-1 ring-border transition hover:ring-c4e-neon/50"
                >
                  {c.logoUrl ? (
                    <Image
                      src={c.logoUrl}
                      alt={c.name}
                      width={28}
                      height={28}
                      className="h-7 w-7 rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-c4e-slate text-[9px] font-bold text-c4e-neon">
                      {c.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}

          {isLoggedIn && user ? (
            <>
              {isPanelAdmin && (
                <Button asChild variant="ghost" className="hidden h-9 px-2 text-xs sm:inline-flex">
                  <Link href={`${base}/admin`}>{t("nav.admin")}</Link>
                </Button>
              )}
              <Button asChild variant="ghost" className="hidden h-9 px-2 text-xs sm:inline-flex">
                <Link href={`${base}/settings`}>{t("nav.settings")}</Link>
              </Button>
              <div className="hidden sm:block">
                <LogoutButton locale={locale} variant="ghost" className="[&_button]:h-9 [&_button]:px-2 [&_button]:text-xs" />
              </div>
              <Link
                href={`/${locale}/${user.username}`}
                className="flex items-center gap-2 rounded-md border border-border bg-card/30 px-2 py-1.5 transition hover:border-c4e-neon/40"
              >
                <UserAvatar user={user} />
                <span className="hidden sm:inline text-sm font-medium text-foreground max-w-[6rem] truncate">
                  @{user.username}
                </span>
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-1">
              <Button asChild variant="ghost" className="h-9 px-2 text-sm">
                <Link href={`/${locale}/login`}>{t("common.login")}</Link>
              </Button>
              <Button asChild className="h-9 px-2 text-sm">
                <Link href={`/${locale}/register`}>{t("common.register")}</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
