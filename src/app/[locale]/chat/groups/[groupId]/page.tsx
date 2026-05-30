import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDatabaseAvailable } from "@/lib/db-safe";
import { isGroupMember } from "@/lib/chat-groups";
import { GroupChatThread } from "@/components/chat/GroupChatThread";
import { ChatKeySetup } from "@/components/chat/ChatKeySetup";
import { DbOffline } from "@/components/system/DbOffline";

interface GroupPageProps {
  params: Promise<{ locale: string; groupId: string }>;
}

export default async function GroupChatPage({ params }: GroupPageProps) {
  const { locale, groupId } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/${locale}/login?redirect=/${locale}/chat/groups/${groupId}`);
  }

  const dbOk = await isDatabaseAvailable();
  if (!dbOk) {
    return (
      <main className="py-10">
        <DbOffline />
      </main>
    );
  }

  const member = await isGroupMember(session.id, groupId);
  if (!member) notFound();

  const group = await prisma.chatGroup.findUnique({
    where: { id: groupId },
    select: { id: true, name: true },
  });
  if (!group) notFound();

  const messages = await prisma.chatGroupMessage.findMany({
    where: { groupId },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: {
      id: true,
      senderId: true,
      encryptedContent: true,
      messageKind: true,
      mediaUrl: true,
      mediaMimeType: true,
      fileName: true,
      createdAt: true,
      sender: { select: { username: true } },
    },
  });

  return (
    <main className="mx-auto max-w-3xl py-6 md:py-10">
      <ChatKeySetup />
      <GroupChatThread
        locale={locale}
        myUserId={session.id}
        groupId={group.id}
        groupName={group.name}
        initialMessages={messages.map((m) => ({
          ...m,
          createdAt: m.createdAt.toISOString(),
        }))}
      />
    </main>
  );
}
