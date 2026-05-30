import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isDatabaseAvailable } from "@/lib/db-safe";
import { loadChatContacts } from "@/lib/chat-data";
import { loadUserGroups } from "@/lib/chat-groups";
import { ChatHub } from "@/components/chat/ChatHub";
import { ChatKeySetup } from "@/components/chat/ChatKeySetup";
import { DbOffline } from "@/components/system/DbOffline";

interface ChatPageProps {
  params: Promise<{ locale: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { locale } = await params;
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

  const [contacts, groups] = await Promise.all([
    loadChatContacts(session.id),
    loadUserGroups(session.id),
  ]);

  return (
    <main className="mx-auto max-w-3xl py-6 md:py-10">
      <ChatKeySetup />
      <ChatHub locale={locale} contacts={contacts} groups={groups} />
    </main>
  );
}
