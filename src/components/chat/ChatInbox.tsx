"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { MessageCircle } from "lucide-react";
import type { ChatContact } from "@/lib/chat-data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface ChatInboxProps {
  locale: string;
  contacts: ChatContact[];
}

export function ChatInbox({ locale, contacts }: ChatInboxProps) {
  const t = useTranslations("chat");

  if (contacts.length === 0) {
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
      {contacts.map((contact) => (
        <li key={contact.id}>
          <Link href={`/${locale}/chat/${contact.username}`}>
            <Card className="transition-colors hover:border-primary/50">
              <CardContent className="flex items-center gap-3 p-4">
                <Avatar className="h-10 w-10">
                  {contact.avatarUrl ? (
                    <AvatarImage src={contact.avatarUrl} alt={contact.username} />
                  ) : null}
                  <AvatarFallback>{contact.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">@{contact.username}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {!contact.chatPublicKey
                      ? t("noKeys")
                      : contact.lastMessageAt
                        ? new Date(contact.lastMessageAt).toLocaleString(
                            locale === "tr" ? "tr-TR" : "en-US"
                          )
                        : t("noMessagesYet")}
                  </p>
                </div>
                {!contact.chatPublicKey && (
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {t("noKeysShort")}
                  </Badge>
                )}
                {(contact.unreadCount ?? 0) > 0 && (
                  <Badge className="shrink-0">{t("unread")}</Badge>
                )}
              </CardContent>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
