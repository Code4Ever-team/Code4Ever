import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { saveMediaUpload } from "@/lib/media-upload";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "no_file" }, { status: 400 });
    }

    const saved = await saveMediaUpload(file, "chat-media");
    return NextResponse.json({
      url: saved.url,
      mimeType: saved.mimeType,
      kind: saved.kind,
      fileName: file.name,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "FILE_TOO_LARGE") {
      return NextResponse.json({ error: "too_large" }, { status: 413 });
    }
    if (error instanceof Error && error.message === "FILE_TYPE_BLOCKED") {
      return NextResponse.json({ error: "blocked" }, { status: 415 });
    }
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
