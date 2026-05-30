import { prisma } from "@/lib/prisma";
import { safeDbQuery } from "@/lib/db-safe";

export interface ChatContact {
  id: string;
  username: string;
  avatarUrl: string | null;
  chatPublicKey: string | null;
  lastMessageAt: Date | null;
  unreadCount?: number;
}

export interface ChatMessageRow {
  id: string;
  senderId: string;
  receiverId: string;
  encryptedContent: string;
  nonce: string;
  messageKind: string;
  mediaUrl: string | null;
  mediaMimeType: string | null;
  fileName: string | null;
  createdAt: Date;
  sender: { username: string };
}

export interface ChatGroupSummary {
  id: string;
  name: string;
  avatarUrl: string | null;
  memberCount: number;
  lastMessageAt: Date | null;
}

export interface IncomingMessageNotice {
  id: string;
  senderId: string;
  senderUsername: string;
  createdAt: string;
}

/** @deprecated Use loadChatContacts */
export async function loadFollowingContacts(userId: string): Promise<ChatContact[]> {
  return loadChatContacts(userId);
}

/**
 * Takip edilenler + mesaj geçmişi olan tüm kullanıcılar (takip etmesen de gelen mesajlar görünür).
 */
export async function loadChatContacts(userId: string): Promise<ChatContact[]> {
  return safeDbQuery(
    "loadChatContacts",
    async () => {
      const [follows, recentMessages] = await Promise.all([
        prisma.follow.findMany({
          where: { followerId: userId, targetUserId: { not: null } },
          select: {
            targetUser: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
                chatPublicKey: true,
              },
            },
          },
        }),
        prisma.e2EEMessage.findMany({
          where: {
            OR: [{ senderId: userId }, { receiverId: userId }],
          },
          orderBy: { createdAt: "desc" },
          take: 500,
          select: {
            id: true,
            senderId: true,
            receiverId: true,
            createdAt: true,
          },
        }),
      ]);

      const peerMeta = new Map<
        string,
        { lastMessageAt: Date; lastIncomingId?: string; unreadHint: number }
      >();

      for (const msg of recentMessages) {
        const peerId = msg.senderId === userId ? msg.receiverId : msg.senderId;
        const existing = peerMeta.get(peerId);
        if (!existing) {
          peerMeta.set(peerId, {
            lastMessageAt: msg.createdAt,
            lastIncomingId: msg.receiverId === userId ? msg.id : undefined,
            unreadHint: msg.receiverId === userId ? 1 : 0,
          });
        } else if (msg.createdAt > existing.lastMessageAt) {
          existing.lastMessageAt = msg.createdAt;
          if (msg.receiverId === userId) {
            existing.lastIncomingId = msg.id;
            existing.unreadHint = 1;
          }
        }
      }

      const userById = new Map<string, ChatContact>();

      for (const f of follows) {
        if (!f.targetUser) continue;
        const meta = peerMeta.get(f.targetUser.id);
        userById.set(f.targetUser.id, {
          ...f.targetUser,
          lastMessageAt: meta?.lastMessageAt ?? null,
          unreadCount: meta?.unreadHint,
        });
      }

      const peerIds = Array.from(peerMeta.keys()).filter((id) => !userById.has(id));
      if (peerIds.length > 0) {
        const peers = await prisma.user.findMany({
          where: { id: { in: peerIds } },
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            chatPublicKey: true,
          },
        });
        for (const peer of peers) {
          const meta = peerMeta.get(peer.id)!;
          userById.set(peer.id, {
            ...peer,
            lastMessageAt: meta.lastMessageAt,
            unreadCount: meta.unreadHint,
          });
        }
      }

      const contacts = Array.from(userById.values());
      contacts.sort((a, b) => {
        const ta = a.lastMessageAt?.getTime() ?? 0;
        const tb = b.lastMessageAt?.getTime() ?? 0;
        return tb - ta;
      });

      return contacts;
    },
    []
  );
}

export async function loadConversation(
  userId: string,
  peerId: string
): Promise<ChatMessageRow[]> {
  return safeDbQuery(
    "loadConversation",
    () =>
      prisma.e2EEMessage.findMany({
        where: {
          OR: [
            { senderId: userId, receiverId: peerId },
            { senderId: peerId, receiverId: userId },
          ],
        },
        orderBy: { createdAt: "asc" },
        take: 200,
        select: {
          id: true,
          senderId: true,
          receiverId: true,
          encryptedContent: true,
          nonce: true,
          messageKind: true,
          mediaUrl: true,
          mediaMimeType: true,
          fileName: true,
          createdAt: true,
          sender: { select: { username: true } },
        },
      }),
    []
  );
}

export async function hasConversation(userId: string, peerId: string): Promise<boolean> {
  const row = await safeDbQuery(
    "hasConversation",
    () =>
      prisma.e2EEMessage.findFirst({
        where: {
          OR: [
            { senderId: userId, receiverId: peerId },
            { senderId: peerId, receiverId: userId },
          ],
        },
        select: { id: true },
      }),
    null
  );
  return row !== null;
}

export async function getFollowStatus(
  followerId: string,
  targetUserId: string
): Promise<boolean> {
  const edge = await safeDbQuery(
    "getFollowStatus",
    () =>
      prisma.follow.findUnique({
        where: { followerId_targetUserId: { followerId, targetUserId } },
      }),
    null
  );
  return edge !== null;
}

export async function fetchIncomingSince(
  userId: string,
  since: Date
): Promise<IncomingMessageNotice[]> {
  return safeDbQuery(
    "fetchIncomingSince",
    async () => {
      const rows = await prisma.e2EEMessage.findMany({
        where: {
          receiverId: userId,
          createdAt: { gt: since },
        },
        orderBy: { createdAt: "asc" },
        take: 50,
        select: {
          id: true,
          senderId: true,
          createdAt: true,
          sender: { select: { username: true } },
        },
      });
      return rows.map((r) => ({
        id: r.id,
        senderId: r.senderId,
        senderUsername: r.sender.username,
        createdAt: r.createdAt.toISOString(),
      }));
    },
    []
  );
}
