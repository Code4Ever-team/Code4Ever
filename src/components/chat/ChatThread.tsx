"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowLeft, ImagePlus, Loader2, Paperclip, Send } from "lucide-react";
import {
  decryptMessage,
  encryptMessage,
  getOrCreateChatKeyPair,
  importPublicKeyJwk,
  parsePayload,
  serializePayload,
} from "@/lib/crypto/e2ee-chat";
import { EmojiPicker } from "@/components/chat/EmojiPicker";
import { MessageMedia } from "@/components/chat/MessageMedia";
import { PresenceBadge } from "@/components/chat/PresenceBadge";
import { usePresenceHeartbeat } from "@/hooks/usePresenceHeartbeat";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { ChatMessageRow } from "@/lib/chat-data";

const POLL_MS = 2_000;

interface DecryptedMessage {
  id: string;
  senderId: string;
  plaintext: string;
  createdAt: Date;
  isMine: boolean;
  messageKind: string;
  mediaUrl: string | null;
  mediaMimeType: string | null;
  fileName: string | null;
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
    messageKind: m.messageKind ?? "text",
    mediaUrl: m.mediaUrl ?? null,
    mediaMimeType: m.mediaMimeType ?? null,
    fileName: m.fileName ?? null,
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

async function sendViaApi(body: Record<string, unknown>) {
  const res = await fetch("/api/chat/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { success?: boolean; messageId?: string; error?: string };
  if (!res.ok) throw new Error(data.error ?? "send_failed");
  return data;
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
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef(rows);
  const peerIdRef = useRef(peer.id);
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<HTMLInputElement>(null);

  usePresenceHeartbeat(true);
  rowsRef.current = rows;

  useEffect(() => {
    peerIdRef.current = peer.id;
    setRows(initialMessages.map((m) => normalizeRow(m)));
    setText("");
    setError(null);
  }, [peer.id, initialMessages]);

  const syncConversation = useCallback(async () => {
    if (document.visibilityState === "hidden") return;
    const currentPeerId = peerIdRef.current;
    const list = rowsRef.current;
    const last = list[list.length - 1];
    const url = new URL("/api/chat/conversation", window.location.origin);
    url.searchParams.set("peerId", currentPeerId);
    if (last) url.searchParams.set("since", new Date(last.createdAt).toISOString());

    try {
      const res = await fetch(url.toString(), { credentials: "include", cache: "no-store" });
      if (!res.ok || peerIdRef.current !== currentPeerId) return;
      const data = (await res.json()) as { messages?: ChatMessageRow[] };
      if (data.messages?.length) {
        setRows((prev) => mergeRows(prev, data.messages!));
      }
    } catch {
      /* retry later */
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
      const decoded: DecryptedMessage[] = [];

      for (const m of rows) {
        const isMedia = m.messageKind !== "text" && m.mediaUrl;
        let plaintext = "";

        if (m.encryptedContent && peer.chatPublicKey && m.messageKind === "text") {
          try {
            const pair = await getOrCreateChatKeyPair();
            const theirPublic = await importPublicKeyJwk(peer.chatPublicKey);
            const payload = parsePayload(m.encryptedContent);
            plaintext = await decryptMessage(payload, pair.privateKey, theirPublic);
          } catch {
            plaintext = t("decryptFailed");
          }
        } else if (m.encryptedContent && peer.chatPublicKey && isMedia) {
          try {
            const pair = await getOrCreateChatKeyPair();
            const theirPublic = await importPublicKeyJwk(peer.chatPublicKey);
            const payload = parsePayload(m.encryptedContent);
            plaintext = await decryptMessage(payload, pair.privateKey, theirPublic);
          } catch {
            plaintext = "";
          }
        } else if (!isMedia && !m.encryptedContent) {
          plaintext = "";
        } else if (!isMedia) {
          plaintext = t("decryptFailed");
        }

        decoded.push({
          id: m.id,
          senderId: m.senderId,
          plaintext,
          createdAt: new Date(m.createdAt),
          isMine: m.senderId === myUserId,
          messageKind: m.messageKind,
          mediaUrl: m.mediaUrl,
          mediaMimeType: m.mediaMimeType,
          fileName: m.fileName,
        });
      }

      if (!cancelled) setDecrypted(decoded);
    }

    void decodeAll();
    return () => {
      cancelled = true;
    };
  }, [rows, peer.chatPublicKey, myUserId, t]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [decrypted]);

  const pushOptimistic = (row: ChatMessageRow) => {
    setRows((prev) => mergeRows(prev, [row]));
  };

  const handleSendText = async () => {
    const trimmed = text.trim();
    if (!trimmed || !peer.chatPublicKey || sending) return;

    const tempId = `pending-${Date.now()}`;
    setText("");
    setError(null);
    setSending(true);

    try {
      const pair = await getOrCreateChatKeyPair();
      const theirPublic = await importPublicKeyJwk(peer.chatPublicKey);
      const payload = await encryptMessage(trimmed, pair.privateKey, theirPublic);
      const serialized = serializePayload(payload);

      pushOptimistic({
        id: tempId,
        senderId: myUserId,
        receiverId: peer.id,
        encryptedContent: serialized,
        nonce: payload.iv,
        messageKind: "text",
        mediaUrl: null,
        mediaMimeType: null,
        fileName: null,
        createdAt: new Date(),
        sender: { username: myUsername },
      });

      const data = await sendViaApi({
        receiverId: peer.id,
        encryptedContent: serialized,
        nonce: payload.iv,
        messageKind: "text",
      });

      if (data.messageId) {
        setRows((prev) => prev.map((m) => (m.id === tempId ? { ...m, id: data.messageId! } : m)));
      }
      void syncConversation();
    } catch {
      setRows((prev) => prev.filter((m) => m.id !== tempId));
      setText(trimmed);
      setError(t("keysError"));
    } finally {
      setSending(false);
    }
  };

  const handleUploadAndSend = async (file: File) => {
    if (uploading || sending) return;
    setUploading(true);
    setError(null);
    const tempId = `pending-media-${Date.now()}`;

    try {
      const fd = new FormData();
      fd.set("file", file);
      const up = await fetch("/api/chat/upload", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!up.ok) throw new Error("upload_failed");
      const uploaded = (await up.json()) as {
        url: string;
        mimeType: string;
        kind: string;
        fileName: string;
      };

      let encryptedContent = "";
      let nonce = "";
      const caption = text.trim();
      if (caption && peer.chatPublicKey) {
        const pair = await getOrCreateChatKeyPair();
        const theirPublic = await importPublicKeyJwk(peer.chatPublicKey);
        const payload = await encryptMessage(caption, pair.privateKey, theirPublic);
        encryptedContent = serializePayload(payload);
        nonce = payload.iv;
        setText("");
      }

      pushOptimistic({
        id: tempId,
        senderId: myUserId,
        receiverId: peer.id,
        encryptedContent,
        nonce,
        messageKind: uploaded.kind,
        mediaUrl: uploaded.url,
        mediaMimeType: uploaded.mimeType,
        fileName: uploaded.fileName,
        createdAt: new Date(),
        sender: { username: myUsername },
      });

      const data = await sendViaApi({
        receiverId: peer.id,
        encryptedContent,
        nonce,
        messageKind: uploaded.kind,
        mediaUrl: uploaded.url,
        mediaMimeType: uploaded.mimeType,
        fileName: uploaded.fileName,
      });

      if (data.messageId) {
        setRows((prev) => prev.map((m) => (m.id === tempId ? { ...m, id: data.messageId! } : m)));
      }
      void syncConversation();
    } catch {
      setRows((prev) => prev.filter((m) => m.id !== tempId));
      setError(t("uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/${locale}/chat`} prefetch aria-label={t("back")}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base">@{peer.username}</CardTitle>
          <PresenceBadge userId={peer.id} />
        </div>
        <span className="text-[10px] text-muted-foreground">{t("live")}</span>
      </CardHeader>
      <Separator />
      <CardContent className="p-0">
        <ScrollArea className="h-[min(28rem,55vh)] px-4 py-4">
          {decrypted.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">{t("emptyThread")}</p>
          )}
          <div className="flex flex-col gap-2">
            {decrypted.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "max-w-[90%] rounded-lg px-3 py-2 text-sm",
                  m.isMine
                    ? "ml-auto bg-primary/15 text-foreground"
                    : "mr-auto border border-border bg-muted/30 text-foreground"
                )}
              >
                {m.mediaUrl ? (
                  <MessageMedia
                    kind={m.messageKind}
                    mediaUrl={m.mediaUrl}
                    mediaMimeType={m.mediaMimeType}
                    fileName={m.fileName}
                    caption={m.plaintext || undefined}
                    locale={locale}
                  />
                ) : (
                  <p className="whitespace-pre-wrap break-words">{m.plaintext}</p>
                )}
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
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleUploadAndSend(f);
            e.target.value = "";
          }}
        />
        <input
          ref={mediaRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleUploadAndSend(f);
            e.target.value = "";
          }}
        />
        <div className="flex w-full gap-1">
          <EmojiPicker
            disabled={sending || uploading}
            onPick={(e) => setText((prev) => prev + e)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            disabled={uploading}
            onClick={() => mediaRef.current?.click()}
            aria-label={t("attachMedia")}
          >
            <ImagePlus className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            aria-label={t("attachFile")}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("messagePlaceholder")}
            rows={2}
            className="min-h-0 flex-1"
            maxLength={4000}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSendText();
              }
            }}
          />
        </div>
        <Button
          type="button"
          onClick={() => void handleSendText()}
          disabled={sending || uploading || !text.trim()}
          className="w-full sm:w-auto"
        >
          {sending || uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {uploading ? t("uploading") : sending ? t("sending") : t("send")}
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </CardFooter>
    </Card>
  );
}
