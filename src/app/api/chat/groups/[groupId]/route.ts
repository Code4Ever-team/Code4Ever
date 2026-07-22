import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isGroupMember } from "@/lib/chat-groups";

interface RouteParams {
  params: { groupId: string };
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { groupId } = params;
    if (!(await isGroupMember(session.id, groupId))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const group = await prisma.chatGroup.findUnique({
      where: { id: groupId },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        createdById: true,
        creator: {
          select: { id: true, username: true, avatarUrl: true },
        },
        members: {
          select: {
            role: true,
            user: {
              select: { id: true, username: true, avatarUrl: true },
            },
          },
          orderBy: { joinedAt: "asc" },
        },
      },
    });

    if (!group) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const me = group.members.find((m) => m.user.id === session.id);

    return NextResponse.json({
      id: group.id,
      name: group.name,
      avatarUrl: group.avatarUrl,
      creator: group.creator,
      myRole: me?.role ?? "MEMBER",
      members: group.members.map((m) => ({
        userId: m.user.id,
        username: m.user.username,
        avatarUrl: m.user.avatarUrl,
        role: m.role,
      })),
    });
  } catch {
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { groupId } = params;
    const membership = await prisma.chatGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId: session.id } },
    });
    if (!membership || membership.role !== "ADMIN") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as { name?: string };
    const name = String(body.name ?? "").trim();
    if (name.length < 2) {
      return NextResponse.json({ error: "invalid_name" }, { status: 400 });
    }

    const updated = await prisma.chatGroup.update({
      where: { id: groupId },
      data: { name },
      select: { id: true, name: true, avatarUrl: true },
    });

    return NextResponse.json({ success: true, group: updated });
  } catch {
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
