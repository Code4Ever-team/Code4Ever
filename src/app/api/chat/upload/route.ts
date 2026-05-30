import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isBlobConfigured, saveMediaUpload } from "@/lib/media-upload";

export const maxDuration = 60;
export const runtime = "nodejs";

export async function POST(request: Request) {
  const started = Date.now();

  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    if (!isBlobConfigured()) {
      console.error("[UPLOAD_ERROR] BLOB_READ_WRITE_TOKEN missing");
      return NextResponse.json(
        {
          error: "storage",
          message: "Vercel Dashboard → Storage → Blob → BLOB_READ_WRITE_TOKEN",
        },
        { status: 503 }
      );
    }

    const file = formDataFile(await request.formData());
    if (!file) {
      return NextResponse.json({ error: "no_file" }, { status: 400 });
    }

    const saved = await saveMediaUpload(file, "chat-media");

    console.info("[media-upload] blob ok", {
      userId: session.id,
      kind: saved.kind,
      ms: Date.now() - started,
    });

    return NextResponse.json({
      url: saved.url,
      mimeType: saved.mimeType,
      kind: saved.kind,
      fileName: saved.fileName,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[UPLOAD_ERROR] route", { message, ms: Date.now() - started });

    if (message === "FILE_TOO_LARGE") {
      return NextResponse.json({ error: "too_large" }, { status: 413 });
    }
    if (message === "FILE_TYPE_BLOCKED") {
      return NextResponse.json({ error: "blocked" }, { status: 415 });
    }
    if (message === "STORAGE_UNAVAILABLE") {
      return NextResponse.json({ error: "storage", message }, { status: 503 });
    }

    return NextResponse.json({ error: "server", message }, { status: 500 });
  }
}

function formDataFile(formData: FormData): File | null {
  const file = formData.get("file");
  return file instanceof File && file.size > 0 ? file : null;
}
