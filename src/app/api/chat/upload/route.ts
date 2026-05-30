import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { saveMediaUpload } from "@/lib/media-upload";
import { isSupabaseStorageConfigured } from "@/lib/supabase-admin";

export const maxDuration = 30;
export const runtime = "nodejs";

const LOG_PREFIX = "[api/chat/upload]";

export async function POST(request: Request) {
  const started = Date.now();

  try {
    const session = await getSession();
    if (!session) {
      console.warn(LOG_PREFIX, "unauthorized");
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    if (!isSupabaseStorageConfigured() && !process.env.BLOB_READ_WRITE_TOKEN) {
      console.error(LOG_PREFIX, "no storage backend configured");
      return NextResponse.json(
        {
          error: "storage",
          message:
            "Set SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL or BLOB_READ_WRITE_TOKEN",
        },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      console.warn(LOG_PREFIX, "no_file", { userId: session.id });
      return NextResponse.json({ error: "no_file" }, { status: 400 });
    }

    console.info(LOG_PREFIX, "start", {
      userId: session.id,
      name: file.name,
      size: file.size,
      type: file.type,
    });

    const saved = await saveMediaUpload(file, "chat-media");

    if (!saved.url.startsWith("http")) {
      console.error(LOG_PREFIX, "non_public_url", { url: saved.url });
      return NextResponse.json({ error: "invalid_url" }, { status: 500 });
    }

    console.info(LOG_PREFIX, "success", {
      userId: session.id,
      url: saved.url,
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
    const ms = Date.now() - started;
    const message = error instanceof Error ? error.message : String(error);

    console.error(LOG_PREFIX, "error", { message, ms, stack: error instanceof Error ? error.stack : undefined });

    if (message === "FILE_TOO_LARGE") {
      return NextResponse.json({ error: "too_large" }, { status: 413 });
    }
    if (message === "FILE_TYPE_BLOCKED") {
      return NextResponse.json({ error: "blocked" }, { status: 415 });
    }
    if (message === "STORAGE_UNAVAILABLE" || message.startsWith("SUPABASE_") || message.startsWith("BLOB_")) {
      return NextResponse.json({ error: "storage", message }, { status: 503 });
    }

    return NextResponse.json({ error: "server", message }, { status: 500 });
  }
}
