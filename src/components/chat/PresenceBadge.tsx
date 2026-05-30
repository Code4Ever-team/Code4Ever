"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { fetchDeduped } from "@/lib/fetch-dedupe";
import { cn } from "@/lib/utils";

const CACHE_MS = 60_000;
const cache = new Map<string, { online: boolean; at: number }>();

interface PresenceBadgeProps {
  userId: string;
  className?: string;
}

export function PresenceBadge({ userId, className }: PresenceBadgeProps) {
  const t = useTranslations("chat");
  const [online, setOnline] = useState<boolean | null>(() => {
    const hit = cache.get(userId);
    return hit && Date.now() - hit.at < CACHE_MS ? hit.online : null;
  });

  useEffect(() => {
    let cancelled = false;
    const hit = cache.get(userId);
    if (hit && Date.now() - hit.at < CACHE_MS) {
      setOnline(hit.online);
      return;
    }

    void fetchDeduped(`/api/presence?ids=${encodeURIComponent(userId)}`, {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { users?: Record<string, { online: boolean }> } | null) => {
        if (!cancelled && data?.users?.[userId]) {
          const value = data.users[userId].online;
          cache.set(userId, { online: value, at: Date.now() });
          setOnline(value);
        }
      })
      .catch(() => {
        /* ignore */
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (online === null) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[10px] font-medium",
        online ? "text-emerald-400" : "text-muted-foreground",
        className
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          online ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" : "bg-muted-foreground"
        )}
      />
      {online ? t("online") : t("offline")}
    </span>
  );
}
