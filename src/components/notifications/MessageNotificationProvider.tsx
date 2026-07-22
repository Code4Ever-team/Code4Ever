"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { fetchDeduped } from "@/lib/fetch-dedupe";
import { subscribePoll } from "@/lib/poll-scheduler";

const LAST_CHECK_KEY = "c4e_msg_last_check";
const NOTIFIED_IDS_KEY = "c4e_msg_notified_ids";
const NOTIFY_SOUND = "/voices/bildirim.mp3";
const POLL_MS = 30_000;
const MAX_NOTIFIED_CACHE = 200;

interface RelayMessage {
  id: string;
  senderUsername: string;
}

function loadNotifiedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(NOTIFIED_IDS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveNotifiedIds(ids: Set<string>) {
  const arr = Array.from(ids).slice(-MAX_NOTIFIED_CACHE);
  localStorage.setItem(NOTIFIED_IDS_KEY, JSON.stringify(arr));
}

function getLastCheck(): Date {
  const raw = localStorage.getItem(LAST_CHECK_KEY);
  if (!raw) return new Date(0);
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? new Date(0) : d;
}

function setLastCheck(date: Date) {
  localStorage.setItem(LAST_CHECK_KEY, date.toISOString());
}

interface MessageNotificationProviderProps {
  userId: string;
  locale: string;
}

export function MessageNotificationProvider({
  userId,
  locale,
}: MessageNotificationProviderProps) {
  const t = useTranslations("notifications");
  const pathname = usePathname();
  const onChatRoute = pathname?.includes("/chat") ?? false;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const notifiedRef = useRef<Set<string>>(new Set());
  const permissionRef = useRef<NotificationPermission>("default");

  const playSound = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(NOTIFY_SOUND);
        audioRef.current.volume = 0.85;
      }
      audioRef.current.currentTime = 0;
      void audioRef.current.play().catch(() => {
      });
    } catch {
    }
  }, []);

  const showDesktop = useCallback(
    (senderUsername: string) => {
      if (typeof window === "undefined" || !("Notification" in window)) return;
      if (permissionRef.current !== "granted") return;

      try {
        const n = new Notification(t("title"), {
          body: t("body", { user: senderUsername }),
          icon: "/favicon.ico",
          tag: `c4e-msg-${senderUsername}`,
          lang: locale,
        });
        n.onclick = () => {
          window.focus();
          window.location.href = `/${locale}/chat/${senderUsername}`;
          n.close();
        };
      } catch {
      }
    },
    [locale, t]
  );

  const handleIncoming = useCallback(
    (items: RelayMessage[]) => {
      if (items.length === 0) return;

      let newest = getLastCheck();
      let anyNew = false;

      for (const item of items) {
        if (notifiedRef.current.has(item.id)) continue;
        notifiedRef.current.add(item.id);
        anyNew = true;
        playSound();
        showDesktop(item.senderUsername);
      }

      if (anyNew) {
        saveNotifiedIds(notifiedRef.current);
        newest = new Date();
        setLastCheck(newest);
      }
    },
    [playSound, showDesktop]
  );

  const pollRecent = useCallback(async () => {
    if (onChatRoute || document.visibilityState === "hidden") return;
    const since = getLastCheck().toISOString();
    const url = new URL("/api/relay/messages/recent", window.location.origin);
    url.searchParams.set("since", since);

    try {
      const res = await fetchDeduped(url.toString(), {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { messages?: RelayMessage[] };
      if (data.messages?.length) {
        handleIncoming(data.messages);
      }
    } catch {
    }
  }, [handleIncoming, onChatRoute]);

  useEffect(() => {
    notifiedRef.current = loadNotifiedIds();

    if (typeof window !== "undefined" && "Notification" in window) {
      permissionRef.current = Notification.permission;
      if (Notification.permission === "default") {
        void Notification.requestPermission().then((p) => {
          permissionRef.current = p;
        });
      }
    }

    if (onChatRoute) return;

    return subscribePoll(`notify:${userId}`, pollRecent, POLL_MS, true);
  }, [userId, pollRecent, onChatRoute]);

  return null;
}
