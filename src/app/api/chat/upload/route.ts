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
      console.error("[UPLOAD_ERROR] storage not configured", {
        hasAccessKey: Boolean(process.env.AWS_ACCESS_KEY_ID ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        hasSecret: Boolean(process.env.AWS_SECRET_ACCESS_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY),
        hasBucket: Boolean(process.env.AWS_S3_BUCKET),
        hasEndpoint: Boolean(process.env.AWS_S3_ENDPOINT),
      });
      return NextResponse.json(
        {
          error: "storage",
          message:
            "Set AWS_S3_ENDPOINT, AWS_S3_BUCKET, AWS_ACCESS_KEY_ID (anon), AWS_SECRET_ACCESS_KEY (service_role)",
        },
        { status: 503 }
      );
    }

    const file = formDataFile(await request.formData());
    if (!file) {
      return NextResponse.json({ error: "no_file" }, { status: 400 });
    }

    const saved = await saveMediaUpload(file, "chat-media");

    console.info("[media-upload] ok", {
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
