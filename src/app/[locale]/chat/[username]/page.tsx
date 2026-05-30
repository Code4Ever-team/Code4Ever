import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDatabaseAvailable } from "@/lib/db-safe";
import { loadConversation } from "@/lib/chat-data";
import { canAccessDirectThread } from "@/lib/chat-permissions";
import { ChatThread } from "@/components/chat/ChatThread";
import { ChatKeySetup } from "@/components/chat/ChatKeySetup";
import { DbOffline } from "@/components/system/DbOffline";

interface ChatThreadPageProps {
  params: Promise<{ locale: string; username: string }>;
}

export default async function ChatThreadPage({ params }: ChatThreadPageProps) {
  const { locale, username } = await params;
  const t = await getTranslations("chat");
  const session = await getSession();

  if (!session) {
    redirect(`/${locale}/login?redirect=/${locale}/chat/${username}`);
  }

  const dbOk = await isDatabaseAvailable();
  if (!dbOk) {
    return (
      <main className="py-10">
        <DbOffline />
      </main>
    );
  }

  const peer = await prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true, chatPublicKey: true },
  });

  if (!peer) notFound();

  const allowed = await canAccessDirectThread(session.id, peer.id);
  if (!allowed) {
    return (
      <main className="mx-auto max-w-3xl py-10">
        <p className="text-sm text-destructive">{t("cannotMessage")}</p>
      </main>
    );
  }

  const messages = await loadConversation(session.id, peer.id);

  return (
    <main className="mx-auto max-w-3xl py-6 md:py-10">
      <ChatKeySetup />
      <ChatThread
        locale={locale}
        myUserId={session.id}
        myUsername={session.username}
        peer={peer}
        messages={messages}
      />
    </main>
  );
}
