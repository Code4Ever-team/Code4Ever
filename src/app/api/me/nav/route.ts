import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isPlatformPanelAdmin } from "@/lib/platform-panel";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null, communities: [], isPanelAdmin: false });
  }

  try {
    const [memberships, userRow, panelAdmin] = await Promise.all([
      prisma.communityMember.findMany({
        where: { userId: session.id },
        take: 5,
        orderBy: { joinedAt: "desc" },
        select: {
          community: {
            select: { id: true, name: true, logoUrl: true },
          },
        },
      }),
      prisma.user.findUnique({
        where: { id: session.id },
        select: { username: true, avatarUrl: true, isFounder: true },
      }),
      isPlatformPanelAdmin(session.id),
    ]);

    return NextResponse.json({
      user: userRow
        ? { username: userRow.username, avatarUrl: userRow.avatarUrl }
        : { username: session.username, avatarUrl: null },
      communities: memberships.map((m) => m.community),
      isPanelAdmin: panelAdmin,
      isFounder: userRow?.isFounder ?? false,
    });
  } catch {
    return NextResponse.json({
      user: { username: session.username, avatarUrl: null },
      communities: [],
      isPanelAdmin: false,
      isFounder: false,
    });
  }
}
