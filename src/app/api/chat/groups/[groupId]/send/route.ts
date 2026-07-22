import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isGroupMember } from "@/lib/chat-groups";

interface RouteParams {
  params: { groupId: string };
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { groupId } = params;
    if (!(await isGroupMember(session.id, groupId))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as {
      text?: string;
      nonce?: string;
      messageKind?: string;
      mediaUrl?: string | null;
      mediaMimeType?: string | null;
      fileName?: string | null;
    };

    const messageKind = body.messageKind ?? "text";
    const text = String(body.text ?? "").trim();
    const isMedia = messageKind !== "text";

    if (!isMedia && !text) {
      return NextResponse.json({ error: "empty" }, { status: 400 });
    }
    if (isMedia && !body.mediaUrl) {
      return NextResponse.json({ error: "no_media" }, { status: 400 });
    }

    const created = await prisma.chatGroupMessage.create({
      data: {
        groupId,
        senderId: session.id,
        encryptedContent: text,
        nonce: String(body.nonce ?? ""),
        messageKind,
        mediaUrl: body.mediaUrl ?? null,
        mediaMimeType: body.mediaMimeType ?? null,
        fileName: body.fileName ?? null,
      },
      select: { id: true, createdAt: true },
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

