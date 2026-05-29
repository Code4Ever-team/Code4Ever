import { NextResponse } from "next/server";
import { enqueueInstantPush } from "@/lib/relay-bus";

export async function POST(request: Request) {
  const secret = process.env.RELAY_INTERNAL_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "misconfigured" }, { status: 503 });
  }

  if (request.headers.get("x-internal-secret") !== secret) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: { receiverId?: string; senderUsername?: string; messageId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (!body.receiverId || !body.senderUsername || !body.messageId) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  enqueueInstantPush(body.receiverId, {
    messageId: body.messageId,
    senderUsername: body.senderUsername,
  });

  return NextResponse.json({ ok: true });
}
