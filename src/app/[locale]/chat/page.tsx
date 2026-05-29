import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/auth";
import { isDatabaseAvailable } from "@/lib/db-safe";
import { loadChatContacts } from "@/lib/chat-data";
import { ChatInbox } from "@/components/chat/ChatInbox";
import { ChatKeySetup } from "@/components/chat/ChatKeySetup";
import { DbOffline } from "@/components/system/DbOffline";

interface ChatPageProps {
  params: Promise<{ locale: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { locale } = await params;
  const t = await getTranslations("chat");
  const session = await getSession();

  if (!session) {
    redirect(`/${locale}/login?redirect=/${locale}/chat`);
  }

  const dbOk = await isDatabaseAvailable();
  if (!dbOk) {
    return (
      <main className="py-10">
        <DbOffline />
      </main>
    );
  }

  const contacts = await loadChatContacts(session.id);

  return (
    <main className="mx-auto max-w-3xl py-6 md:py-10">
      <ChatKeySetup />
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </header>
      <ChatInbox locale={locale} contacts={contacts} />
    </main>
  );
}
