import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isGroupMember } from "@/lib/chat-groups";

interface RouteParams {
  params: Promise<{ groupId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { groupId } = await params;
    if (!(await isGroupMember(session.id, groupId))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const sinceRaw = new URL(request.url).searchParams.get("since") ?? "";
    const since = sinceRaw ? new Date(sinceRaw) : null;
    const sinceFilter =
      since && !Number.isNaN(since.getTime()) ? { gt: since } : undefined;

    const messages = await prisma.chatGroupMessage.findMany({
      where: {
        groupId,
        ...(sinceFilter ? { createdAt: sinceFilter } : {}),
      },
      orderBy: { createdAt: "asc" },
      take: sinceFilter ? 100 : 200,
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
