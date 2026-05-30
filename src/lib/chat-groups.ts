import { prisma } from "@/lib/prisma";
import { safeDbQuery } from "@/lib/db-safe";
import type { ChatGroupSummary } from "@/lib/chat-data";

export async function loadUserGroups(userId: string): Promise<ChatGroupSummary[]> {
  return safeDbQuery(
    "loadUserGroups",
    async () => {
      const memberships = await prisma.chatGroupMember.findMany({
        where: { userId },
        select: {
          group: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              _count: { select: { members: true } },
              messages: {
                take: 1,
                orderBy: { createdAt: "desc" },
                select: { createdAt: true },
              },
            },
          },
        },
      });

      return memberships.map((m) => ({
        id: m.group.id,
        name: m.group.name,
        avatarUrl: m.group.avatarUrl,
        memberCount: m.group._count.members,
        lastMessageAt: m.group.messages[0]?.createdAt ?? null,
      }));
    },
    []
  );
}

export async function isGroupMember(userId: string, groupId: string): Promise<boolean> {
  const row = await prisma.chatGroupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  return row !== null;
}
