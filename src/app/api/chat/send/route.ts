import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canSendDirectMessage } from "@/lib/chat-permissions";
import { pushMessageToRelay } from "@/lib/relay";
import { clientRateLimitKey, rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      receiverId?: string;
      encryptedContent?: string;
      nonce?: string;
      messageKind?: string;
      mediaUrl?: string | null;
      mediaMimeType?: string | null;
      fileName?: string | null;
    };

    const receiverId = body.receiverId ?? "";
    const messageKind = body.messageKind ?? "text";
    const encryptedContent = body.encryptedContent ?? "";
    const nonce = body.nonce ?? "";
    const mediaUrl = body.mediaUrl ?? null;

    if (!receiverId) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }

    const isMedia = messageKind !== "text";
    if (!isMedia && !encryptedContent) {
      return NextResponse.json({ error: "empty" }, { status: 400 });
    }
    if (isMedia && !mediaUrl) {
      return NextResponse.json({ error: "no_media" }, { status: 400 });
    }

    const rlKey = clientRateLimitKey("chat-send", session.id);
    if (!rateLimit(rlKey, 60, 60_000)) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    const allowed = await canSendDirectMessage(session.id, receiverId);
    if (!allowed) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { username: true, chatPublicKey: true },
    });
    if (!receiver) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (!isMedia && !receiver.chatPublicKey) {
      return NextResponse.json({ error: "no_keys" }, { status: 400 });
    }

    const created = await prisma.e2EEMessage.create({
      data: {
        senderId: session.id,
        receiverId,
        encryptedContent: encryptedContent || "",
        nonce: nonce || "",
        messageKind,
        mediaUrl,
        mediaMimeType: body.mediaMimeType ?? null,
        fileName: body.fileName ?? null,
      },
      select: { id: true, createdAt: true },
    });

    void pushMessageToRelay({
      receiverId,
      senderUsername: session.username,
      messageId: created.id,
    });

    return NextResponse.json({
      success: true,
      messageId: created.id,
      createdAt: created.createdAt.toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
