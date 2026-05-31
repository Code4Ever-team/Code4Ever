import type { ServerWebSocket } from "bun";
import type { IncomingMessage } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { verifySessionToken, readSessionCookie } from "../src/lib/session-verify";

export type CollabClient = {
  userId: string;
  username: string;
  color: string;
  repoId: string;
  filePath: string;
};

type RoomClient = CollabClient & { ws: WebSocket | ServerWebSocket<CollabClient> };

const rooms = new Map<string, Set<RoomClient>>();

function roomKey(repoId: string, filePath: string) {
  return `${repoId}::${filePath}`;
}

function parseQuery(url: string): URLSearchParams {
  try {
    return new URL(url, "http://local").searchParams;
  } catch {
    return new URLSearchParams();
  }
}

async function authFromCookie(cookieHeader: string | null): Promise<{
  id: string;
  username: string;
} | null> {
  const token = readSessionCookie(cookieHeader);
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session) return null;
  return { id: session.id, username: session.username };
}

function broadcast(room: Set<RoomClient>, data: unknown, except?: RoomClient) {
  const payload = JSON.stringify(data);
  for (const client of room) {
    if (client === except) continue;
    try {
      if ("send" in client.ws && typeof client.ws.send === "function") {
        client.ws.send(payload);
      }
    } catch {
      /* disconnected */
    }
  }
}

function handleMessage(client: RoomClient, raw: string | Buffer) {
  const room = rooms.get(roomKey(client.repoId, client.filePath));
  if (!room) return;

  let msg: Record<string, unknown>;
  try {
    msg = JSON.parse(String(raw)) as Record<string, unknown>;
  } catch {
    return;
  }

  switch (msg.t) {
    case "presence":
      broadcast(room, {
        t: "presence",
        userId: client.userId,
        username: client.username,
        color: client.color,
        line: msg.line,
        col: msg.col,
      }, client);
      break;
    case "yjs":
      broadcast(room, {
        t: "yjs",
        userId: client.userId,
        update: msg.update,
      }, client);
      break;
    case "awareness":
      broadcast(room, {
        t: "awareness",
        userId: client.userId,
        username: client.username,
        color: client.color,
        state: msg.state,
      }, client);
      break;
    default:
      break;
  }
}

function leaveClient(client: RoomClient) {
  const key = roomKey(client.repoId, client.filePath);
  const room = rooms.get(key);
  if (!room) return;
  room.delete(client);
  broadcast(room, { t: "leave", userId: client.userId });
  if (room.size === 0) rooms.delete(key);
}

export async function tryCollabUpgrade(
  req: Request,
  server: { upgrade: (req: Request, data?: CollabClient) => boolean }
): Promise<Response | undefined> {
  const url = new URL(req.url);
  if (url.pathname !== "/collab") return undefined;

  const session = await authFromCookie(req.headers.get("cookie"));
  if (!session) return new Response("unauthorized", { status: 401 });

  const repoId = url.searchParams.get("repoId") ?? "";
  const filePath = url.searchParams.get("path") ?? "";
  const color = url.searchParams.get("color") ?? "#007acc";
  if (!repoId || !filePath) return new Response("bad request", { status: 400 });

  const ok = server.upgrade(req, {
    data: {
      userId: session.id,
      username: session.username,
      color,
      repoId,
      filePath,
    },
  });
  if (!ok) return new Response("upgrade failed", { status: 500 });
  return undefined;
}

export const bunCollabHandlers = {
  open(ws: ServerWebSocket<CollabClient>) {
    const data = ws.data;
    if (!data?.repoId || !data?.filePath || !data?.userId) {
      ws.close();
      return;
    }
    const key = roomKey(data.repoId, data.filePath);
    let room = rooms.get(key);
    if (!room) {
      room = new Set();
      rooms.set(key, room);
    }
    const client: RoomClient = { ...data, ws };
    room.add(client);

    const peers = Array.from(room)
      .filter((c) => c.userId !== data.userId)
      .map((c) => ({
        userId: c.userId,
        username: c.username,
        color: c.color,
      }));

    ws.send(JSON.stringify({ t: "welcome", peers, you: data }));
  },
  message(ws: ServerWebSocket<CollabClient>, raw: string | Buffer) {
    if (!ws.data?.repoId) return;
    handleMessage({ ...ws.data, ws }, raw);
  },
  close(ws: ServerWebSocket<CollabClient>) {
    if (!ws.data?.repoId) return;
    leaveClient({ ...ws.data, ws });
  },
};

/** Node.js `ws` fallback (tsx dev:relay) */
export function attachNodeCollabWss(server: import("http").Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", async (req: IncomingMessage, socket, head) => {
    const url = req.url ?? "";
    if (!url.startsWith("/collab")) return;

    const session = await authFromCookie(req.headers.get("cookie") ?? null);
    if (!session) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    const q = parseQuery(url);
    const repoId = q.get("repoId") ?? "";
    const filePath = q.get("path") ?? "";
    const color = q.get("color") ?? "#007acc";
    if (!repoId || !filePath) {
      socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      const data: CollabClient = {
        userId: session.id,
        username: session.username,
        color,
        repoId,
        filePath,
      };
      const client: RoomClient = { ...data, ws };
      const key = roomKey(repoId, filePath);
      let room = rooms.get(key);
      if (!room) {
        room = new Set();
        rooms.set(key, room);
      }
      room.add(client);

      ws.send(
        JSON.stringify({
          t: "welcome",
          peers: Array.from(room)
            .filter((c) => c.userId !== session.id)
            .map((c) => ({ userId: c.userId, username: c.username, color: c.color })),
          you: data,
        })
      );

      ws.on("message", (raw) => handleMessage(client, raw as Buffer));
      ws.on("close", () => leaveClient(client));
    });
  });

  return wss;
}
