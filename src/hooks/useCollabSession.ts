"use client";

import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { collabWsUrl } from "@/lib/collab/collab-colors";

export interface RemotePresence {
  userId: string;
  username: string;
  color: string;
  line?: number;
  col?: number;
}

interface UseCollabSessionOptions {
  repoId: string;
  filePath: string;
  userId: string;
  username: string;
  color: string;
  enabled: boolean;
  yDoc: Y.Doc | null;
  onRemotePresence?: (peers: Map<string, RemotePresence>) => void;
}

export function useCollabSession({
  repoId,
  filePath,
  userId,
  username,
  color,
  enabled,
  yDoc,
  onRemotePresence,
}: UseCollabSessionOptions) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const peersRef = useRef(new Map<string, RemotePresence>());
  const presenceTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled || !yDoc || !filePath) return;

    const params = new URLSearchParams({
      repoId,
      path: filePath,
      color,
    });
    const ws = new WebSocket(`${collabWsUrl()}?${params.toString()}`);
    wsRef.current = ws;

    const onYjsUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin === "remote" || ws.readyState !== WebSocket.OPEN) return;
      let binary = "";
      for (let i = 0; i < update.length; i += 1) binary += String.fromCharCode(update[i]!);
      ws.send(JSON.stringify({ t: "yjs", update: btoa(binary) }));
    };

    yDoc.on("update", onYjsUpdate);

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as Record<string, unknown>;
        if (msg.t === "yjs" && typeof msg.update === "string" && msg.userId !== userId) {
          const bin = Uint8Array.from(atob(msg.update), (c) => c.charCodeAt(0));
          Y.applyUpdate(yDoc, bin, "remote");
        }
        if (msg.t === "presence" && typeof msg.userId === "string") {
          peersRef.current.set(msg.userId, {
            userId: msg.userId,
            username: String(msg.username ?? ""),
            color: String(msg.color ?? "#007acc"),
            line: typeof msg.line === "number" ? msg.line : undefined,
            col: typeof msg.col === "number" ? msg.col : undefined,
          });
          onRemotePresence?.(new Map(peersRef.current));
        }
        if (msg.t === "leave" && typeof msg.userId === "string") {
          peersRef.current.delete(msg.userId);
          onRemotePresence?.(new Map(peersRef.current));
        }
        if (msg.t === "welcome" && Array.isArray(msg.peers)) {
          for (const p of msg.peers as RemotePresence[]) {
            peersRef.current.set(p.userId, p);
          }
          onRemotePresence?.(new Map(peersRef.current));
        }
      } catch {
      }
    };

    return () => {
      yDoc.off("update", onYjsUpdate);
      ws.close();
      wsRef.current = null;
      if (presenceTimer.current) clearInterval(presenceTimer.current);
    };
  }, [enabled, yDoc, repoId, filePath, color, userId, username, onRemotePresence]);

  function sendPresence(line: number, col: number) {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ t: "presence", line, col, username }));
  }

  return { connected, sendPresence };
}
