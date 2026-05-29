"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { SecurityLockModal } from "@/components/security/SecurityLockModal";
import { FeedIcon, RepoIcon } from "@/components/layout/NavIcons";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface PlatformQuickActionsProps {
  locale: string;
  isLoggedIn: boolean;
}

interface ActionCardProps {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  accent?: boolean;
  onGuardedClick: (e: React.MouseEvent) => void;
}

function ActionCard({
  href,
  title,
  description,
  icon,
  accent,
  onGuardedClick,
}: ActionCardProps) {
  return (
    <Link
      href={href}
      onClick={onGuardedClick}
      className={cn(
        "group flex flex-col gap-3 rounded-lg border bg-card/40 p-4 transition-all hover:-translate-y-0.5",
        accent
          ? "border-c4e-neon/40 hover:border-c4e-neon hover:shadow-[0_0_24px_rgba(0,122,204,0.12)]"
          : "border-border hover:border-c4e-neon/30"
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-md border transition-colors",
          accent
            ? "border-c4e-neon/50 bg-c4e-neon/10 text-c4e-neon"
            : "border-border bg-black/40 text-c4e-muted group-hover:text-c4e-neon group-hover:border-c4e-neon/40"
        )}
      >
        {icon}
      </span>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-xs text-c4e-muted leading-relaxed">{description}</p>
      </div>
    </Link>
  );
}

export function PlatformQuickActions({ locale, isLoggedIn }: PlatformQuickActionsProps) {
  const t = useTranslations("platform");
  const th = useTranslations("home");
  const [lockOpen, setLockOpen] = useState(false);

  const guard = (e: React.MouseEvent) => {
    if (!isLoggedIn) {
      e.preventDefault();
      setLockOpen(true);
    }
  };

  const base = `/${locale}`;

  return (
    <>
      <div className="mb-6">
        <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-c4e-muted">
          {th("quickActions")}
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ActionCard
            href={`${base}/feed`}
            title={t("postFeed")}
            description={th("actionFeedDesc")}
            icon={<FeedIcon className="h-5 w-5" />}
            accent
            onGuardedClick={guard}
          />
          <ActionCard
            href={`${base}/repos`}
            title={t("createRepo")}
            description={th("actionRepoDesc")}
            icon={<RepoIcon className="h-5 w-5" />}
            onGuardedClick={guard}
          />
          <ActionCard
            href={`${base}/repos`}
            title={t("uploadCode")}
            description={th("actionUploadDesc")}
            icon={<RepoIcon className="h-5 w-5" />}
            onGuardedClick={guard}
          />
          <ActionCard
            href={`${base}/repos`}
            title={t("codeNow")}
            description={th("actionCodeDesc")}
            icon={<RepoIcon className="h-5 w-5" />}
            onGuardedClick={guard}
          />
        </div>
      </div>

      <SecurityLockModal
        open={lockOpen}
        onClose={() => setLockOpen(false)}
        title={t("guestLockTitle")}
        description={t("guestLockDesc")}
      />
    </>
  );
}
