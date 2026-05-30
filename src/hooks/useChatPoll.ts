"use client";

import { useEffect, useRef } from "react";
import { subscribePoll } from "@/lib/poll-scheduler";

const DEFAULT_MS = 10_000;

export function useChatPoll(
  pollKey: string,
  pollFn: () => Promise<void>,
  enabled: boolean,
  intervalMs = DEFAULT_MS,
  skipInitial = false
) {
  const pollRef = useRef(pollFn);
  pollRef.current = pollFn;

  useEffect(() => {
    if (!enabled) return;

    const wrapped = () => pollRef.current();
    return subscribePoll(pollKey, wrapped, intervalMs, skipInitial);
  }, [pollKey, enabled, intervalMs, skipInitial]);
}
