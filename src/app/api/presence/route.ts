import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ONLINE_MS = 90_000;

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const ids = new URL(request.url).searchParams.get("ids")?.split(",").filter(Boolean) ?? [];
    if (ids.length === 0) {
      return NextResponse.json({ users: {} });
    }

    const rows = await prisma.user.findMany({
      where: { id: { in: ids.slice(0, 50) } },
      select: { id: true, lastSeenAt: true },
    });

    const now = Date.now();
    const users: Record<string, { online: boolean; lastSeenAt: string | null }> = {};
    for (const row of rows) {
      const last = row.lastSeenAt?.getTime() ?? 0;
      users[row.id] = {
        online: now - last < ONLINE_MS,
        lastSeenAt: row.lastSeenAt?.toISOString() ?? null,
      };
    }

    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
