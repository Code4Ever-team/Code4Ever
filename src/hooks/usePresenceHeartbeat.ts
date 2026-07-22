"use client";

import { useEffect, useRef } from "react";

const INTERVAL_MS = 60_000;
const LEADER_KEY = "c4e_presence_leader";
const LEADER_STALE_MS = 55_000;

function tabId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = sessionStorage.getItem("c4e_tab_id");
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem("c4e_tab_id", id);
    }
    return id;
  } catch {
    return "tab";
  }
}

function shouldSendHeartbeat(id: string): boolean {
  try {
    const now = Date.now();
    const raw = localStorage.getItem(LEADER_KEY);
    if (!raw) {
      localStorage.setItem(LEADER_KEY, JSON.stringify({ id, at: now }));
      return true;
    }
    const parsed = JSON.parse(raw) as { id?: string; at?: number };
    if (parsed.id === id) {
      localStorage.setItem(LEADER_KEY, JSON.stringify({ id, at: now }));
      return true;
    }
    if (!parsed.at || now - parsed.at > LEADER_STALE_MS) {
      localStorage.setItem(LEADER_KEY, JSON.stringify({ id, at: now }));
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

export function usePresenceHeartbeat(enabled: boolean) {
  const idRef = useRef(tabId());

  useEffect(() => {
    if (!enabled) return;

    const ping = () => {
      if (document.visibilityState === "hidden") return;
      if (!shouldSendHeartbeat(idRef.current)) return;
      void fetch("/api/presence", { method: "POST", credentials: "include" }).catch(() => {
      });
    };

    ping();
    const timer = window.setInterval(ping, INTERVAL_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") ping();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [enabled]);
}
