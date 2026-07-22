"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowLeft, ImagePlus, Loader2, Paperclip, Send, X } from "lucide-react";
import {
  decryptBinaryWithPeer,
  decryptMessage,
  encryptBinaryWithPeer,
  encryptMessage,
  getOrCreateChatKeyPair,
  importPublicKeyJwk,
  parsePayload,
  serializePayload,
} from "@/lib/crypto/e2ee-chat";
import { EmojiPicker } from "@/components/chat/EmojiPicker";
import { MessageMedia } from "@/components/chat/MessageMedia";
import { PresenceBadge } from "@/components/chat/PresenceBadge";
import { useChatPoll } from "@/hooks/useChatPoll";
import { fetchDeduped } from "@/lib/fetch-dedupe";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { ChatMessageRow } from "@/lib/chat-data";

interface DecryptedMessage {
  id: string;
  senderId: string;
  plaintext: string;
  createdAt: Date;
  isMine: boolean;
  messageKind: string;
  mediaUrl: string | null;
  mediaObjectUrl: string | null;
  mediaMimeType: string | null;
  fileName: string | null;
}

interface PendingAttachment {
  file: File;
  previewUrl: string | null;
  kind: string;
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

function bufToB64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

function b64ToBuf(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
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

async function uploadEncryptedFile(file: File, peerPublicKey: string) {
  const pair = await getOrCreateChatKeyPair();
  const theirPublic = await importPublicKeyJwk(peerPublicKey);
  const data = await file.arrayBuffer();
  const payload = await encryptBinaryWithPeer(data, pair.privateKey, theirPublic);
  const encBlob = new Blob([b64ToBuf(payload.ciphertext)], { type: "application/octet-stream" });
  const fd = new FormData();
  fd.set("file", new File([encBlob], `${file.name}.enc`, { type: "application/octet-stream" }));
  const up = await fetch("/api/chat/upload", { method: "POST", credentials: "include", body: fd });
  if (!up.ok) throw new Error("upload_failed");
  const uploaded = (await up.json()) as {
    url: string;
    mimeType: string;
    kind: string;
    fileName: string;
  };
  return { uploaded, mediaIv: payload.iv };
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
  const [pending, setPending] = useState<PendingAttachment | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef(rows);
  const peerIdRef = useRef(peer.id);
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<HTMLInputElement>(null);

  rowsRef.current = rows;

  useEffect(() => {
    peerIdRef.current = peer.id;
    setRows(initialMessages.map((m) => normalizeRow(m)));
    setText("");
    setPending(null);
    setError(null);
  }, [peer.id, initialMessages]);

  const clearPending = useCallback(() => {
    setPending((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
  }, []);

  const syncConversation = useCallback(async () => {
    if (document.visibilityState === "hidden") return;
    const currentPeerId = peerIdRef.current;
    const list = rowsRef.current;
    const last = list[list.length - 1];
    const url = new URL("/api/chat/conversation", window.location.origin);
    url.searchParams.set("peerId", currentPeerId);
    if (last) url.searchParams.set("since", new Date(last.createdAt).toISOString());

    try {
      const res = await fetchDeduped(url.toString(), { credentials: "include", cache: "no-store" });
      if (!res.ok || peerIdRef.current !== currentPeerId) return;
      const data = (await res.json()) as { messages?: ChatMessageRow[] };
      if (data.messages?.length) {
        setRows((prev) => mergeRows(prev, data.messages!));
      }
    } catch {
    }
  }, []);

  useChatPoll(`dm:${peer.id}`, syncConversation, true, 10_000, true);

  useEffect(() => {
    let cancelled = false;
    const objectUrls: string[] = [];

    async function decodeAll() {
      const decoded: DecryptedMessage[] = [];

      for (const m of rows) {
        const isMedia = m.messageKind !== "text" && m.mediaUrl;
        let plaintext = "";
        let mediaObjectUrl: string | null = null;

        if (m.encryptedContent && peer.chatPublicKey && m.messageKind === "text") {
          try {
            const pair = await getOrCreateChatKeyPair();
            const theirPublic = await importPublicKeyJwk(peer.chatPublicKey);
            const payload = parsePayload(m.encryptedContent);
            plaintext = await decryptMessage(payload, pair.privateKey, theirPublic);
          } catch {
            plaintext = t("decryptFailed");
          }
        } else if (isMedia && m.mediaUrl && m.nonce && peer.chatPublicKey) {
          try {
            const pair = await getOrCreateChatKeyPair();
            const theirPublic = await importPublicKeyJwk(peer.chatPublicKey);
            const res = await fetch(m.mediaUrl, { credentials: "include" });
            const buf = await res.arrayBuffer();
            const plain = await decryptBinaryWithPeer(
              { ciphertext: bufToB64(buf), iv: m.nonce },
              pair.privateKey,
              theirPublic
            );
            const mime = m.mediaMimeType ?? "application/octet-stream";
            mediaObjectUrl = URL.createObjectURL(new Blob([plain], { type: mime }));
            objectUrls.push(mediaObjectUrl);
            if (m.encryptedContent) {
              const payload = parsePayload(m.encryptedContent);
              plaintext = await decryptMessage(payload, pair.privateKey, theirPublic);
            }
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
          mediaObjectUrl,
          mediaMimeType: m.mediaMimeType,
          fileName: m.fileName,
        });
      }

      if (!cancelled) setDecrypted(decoded);
    }

    void decodeAll();
    return () => {
      cancelled = true;
      for (const url of objectUrls) URL.revokeObjectURL(url);
    };
  }, [rows, peer.chatPublicKey, myUserId, t]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [decrypted]);

  const pushOptimistic = (row: ChatMessageRow) => {
    setRows((prev) => mergeRows(prev, [row]));
  };

  function pickFile(file: File, kind: string) {
    clearPending();
    const previewUrl =
      kind === "image" || file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
    setPending({ file, previewUrl, kind });
  }

  const handleSend = async () => {
    const trimmed = text.trim();
    const hasPending = Boolean(pending);
    if ((!trimmed && !hasPending) || sending) return;
    if (hasPending && !peer.chatPublicKey) {
      setError(t("keysError"));
      return;
    }

    const tempId = `pending-${Date.now()}`;
    const caption = trimmed;
    const attachment = pending;
    setText("");
    clearPending();
    setError(null);
    setSending(true);

    try {
      if (attachment && peer.chatPublicKey) {
        const { uploaded, mediaIv } = await uploadEncryptedFile(attachment.file, peer.chatPublicKey);

        let encryptedContent = "";
        let nonce = "";
        if (caption) {
          const pair = await getOrCreateChatKeyPair();
          const theirPublic = await importPublicKeyJwk(peer.chatPublicKey);
          const payload = await encryptMessage(caption, pair.privateKey, theirPublic);
          encryptedContent = serializePayload(payload);
          nonce = payload.iv;
        }

        pushOptimistic({
          id: tempId,
          senderId: myUserId,
          receiverId: peer.id,
          encryptedContent,
          nonce: mediaIv,
          messageKind: uploaded.kind,
          mediaUrl: uploaded.url,
          mediaMimeType: attachment.file.type || uploaded.mimeType,
          fileName: attachment.file.name,
          createdAt: new Date(),
          sender: { username: myUsername },
        });

        const data = await sendViaApi({
          receiverId: peer.id,
          encryptedContent,
          nonce: mediaIv,
          messageKind: uploaded.kind,
          mediaUrl: uploaded.url,
          mediaMimeType: attachment.file.type || uploaded.mimeType,
          fileName: attachment.file.name,
        });

        if (data.messageId) {
          setRows((prev) => prev.map((m) => (m.id === tempId ? { ...m, id: data.messageId! } : m)));
        }
      } else if (trimmed && peer.chatPublicKey) {
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
      }
    } catch {
      setRows((prev) => prev.filter((m) => m.id !== tempId));
      if (attachment) {
        const previewUrl =
          attachment.previewUrl ??
          (attachment.file.type.startsWith("image/") ? URL.createObjectURL(attachment.file) : null);
        setPending({ ...attachment, previewUrl });
      }
      setText(caption);
      setError(t("uploadFailed"));
    } finally {
      setSending(false);
    }
  };

  const canSend = Boolean(text.trim() || pending);

  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/${locale}/chat`} prefetch={false} aria-label={t("back")}>
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
                    mediaUrl={m.mediaObjectUrl ?? m.mediaUrl}
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
            if (f) pickFile(f, "file");
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
            if (f) pickFile(f, f.type.startsWith("video/") ? "video" : "image");
            e.target.value = "";
          }}
        />
        {pending && (
          <div className="flex w-full items-center gap-2 rounded-md border border-border bg-muted/20 p-2">
            {pending.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={pending.previewUrl} alt="" className="h-14 w-14 rounded object-cover" />
            ) : (
              <span className="truncate text-xs text-muted-foreground">{pending.file.name}</span>
            )}
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
              {pending.file.name}
            </span>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={clearPending}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        <div className="flex w-full gap-1">
          <EmojiPicker disabled={sending} onPick={(e) => setText((prev) => prev + e)} />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            disabled={sending}
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
            disabled={sending}
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
                void handleSend();
              }
            }}
          />
        </div>
        <Button
          type="button"
          onClick={() => void handleSend()}
          disabled={sending || !canSend}
          className="w-full sm:w-auto"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {sending ? t("sending") : t("send")}
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </CardFooter>
    </Card>
  );
}
