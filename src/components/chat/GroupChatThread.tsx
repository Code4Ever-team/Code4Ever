"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowLeft, ImagePlus, Loader2, Paperclip, Send } from "lucide-react";
import { EmojiPicker } from "@/components/chat/EmojiPicker";
import { MessageMedia } from "@/components/chat/MessageMedia";
import { useChatPoll } from "@/hooks/useChatPoll";
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
  messageKind: string;
  mediaUrl: string | null;
  mediaMimeType: string | null;
  fileName: string | null;
  createdAt: string;
  sender: { username: string };
}

interface GroupChatThreadProps {
  locale: string;
  myUserId: string;
  groupId: string;
  groupName: string;
  initialMessages: GroupMessage[];
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
      const res = await fetch(url.toString(), { credentials: "include", cache: "no-store" });
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

  useChatPoll(sync, true, 5_000);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  async function handleSendText() {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setText("");
    setError(null);
    const tempId = `p-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        senderId: myUserId,
        encryptedContent: trimmed,
        messageKind: "text",
        mediaUrl: null,
        mediaMimeType: null,
        fileName: null,
        createdAt: new Date().toISOString(),
        sender: { username: "…" },
      },
    ]);
    try {
      const data = (await sendPayload({ text: trimmed, messageKind: "text" })) as {
        messageId?: string;
      };
      if (data.messageId) {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, id: data.messageId! } : m)));
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setText(trimmed);
      setError(t("keysError"));
    } finally {
      setBusy(false);
    }
  }

  async function handleFile(file: File) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const up = await fetch("/api/chat/upload", { method: "POST", credentials: "include", body: fd });
      if (!up.ok) throw new Error("up");
      const uploaded = (await up.json()) as {
        url: string;
        mimeType: string;
        kind: string;
        fileName: string;
      };
      const caption = text.trim();
      setText("");
      await sendPayload({
        text: caption,
        messageKind: uploaded.kind,
        mediaUrl: uploaded.url,
        mediaMimeType: uploaded.mimeType,
        fileName: uploaded.fileName,
      });
    } catch {
      setError(t("uploadFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader className="flex flex-row items-center gap-3 pb-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/${locale}/chat`} prefetch>
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
              return (
                <div
                  key={m.id}
                  className={cn(
                    "max-w-[90%] rounded-lg px-3 py-2 text-sm",
                    mine
                      ? "ml-auto bg-primary/15"
                      : "mr-auto border border-border bg-muted/30"
                  )}
                >
                  {!mine && (
                    <p className="mb-1 text-[10px] font-medium text-primary">@{m.sender.username}</p>
                  )}
                  {m.mediaUrl ? (
                    <MessageMedia
                      kind={m.messageKind}
                      mediaUrl={m.mediaUrl}
                      mediaMimeType={m.mediaMimeType}
                      fileName={m.fileName}
                      caption={m.encryptedContent || undefined}
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
            if (f) void handleFile(f);
            e.target.value = "";
          }}
        />
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = "";
          }}
        />
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
                void handleSendText();
              }
            }}
          />
        </div>
        <Button type="button" disabled={busy || !text.trim()} onClick={() => void handleSendText()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {t("send")}
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </CardFooter>
    </Card>
  );
}
