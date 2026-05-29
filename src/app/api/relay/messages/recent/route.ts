import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchIncomingSince } from "@/lib/chat-data";
import { drainInstantPushes } from "@/lib/relay-bus";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const sinceRaw = new URL(request.url).searchParams.get("since") ?? "";
    const since = sinceRaw ? new Date(sinceRaw) : new Date(0);
    if (Number.isNaN(since.getTime())) {
      return NextResponse.json({ error: "invalid_since" }, { status: 400 });
    }

    const [dbMessages, instant] = await Promise.all([
      fetchIncomingSince(session.id, since),
      Promise.resolve(drainInstantPushes(session.id)),
    ]);

    const byId = new Map<string, { id: string; senderUsername: string }>();
    for (const m of dbMessages) {
      byId.set(m.id, { id: m.id, senderUsername: m.senderUsername });
    }
    for (const m of instant) {
      byId.set(m.messageId, { id: m.messageId, senderUsername: m.senderUsername });
    }

    return NextResponse.json({ messages: Array.from(byId.values()) });
  } catch {
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
