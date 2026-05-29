"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { sendChatMessageAction } from "@/lib/actions/chat.actions";
import {
  decryptMessage,
  encryptMessage,
  getOrCreateChatKeyPair,
  importPublicKeyJwk,
  parsePayload,
  serializePayload,
} from "@/lib/crypto/e2ee-chat";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { ChatMessageRow } from "@/lib/chat-data";

const POLL_MS = 2_500;

interface DecryptedMessage {
  id: string;
  senderId: string;
  plaintext: string;
  createdAt: Date;
  isMine: boolean;
}

interface ChatThreadProps {
  locale: string;
  myUserId: string;
  myUsername: string;
  peer: {
    id: string;
    username: string;
    chatPublicKey: string | null;
  };
  messages: ChatMessageRow[];
}

function normalizeRow(m: ChatMessageRow & { createdAt?: Date | string }): ChatMessageRow {
  return {
    ...m,
    createdAt:
      typeof m.createdAt === "string" ? new Date(m.createdAt) : (m.createdAt as Date),
  };
}

function mergeRows(prev: ChatMessageRow[], incoming: ChatMessageRow[]): ChatMessageRow[] {
  const map = new Map(prev.map((m) => [m.id, normalizeRow(m)]));
  for (const m of incoming) {
    map.set(m.id, normalizeRow(m));
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export function ChatThread({
  locale,
  myUserId,
  myUsername,
  peer,
  messages: initialMessages,
}: ChatThreadProps) {
  const t = useTranslations("chat");
  const [rows, setRows] = useState<ChatMessageRow[]>(() =>
    initialMessages.map((m) => normalizeRow(m))
  );
  const [decrypted, setDecrypted] = useState<DecryptedMessage[]>([]);
  const [decryptError, setDecryptError] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef(rows);
  const peerIdRef = useRef(peer.id);

  rowsRef.current = rows;

  useEffect(() => {
    peerIdRef.current = peer.id;
    setRows(initialMessages.map((m) => normalizeRow(m)));
    setFeedback(null);
    setText("");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- yalnızca sohbet değişince sıfırla
  }, [peer.id]);

  const syncConversation = useCallback(async () => {
    if (document.visibilityState === "hidden") return;

    const currentPeerId = peerIdRef.current;
    const list = rowsRef.current;
    const last = list[list.length - 1];
    const url = new URL("/api/chat/conversation", window.location.origin);
    url.searchParams.set("peerId", currentPeerId);
    if (last) {
      url.searchParams.set("since", new Date(last.createdAt).toISOString());
    }

    try {
      const res = await fetch(url.toString(), { credentials: "include", cache: "no-store" });
      if (!res.ok || peerIdRef.current !== currentPeerId) return;

      const data = (await res.json()) as {
        messages?: (ChatMessageRow & { createdAt: string })[];
      };
      if (!data.messages?.length || peerIdRef.current !== currentPeerId) return;

      setRows((prev) => mergeRows(prev, data.messages as ChatMessageRow[]));
    } catch {
      /* ağ hatası — sonraki poll dener */
    }
  }, []);

  useEffect(() => {
    void syncConversation();
    const timer = window.setInterval(() => void syncConversation(), POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") void syncConversation();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [peer.id, syncConversation]);

  useEffect(() => {
    let cancelled = false;

    async function decodeAll() {
      if (!peer.chatPublicKey) {
        setDecryptError(true);
        return;
      }
      try {
        const pair = await getOrCreateChatKeyPair();
        const theirPublic = await importPublicKeyJwk(peer.chatPublicKey);
        const decoded: DecryptedMessage[] = [];

        for (const m of rows) {
          try {
            const payload = parsePayload(m.encryptedContent);
            const plaintext = await decryptMessage(payload, pair.privateKey, theirPublic);
            decoded.push({
              id: m.id,
              senderId: m.senderId,
              plaintext,
              createdAt: new Date(m.createdAt),
              isMine: m.senderId === myUserId,
            });
          } catch {
            decoded.push({
              id: m.id,
              senderId: m.senderId,
              plaintext: t("decryptFailed"),
              createdAt: new Date(m.createdAt),
              isMine: m.senderId === myUserId,
            });
          }
        }
        if (!cancelled) {
          setDecrypted(decoded);
          setDecryptError(decoded.length === 0 && rows.length > 0);
        }
      } catch {
        if (!cancelled) setDecryptError(true);
      }
    }

    void decodeAll();
    return () => {
      cancelled = true;
    };
  }, [rows, peer.chatPublicKey, myUserId, t]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [decrypted]);

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || !peer.chatPublicKey) return;

    setFeedback(null);
    const tempId = `pending-${Date.now()}`;

    startTransition(async () => {
      try {
        const pair = await getOrCreateChatKeyPair();
        const theirPublic = await importPublicKeyJwk(peer.chatPublicKey!);
        const payload = await encryptMessage(trimmed, pair.privateKey, theirPublic);
        const serialized = serializePayload(payload);

        const optimistic: ChatMessageRow = {
          id: tempId,
          senderId: myUserId,
          receiverId: peer.id,
          encryptedContent: serialized,
          nonce: payload.iv,
          createdAt: new Date(),
          sender: { username: myUsername },
        };
        setRows((prev) => [...prev, optimistic]);
        setText("");

        const fd = new FormData();
        fd.set("locale", locale);
        fd.set("receiverId", peer.id);
        fd.set("encryptedContent", serialized);
        fd.set("nonce", payload.iv);

        const res = await sendChatMessageAction({ success: false, message: "" }, fd);
        if (res.success && res.messageId) {
          setRows((prev) =>
            prev.map((m) => (m.id === tempId ? { ...m, id: res.messageId! } : m))
          );
          setFeedback(null);
          void syncConversation();
        } else {
          setRows((prev) => prev.filter((m) => m.id !== tempId));
          setText(trimmed);
          setFeedback({ ok: false, text: res.message });
        }
      } catch {
        setRows((prev) => prev.filter((m) => m.id.startsWith("pending-")));
        setText(trimmed);
        setFeedback({ ok: false, text: t("keysError") });
      }
    });
  }

  if (!peer.chatPublicKey) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {t("peerNoKeys")}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/${locale}/chat`} prefetch aria-label={t("back")}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <CardTitle className="text-base">@{peer.username}</CardTitle>
        <span className="ml-auto text-[10px] text-muted-foreground">{t("live")}</span>
      </CardHeader>
      <Separator />
      <CardContent className="p-0">
        <ScrollArea className="h-[min(28rem,55vh)] px-4 py-4">
          {decryptError && decrypted.length === 0 && rows.length === 0 && (
            <p className="text-sm text-destructive">{t("keysError")}</p>
          )}
          {decrypted.length === 0 && !decryptError && (
            <p className="text-center text-sm text-muted-foreground">{t("emptyThread")}</p>
          )}
          <div className="flex flex-col gap-2">
            {decrypted.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                  m.isMine
                    ? "ml-auto bg-primary/15 text-foreground"
                    : "mr-auto border border-border bg-muted/30 text-foreground"
                )}
              >
                <p className="whitespace-pre-wrap break-words">{m.plaintext}</p>
                <time className="mt-1 block text-[10px] text-muted-foreground">
                  {new Date(m.createdAt).toLocaleString(locale === "tr" ? "tr-TR" : "en-US")}
                </time>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>
      </CardContent>
      <Separator />
      <CardFooter className="flex flex-col gap-2 p-4">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("messagePlaceholder")}
          rows={2}
          maxLength={2000}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button
          type="button"
          onClick={handleSend}
          disabled={pending || !text.trim()}
          className="w-full sm:w-auto"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {pending ? t("sending") : t("send")}
        </Button>
        {feedback && (
          <p className={cn("text-xs", feedback.ok ? "text-primary" : "text-destructive")}>
            {feedback.text}
          </p>
        )}
      </CardFooter>
    </Card>
  );
}
