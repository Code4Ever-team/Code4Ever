"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Users } from "lucide-react";
import type { ChatGroupSummary } from "@/lib/chat-data";
import { Card, CardContent } from "@/components/ui/card";

interface GroupInboxProps {
  locale: string;
  groups: ChatGroupSummary[];
}

export function GroupInbox({ locale, groups }: GroupInboxProps) {
  const t = useTranslations("chat");

  if (groups.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <Users className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("noGroups")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ul className="space-y-2">
      {groups.map((g) => (
        <li key={g.id}>
          <Link href={`/${locale}/chat/groups/${g.id}`}>
            <Card className="transition-colors hover:border-primary/50">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Users className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{g.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("memberCount", { count: g.memberCount })}
                    {g.lastMessageAt
                      ? ` · ${new Date(g.lastMessageAt).toLocaleString(
                          locale === "tr" ? "tr-TR" : "en-US"
                        )}`
                      : ""}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
