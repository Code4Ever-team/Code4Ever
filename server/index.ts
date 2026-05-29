/**
 * İsteğe bağlı Elysia relay (Bun veya @elysiajs/node ile).
 * Bildirimler varsayılan olarak Next.js /api/relay üzerinden çalışır.
 */
import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { PrismaClient } from "@prisma/client";
import {
  readSessionCookie,
  verifySessionToken,
} from "../src/lib/session-verify";

const prisma = new PrismaClient();
const PORT = Number(process.env.WS_PORT ?? 3002);
const INTERNAL_SECRET = process.env.RELAY_INTERNAL_SECRET;

async function sessionFromRequest(request: Request) {
  const token = readSessionCookie(request.headers.get("cookie"));
  if (!token) return null;
  return verifySessionToken(token);
}

const app = new Elysia()
  .use(
    cors({
      origin: process.env.NEXT_PUBLIC_APP_URL ?? true,
      credentials: true,
    })
  )
  .get("/health", () => ({ ok: true, service: "c4e-relay" }))
  .get("/messages/recent", async ({ request, query, set }) => {
    const session = await sessionFromRequest(request);
    if (!session) {
      set.status = 401;
      return { error: "unauthorized" };
    }

    const sinceRaw = typeof query.since === "string" ? query.since : "";
    const since = sinceRaw ? new Date(sinceRaw) : new Date(0);
    if (Number.isNaN(since.getTime())) {
      set.status = 400;
      return { error: "invalid_since" };
    }

    const messages = await prisma.e2EEMessage.findMany({
      where: {
        receiverId: session.id,
        createdAt: { gt: since },
      },
      orderBy: { createdAt: "asc" },
      take: 50,
      select: {
        id: true,
        senderId: true,
        createdAt: true,
        sender: { select: { username: true } },
      },
    });

    return {
      messages: messages.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        senderUsername: m.sender.username,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  })
  .post("/internal/push", async ({ request, set }) => {
    if (!INTERNAL_SECRET) {
      set.status = 503;
      return { error: "misconfigured" };
    }

    if (request.headers.get("x-internal-secret") !== INTERNAL_SECRET) {
      set.status = 403;
      return { error: "forbidden" };
    }

    let body: { receiverId?: string; senderUsername?: string; messageId?: string };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      set.status = 400;
      return { error: "invalid_body" };
    }

    if (!body.receiverId || !body.senderUsername || !body.messageId) {
      set.status = 400;
      return { error: "invalid_body" };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000";
    await fetch(`${appUrl.replace(/\/$/, "")}/api/relay/internal/push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": INTERNAL_SECRET,
      },
      body: JSON.stringify(body),
    });

    return { ok: true };
  });

async function start() {
  if (process.versions.bun) {
    Bun.serve({
      port: PORT,
      hostname: process.env.WS_HOST ?? "127.0.0.1",
      fetch: app.fetch,
    });
    console.log(`[c4e-relay] Bun listening on http://127.0.0.1:${PORT}`);
    return;
  }

  const { node } = await import("@elysiajs/node");
  app.use(node()).listen({
    port: PORT,
    hostname: process.env.WS_HOST ?? "127.0.0.1",
  });
  console.log(`[c4e-relay] Node listening on http://127.0.0.1:${PORT}`);
}

start().catch((err) => {
  console.error("[c4e-relay] failed to start:", err);
  process.exit(1);
});

export type App = typeof app;
