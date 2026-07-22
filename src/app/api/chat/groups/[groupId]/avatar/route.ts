import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveMediaUpload } from "@/lib/media-upload";

interface RouteParams {
  params: { groupId: string };
}

export async function POST(request: Request, { params }: RouteParams) {
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

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "no_file" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "blocked" }, { status: 415 });
    }

    const saved = await saveMediaUpload(file, "chat-media");
    await prisma.chatGroup.update({
      where: { id: groupId },
      data: { avatarUrl: saved.url },
    });

    return NextResponse.json({ avatarUrl: saved.url });
  } catch (error) {
    if (error instanceof Error && error.message === "FILE_TOO_LARGE") {
      return NextResponse.json({ error: "too_large" }, { status: 413 });
    }
    if (error instanceof Error && error.message === "STORAGE_UNAVAILABLE") {
      return NextResponse.json({ error: "storage" }, { status: 503 });
    }
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
