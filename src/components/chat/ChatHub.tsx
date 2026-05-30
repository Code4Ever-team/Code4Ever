"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Users, User } from "lucide-react";
import type { ChatContact } from "@/lib/chat-data";
import type { ChatGroupSummary } from "@/lib/chat-data";
import { ChatInbox } from "@/components/chat/ChatInbox";
import { GroupInbox } from "@/components/chat/GroupInbox";
import { CreateGroupForm } from "@/components/chat/CreateGroupForm";
import { Button } from "@/components/ui/button";
interface ChatHubProps {
  locale: string;
  contacts: ChatContact[];
  groups: ChatGroupSummary[];
}

export function ChatHub({ locale, contacts, groups }: ChatHubProps) {
  const t = useTranslations("chat");
  const [tab, setTab] = useState<"direct" | "groups">("direct");

  return (
    <>
      <header className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </header>

      <div className="mb-4 flex gap-2">
        <Button
          type="button"
          variant={tab === "direct" ? "default" : "secondary"}
          className="flex-1"
          onClick={() => setTab("direct")}
        >
          <User className="mr-2 h-4 w-4" />
          {t("tabDirect")}
        </Button>
        <Button
          type="button"
          variant={tab === "groups" ? "default" : "secondary"}
          className="flex-1"
          onClick={() => setTab("groups")}
        >
          <Users className="mr-2 h-4 w-4" />
          {t("tabGroups")}
        </Button>
      </div>

      {tab === "direct" ? (
        <ChatInbox locale={locale} contacts={contacts} />
      ) : (
        <div className="space-y-4">
          <CreateGroupForm locale={locale} />
          <GroupInbox locale={locale} groups={groups} />
        </div>
      )}
    </>
  );
}
