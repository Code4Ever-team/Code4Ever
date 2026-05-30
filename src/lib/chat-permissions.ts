import { prisma } from "@/lib/prisma";

/** Takip veya herhangi bir mesaj geçmişi varsa yazışılabilir. */
export async function canSendDirectMessage(
  senderId: string,
  receiverId: string
): Promise<boolean> {
  if (senderId === receiverId) return false;

  const follow = await prisma.follow.findUnique({
    where: {
      followerId_targetUserId: { followerId: senderId, targetUserId: receiverId },
    },
  });
  if (follow) return true;

  const prior = await prisma.e2EEMessage.findFirst({
    where: {
      OR: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    },
    select: { id: true },
  });
  return prior !== null;
}

export async function canAccessDirectThread(
  userId: string,
  peerId: string
): Promise<boolean> {
  return canSendDirectMessage(userId, peerId);
}
