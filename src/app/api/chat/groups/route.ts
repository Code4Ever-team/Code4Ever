import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadUserGroups } from "@/lib/chat-groups";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const groups = await loadUserGroups(session.id);
    return NextResponse.json({
      groups: groups.map((g) => ({
        ...g,
        lastMessageAt: g.lastMessageAt?.toISOString() ?? null,
      })),
    });
  } catch {
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = (await request.json()) as { name?: string; memberUsernames?: string[] };
    const name = String(body.name ?? "").trim().slice(0, 80);
    if (name.length < 2) {
      return NextResponse.json({ error: "invalid_name" }, { status: 400 });
    }

    const usernames = (body.memberUsernames ?? [])
      .map((u) => u.trim().toLowerCase())
      .filter((u) => u && u !== session.username)
      .slice(0, 20);

    const extraUsers =
      usernames.length > 0
        ? await prisma.user.findMany({
            where: { username: { in: usernames } },
            select: { id: true },
          })
        : [];

    const group = await prisma.chatGroup.create({
      data: {
        name,
        createdById: session.id,
        members: {
          create: [
            { userId: session.id, role: "ADMIN" },
            ...extraUsers.map((u) => ({ userId: u.id, role: "MEMBER" })),
          ],
        },
      },
      select: { id: true, name: true },
    });

    return NextResponse.json({ success: true, groupId: group.id, name: group.name });
  } catch {
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
