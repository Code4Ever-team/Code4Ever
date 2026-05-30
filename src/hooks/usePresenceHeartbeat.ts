"use client";

import { useEffect } from "react";

const INTERVAL_MS = 45_000;

export function usePresenceHeartbeat(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const ping = () => {
      void fetch("/api/presence", { method: "POST", credentials: "include" }).catch(() => {
        /* ignore */
      });
    };

    ping();
    const timer = window.setInterval(ping, INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [enabled]);
}
