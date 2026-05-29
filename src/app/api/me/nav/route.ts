import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null, communities: [], isFounder: false });
  }

  try {
    const [memberships, userRow] = await Promise.all([
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
    ]);

    return NextResponse.json({
      user: userRow
        ? { username: userRow.username, avatarUrl: userRow.avatarUrl }
        : { username: session.username, avatarUrl: null },
      communities: memberships.map((m) => m.community),
      isFounder: userRow?.isFounder ?? false,
    });
  } catch {
    return NextResponse.json({
      user: { username: session.username, avatarUrl: null },
      communities: [],
      isFounder: false,
    });
  }
}
