"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { MessageCircle, Users } from "lucide-react";
import type { ChatContact, ChatGroupSummary } from "@/lib/chat-data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export type UnifiedInboxItem =
  | {
      kind: "direct";
      id: string;
      href: string;
      title: string;
      subtitle: string;
      avatarUrl: string | null;
      initials: string;
      unread?: number;
      showNoKeys?: boolean;
    }
  | {
      kind: "group";
      id: string;
      href: string;
      title: string;
      subtitle: string;
      avatarUrl: string | null;
      initials: string;
    };

interface UnifiedChatInboxProps {
  locale: string;
  contacts: ChatContact[];
  groups: ChatGroupSummary[];
}

function toItems(
  locale: string,
  contacts: ChatContact[],
  groups: ChatGroupSummary[],
  t: ReturnType<typeof useTranslations<"chat">>
): UnifiedInboxItem[] {
  const direct: UnifiedInboxItem[] = contacts.map((c) => ({
    kind: "direct" as const,
    id: c.id,
    href: `/${locale}/chat/${c.username}`,
    title: `@${c.username}`,
    subtitle: !c.chatPublicKey
      ? t("noKeys")
      : c.lastMessageAt
        ? new Date(c.lastMessageAt).toLocaleString(locale === "tr" ? "tr-TR" : "en-US")
        : t("noMessagesYet"),
    avatarUrl: c.avatarUrl,
    initials: c.username.slice(0, 2).toUpperCase(),
    unread: c.unreadCount,
    showNoKeys: !c.chatPublicKey,
  }));

  const groupItems: UnifiedInboxItem[] = groups.map((g) => ({
    kind: "group" as const,
    id: g.id,
    href: `/${locale}/chat/groups/${g.id}`,
    title: g.name,
    subtitle: g.lastMessageAt
      ? new Date(g.lastMessageAt).toLocaleString(locale === "tr" ? "tr-TR" : "en-US")
      : t("noMessagesYet"),
    avatarUrl: g.avatarUrl,
    initials: g.name.slice(0, 2).toUpperCase(),
  }));

  const getTime = (item: UnifiedInboxItem) => {
    if (item.kind === "direct") {
      return contacts.find((x) => x.id === item.id)?.lastMessageAt?.getTime() ?? 0;
    }
    return groups.find((x) => x.id === item.id)?.lastMessageAt?.getTime() ?? 0;
  };

  return [...direct, ...groupItems].sort((a, b) => getTime(b) - getTime(a));
}

export function UnifiedChatInbox({ locale, contacts, groups }: UnifiedChatInboxProps) {
  const t = useTranslations("chat");

  const items = useMemo(
    () => toItems(locale, contacts, groups, t),
    [locale, contacts, groups, t]
  );

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <MessageCircle className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("noContacts")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={`${item.kind}-${item.id}`}>
          <Link href={item.href}>
            <Card className="transition-colors hover:border-primary/50">
              <CardContent className="flex items-center gap-3 p-4">
                <Avatar className="h-10 w-10">
                  {item.avatarUrl ? <AvatarImage src={item.avatarUrl} alt="" /> : null}
                  <AvatarFallback>
                    {item.kind === "group" ? (
                      <Users className="h-4 w-4" />
                    ) : (
                      item.initials
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{item.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                </div>
                {item.kind === "direct" && item.showNoKeys && (
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {t("noKeysShort")}
                  </Badge>
                )}
                {item.kind === "direct" && (item.unread ?? 0) > 0 && (
                  <Badge className="shrink-0">{t("unread")}</Badge>
                )}
                {item.kind === "group" && (
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    {t("groupBadge")}
                  </Badge>
                )}
              </CardContent>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
