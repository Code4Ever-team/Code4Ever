"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowLeft, ImagePlus, Loader2, Paperclip, Send, X } from "lucide-react";
import { encryptFileForUpload } from "@/lib/crypto/e2ee-blob";
import { EmojiPicker } from "@/components/chat/EmojiPicker";
import { EncryptedMedia } from "@/components/media/EncryptedMedia";
import { MessageMedia } from "@/components/chat/MessageMedia";
import { useChatPoll } from "@/hooks/useChatPoll";
import { fetchDeduped } from "@/lib/fetch-dedupe";
import { GroupManagePanel } from "@/components/chat/GroupManagePanel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface GroupMessage {
  id: string;
  senderId: string;
  encryptedContent: string;
  nonce: string;
  messageKind: string;
  mediaUrl: string | null;
  mediaMimeType: string | null;
  fileName: string | null;
  createdAt: string;
  sender: { username: string };
}

interface PendingAttachment {
  file: File;
  previewUrl: string | null;
  kind: string;
}

interface GroupChatThreadProps {
  locale: string;
  myUserId: string;
  groupId: string;
  groupName: string;
  initialMessages: GroupMessage[];
}

function parseMediaMeta(raw: string): { caption: string; mediaKey?: string } {
  if (!raw.startsWith("{")) return { caption: raw };
  try {
    const parsed = JSON.parse(raw) as { caption?: string; mediaKey?: string };
    return { caption: parsed.caption ?? "", mediaKey: parsed.mediaKey };
  } catch {
    return { caption: raw };
  }
}

export function GroupChatThread({
  locale,
  myUserId,
  groupId,
  groupName,
  initialMessages,
}: GroupChatThreadProps) {
  const t = useTranslations("chat");
  const [messages, setMessages] = useState<GroupMessage[]>(initialMessages);
  const [text, setText] = useState("");
  const [pending, setPending] = useState<PendingAttachment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<HTMLInputElement>(null);

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const sync = useCallback(async () => {
    const list = messagesRef.current;
    const last = list[list.length - 1];
    const url = new URL(`/api/chat/groups/${groupId}/messages`, window.location.origin);
    if (last) url.searchParams.set("since", last.createdAt);
    try {
      const res = await fetchDeduped(url.toString(), { credentials: "include", cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { messages?: GroupMessage[] };
      if (data.messages?.length) {
        setMessages((prev) => {
          const map = new Map(prev.map((m) => [m.id, m]));
          for (const m of data.messages!) map.set(m.id, m);
          return Array.from(map.values()).sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        });
      }
    } catch {
      /* ignore */
    }
  }, [groupId]);

  useChatPoll(`group:${groupId}`, sync, true, 10_000, true);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function clearPending() {
    setPending((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
  }

  function pickFile(file: File, kind: string) {
    clearPending();
    const previewUrl =
      kind === "image" || file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
    setPending({ file, previewUrl, kind });
  }

  async function sendPayload(body: Record<string, unknown>) {
    const res = await fetch(`/api/chat/groups/${groupId}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("send_failed");
    return res.json();
  }

  async function handleSend() {
    const trimmed = text.trim();
    const attachment = pending;
    if ((!trimmed && !attachment) || busy) return;

    setBusy(true);
    setError(null);
    const tempId = `p-${Date.now()}`;
    const caption = trimmed;
    setText("");
    clearPending();

    try {
      if (attachment) {
        const enc = await encryptFileForUpload(attachment.file);
        const fd = new FormData();
        fd.set("file", new File([enc.blob], "media.enc", { type: "application/octet-stream" }));
        const up = await fetch("/api/chat/upload", { method: "POST", credentials: "include", body: fd });
        if (!up.ok) throw new Error("up");
        const uploaded = (await up.json()) as {
          url: string;
          mimeType: string;
          kind: string;
          fileName: string;
        };

        const encryptedContent = JSON.stringify({ caption, mediaKey: enc.keyB64 });

        setMessages((prev) => [
          ...prev,
          {
            id: tempId,
            senderId: myUserId,
            encryptedContent,
            nonce: enc.nonce,
            messageKind: uploaded.kind,
            mediaUrl: uploaded.url,
            mediaMimeType: enc.mimeType,
            fileName: enc.fileName,
            createdAt: new Date().toISOString(),
            sender: { username: "…" },
          },
        ]);

        const data = (await sendPayload({
          text: encryptedContent,
          nonce: enc.nonce,
          messageKind: uploaded.kind,
          mediaUrl: uploaded.url,
          mediaMimeType: enc.mimeType,
          fileName: enc.fileName,
        })) as { messageId?: string };

        if (data.messageId) {
          setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, id: data.messageId! } : m)));
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: tempId,
            senderId: myUserId,
            encryptedContent: caption,
            nonce: "",
            messageKind: "text",
            mediaUrl: null,
            mediaMimeType: null,
            fileName: null,
            createdAt: new Date().toISOString(),
            sender: { username: "…" },
          },
        ]);

        const data = (await sendPayload({ text: caption, messageKind: "text" })) as {
          messageId?: string;
        };
        if (data.messageId) {
          setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, id: data.messageId! } : m)));
        }
      }
    } catch {
      if (attachment) {
        const previewUrl =
          attachment.previewUrl ??
          (attachment.file.type.startsWith("image/") ? URL.createObjectURL(attachment.file) : null);
        setPending({ ...attachment, previewUrl });
      }
      setText(caption);
      setError(t("uploadFailed"));
    } finally {
      setBusy(false);
    }
  }

  const canSend = Boolean(text.trim() || pending);

  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader className="flex flex-row items-center gap-3 pb-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/${locale}/chat`} prefetch={false}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <button
          type="button"
          className="text-left text-base font-semibold hover:text-primary"
          onClick={() => setManageOpen(true)}
        >
          {groupName}
        </button>
        <span className="ml-auto text-[10px] text-muted-foreground">{t("live")}</span>
      </CardHeader>
      <GroupManagePanel
        locale={locale}
        groupId={groupId}
        open={manageOpen}
        onClose={() => setManageOpen(false)}
      />
      <Separator />
      <CardContent className="p-0">
        <ScrollArea className="h-[min(28rem,55vh)] px-4 py-4">
          <div className="flex flex-col gap-2">
            {messages.map((m) => {
              const mine = m.senderId === myUserId;
              const meta = parseMediaMeta(m.encryptedContent);
              return (
                <div
                  key={m.id}
                  className={cn(
                    "max-w-[90%] rounded-lg px-3 py-2 text-sm",
                    mine ? "ml-auto bg-primary/15" : "mr-auto border border-border bg-muted/30"
                  )}
                >
                  {!mine && (
                    <p className="mb-1 text-[10px] font-medium text-primary">@{m.sender.username}</p>
                  )}
                  {m.mediaUrl && m.nonce && meta.mediaKey ? (
                    <EncryptedMedia
                      kind={m.messageKind}
                      mediaUrl={m.mediaUrl}
                      mediaNonce={m.nonce}
                      mediaKey={meta.mediaKey}
                      mediaMimeType={m.mediaMimeType}
                      fileName={m.fileName}
                      caption={meta.caption || undefined}
                      locale={locale}
                    />
                  ) : m.mediaUrl ? (
                    <MessageMedia
                      kind={m.messageKind}
                      mediaUrl={m.mediaUrl}
                      mediaMimeType={m.mediaMimeType}
                      fileName={m.fileName}
                      caption={meta.caption || undefined}
                      locale={locale}
                    />
                  ) : (
                    <p className="whitespace-pre-wrap break-words">{m.encryptedContent}</p>
                  )}
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>
      </CardContent>
      <Separator />
      <CardFooter className="flex flex-col gap-2 p-4">
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
        {pending && (
          <div className="flex w-full items-center gap-2 rounded-md border border-border bg-muted/20 p-2">
            {pending.previewUrl ? (
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
          <EmojiPicker disabled={busy} onPick={(e) => setText((p) => p + e)} />
          <Button type="button" variant="ghost" size="icon" onClick={() => mediaRef.current?.click()}>
            <ImagePlus className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={() => fileRef.current?.click()}>
            <Paperclip className="h-4 w-4" />
          </Button>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
          />
        </div>
        <Button type="button" disabled={busy || !canSend} onClick={() => void handleSend()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {t("send")}
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </CardFooter>
    </Card>
  );
}
