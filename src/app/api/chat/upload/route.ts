import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { saveMediaUpload } from "@/lib/media-upload";
import { isS3Configured } from "@/lib/s3-client";

export const maxDuration = 60;
export const runtime = "nodejs";

export async function POST(request: Request) {
  const started = Date.now();

  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    if (!isS3Configured()) {
      console.error("[UPLOAD_ERROR] S3 env missing on server", {
        hasKey: Boolean(process.env.AWS_ACCESS_KEY_ID),
        hasSecret: Boolean(process.env.AWS_SECRET_ACCESS_KEY),
        hasBucket: Boolean(process.env.AWS_S3_BUCKET),
        vercel: Boolean(process.env.VERCEL),
      });
      return NextResponse.json(
        {
          error: "storage",
          message: "Configure AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET",
        },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "no_file" }, { status: 400 });
    }

    console.info("[media-upload] start", {
      userId: session.id,
      name: file.name,
      size: file.size,
      type: file.type,
    });

    const saved = await saveMediaUpload(file, "chat-media");

    if (!saved.url.startsWith("http")) {
      console.error("[UPLOAD_ERROR] non-public url", { url: saved.url });
      return NextResponse.json({ error: "invalid_url" }, { status: 500 });
    }

    console.info("[media-upload] success", {
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
    const ms = Date.now() - started;

    console.error("[UPLOAD_ERROR] route failed", {
      message,
      ms,
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (message === "FILE_TOO_LARGE") {
      return NextResponse.json({ error: "too_large" }, { status: 413 });
    }
    if (message === "FILE_TYPE_BLOCKED") {
      return NextResponse.json({ error: "blocked" }, { status: 415 });
    }
    if (message === "STORAGE_UNAVAILABLE" || message.startsWith("S3_")) {
      return NextResponse.json({ error: "storage", message }, { status: 503 });
    }

    return NextResponse.json({ error: "server", message }, { status: 500 });
  }
}
