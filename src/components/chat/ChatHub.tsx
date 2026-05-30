"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import type { ChatContact, ChatGroupSummary } from "@/lib/chat-data";
import { UnifiedChatInbox } from "@/components/chat/UnifiedChatInbox";
import { CreateGroupDialog } from "@/components/chat/CreateGroupDialog";
import { Button } from "@/components/ui/button";

interface ChatHubProps {
  locale: string;
  contacts: ChatContact[];
  groups: ChatGroupSummary[];
}

export function ChatHub({ locale, contacts, groups }: ChatHubProps) {
  const t = useTranslations("chat");
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="relative pb-20">
      <header className="mb-4 pr-14">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </header>

      <UnifiedChatInbox locale={locale} contacts={contacts} groups={groups} />

      <Button
        type="button"
        size="icon"
        className="fixed bottom-24 right-4 z-40 h-14 w-14 rounded-full shadow-lg md:bottom-10 md:right-8"
        onClick={() => setCreateOpen(true)}
        aria-label={t("createGroup")}
      >
        <Plus className="h-6 w-6" />
      </Button>

      <CreateGroupDialog locale={locale} open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
