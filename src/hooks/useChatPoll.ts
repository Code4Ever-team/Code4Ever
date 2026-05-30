"use client";

import { useCallback, useEffect, useRef } from "react";

const DEFAULT_MS = 5_000;

/**
 * Tek seferde bir poll; ardışık istek yağmurunu önler.
 */
export function useChatPoll(
  pollFn: () => Promise<void>,
  enabled: boolean,
  intervalMs = DEFAULT_MS
) {
  const inFlightRef = useRef(false);
  const pollRef = useRef(pollFn);
  pollRef.current = pollFn;

  const tick = useCallback(async () => {
    if (!enabled || document.visibilityState === "hidden") return;
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      await pollRef.current();
    } finally {
      inFlightRef.current = false;
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    void tick();
    const timer = window.setInterval(() => void tick(), intervalMs);
    const onVis = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [enabled, intervalMs, tick]);
}
