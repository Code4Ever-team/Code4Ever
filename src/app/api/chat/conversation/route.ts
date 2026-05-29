import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFollowStatus, hasConversation } from "@/lib/chat-data";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const peerId = searchParams.get("peerId") ?? "";
    const sinceRaw = searchParams.get("since") ?? "";

    if (!peerId) {
      return NextResponse.json({ error: "peer_required" }, { status: 400 });
    }

    const peer = await prisma.user.findUnique({
      where: { id: peerId },
      select: { id: true },
    });
    if (!peer) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const [following, conversation] = await Promise.all([
      getFollowStatus(session.id, peerId),
      hasConversation(session.id, peerId),
    ]);

    if (!following && !conversation) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const since = sinceRaw ? new Date(sinceRaw) : null;
    const sinceFilter =
      since && !Number.isNaN(since.getTime()) ? { gt: since } : undefined;

    const messages = await prisma.e2EEMessage.findMany({
      where: {
        OR: [
          { senderId: session.id, receiverId: peerId },
          { senderId: peerId, receiverId: session.id },
        ],
        ...(sinceFilter ? { createdAt: sinceFilter } : {}),
      },
      orderBy: { createdAt: "asc" },
      take: sinceFilter ? 100 : 200,
      select: {
        id: true,
        senderId: true,
        receiverId: true,
        encryptedContent: true,
        nonce: true,
        createdAt: true,
        sender: { select: { username: true } },
      },
    });

    return NextResponse.json({
      messages: messages.map((m) => ({
        ...m,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch {
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
