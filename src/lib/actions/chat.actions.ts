"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { msg } from "@/lib/messages";
import { canSendDirectMessage } from "@/lib/chat-permissions";
import { pushMessageToRelay } from "@/lib/relay";
import { clientRateLimitKey, rateLimit } from "@/lib/rate-limit";

const MAX_CIPHER_BYTES = 64 * 1024;

export interface ActionResult {
  success: boolean;
  message: string;
  messageId?: string;
}

function localeOf(formData: FormData): string {
  return String(formData.get("locale") ?? "tr");
}

async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("AUTH_REQUIRED");
  return session;
}

async function isFollowing(followerId: string, targetUserId: string): Promise<boolean> {
  const edge = await prisma.follow.findUnique({
    where: {
      followerId_targetUserId: { followerId, targetUserId },
    },
  });
  return edge !== null;
}

export async function followUserAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const locale = localeOf(formData);
  try {
    const session = await requireSession();
    const targetUserId = String(formData.get("targetUserId") ?? "");

    if (targetUserId === session.id) {
      return { success: false, message: msg(locale, "chat.cannotFollowSelf") };
    }

    const target = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) return { success: false, message: msg(locale, "chat.userNotFound") };

    await prisma.follow.upsert({
      where: {
        followerId_targetUserId: { followerId: session.id, targetUserId },
      },
      create: {
        followerId: session.id,
        targetType: "USER",
        targetUserId,
      },
      update: {},
    });

    revalidatePath(`/${locale}/${target.username}`);
    revalidatePath(`/${locale}/chat`);
    return { success: true, message: msg(locale, "chat.followed") };
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return { success: false, message: msg(locale, "errors.authRequired") };
    }
    logger.error("followUserAction failed", { error });
    return { success: false, message: msg(locale, "errors.server") };
  }
}

export async function unfollowUserAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const locale = localeOf(formData);
  try {
    const session = await requireSession();
    const targetUserId = String(formData.get("targetUserId") ?? "");

    const target = await prisma.user.findUnique({ where: { id: targetUserId } });
    await prisma.follow.deleteMany({
      where: { followerId: session.id, targetUserId },
    });

    if (target) {
      revalidatePath(`/${locale}/${target.username}`);
    }
    revalidatePath(`/${locale}/chat`);
    return { success: true, message: msg(locale, "chat.unfollowed") };
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return { success: false, message: msg(locale, "errors.authRequired") };
    }
    logger.error("unfollowUserAction failed", { error });
    return { success: false, message: msg(locale, "errors.server") };
  }
}

export async function saveChatPublicKeyAction(publicKeyJwk: string): Promise<ActionResult> {
  const locale = "tr";
  try {
    const session = await requireSession();
    JSON.parse(publicKeyJwk);
    await prisma.user.update({
      where: { id: session.id },
      data: { chatPublicKey: publicKeyJwk },
    });
    return { success: true, message: msg(locale, "chat.keysSaved") };
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return { success: false, message: msg(locale, "errors.authRequired") };
    }
    logger.error("saveChatPublicKeyAction failed", { error });
    return { success: false, message: msg(locale, "errors.server") };
  }
}

export async function sendChatMessageAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const locale = localeOf(formData);
  try {
    const session = await requireSession();
    const receiverId = String(formData.get("receiverId") ?? "");
    const encryptedContent = String(formData.get("encryptedContent") ?? "");
    const nonce = String(formData.get("nonce") ?? "");

    if (!encryptedContent || !nonce) {
      return { success: false, message: msg(locale, "chat.emptyMessage") };
    }

    if (
      encryptedContent.length > MAX_CIPHER_BYTES ||
      nonce.length > 512
    ) {
      return { success: false, message: msg(locale, "errors.invalidInput") };
    }

    const rlKey = clientRateLimitKey("chat-send", session.id);
    if (!rateLimit(rlKey, 30, 60_000)) {
      return { success: false, message: msg(locale, "errors.rateLimited") };
    }

    const allowed = await canSendDirectMessage(session.id, receiverId);
    if (!allowed) {
      return { success: false, message: msg(locale, "chat.cannotMessage") };
    }

    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { username: true, chatPublicKey: true },
    });
    if (!receiver) return { success: false, message: msg(locale, "chat.userNotFound") };
    if (!receiver.chatPublicKey) {
      return { success: false, message: msg(locale, "chat.peerNoKeys") };
    }

    const created = await prisma.e2EEMessage.create({
      data: {
        senderId: session.id,
        receiverId,
        encryptedContent,
        nonce,
      },
      select: { id: true },
    });

    await pushMessageToRelay({
      receiverId,
      senderUsername: session.username,
      messageId: created.id,
    });

    revalidatePath(`/${locale}/chat`);
    revalidatePath(`/${locale}/chat/${receiver.username}`);
    return {
      success: true,
      message: msg(locale, "chat.sent"),
      messageId: created.id,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return { success: false, message: msg(locale, "errors.authRequired") };
    }
    logger.error("sendChatMessageAction failed", { error });
    return { success: false, message: msg(locale, "errors.server") };
  }
}
