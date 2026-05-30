"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { X, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface GroupMember {
  userId: string;
  username: string;
  avatarUrl: string | null;
  role: string;
}

interface GroupDetails {
  id: string;
  name: string;
  avatarUrl: string | null;
  creator: { id: string; username: string; avatarUrl: string | null };
  myRole: string;
  members: GroupMember[];
}

interface GroupManagePanelProps {
  locale: string;
  groupId: string;
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

export function GroupManagePanel({
  locale,
  groupId,
  open,
  onClose,
  onUpdated,
}: GroupManagePanelProps) {
  const t = useTranslations("chat");
  const router = useRouter();
  const [data, setData] = useState<GroupDetails | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = data?.myRole === "ADMIN";

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void fetch(`/api/chat/groups/${groupId}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: GroupDetails | null) => {
        if (!cancelled && json) {
          setData(json);
          setName(json.name);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, groupId]);

  async function handleSave() {
    if (!isAdmin || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/chat/groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error("fail");
      onUpdated?.();
      onClose();
      router.refresh();
    } catch {
      setError(t("groupSaveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatar(file: File) {
    if (!isAdmin) return;
    const fd = new FormData();
    fd.set("file", file);
    setSaving(true);
    try {
      const res = await fetch(`/api/chat/groups/${groupId}/avatar`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!res.ok) throw new Error("fail");
      const json = (await res.json()) as { avatarUrl?: string };
      if (json.avatarUrl) {
        setData((d) => (d ? { ...d, avatarUrl: json.avatarUrl! } : d));
      }
      onUpdated?.();
      router.refresh();
    } catch {
      setError(t("uploadFailed"));
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-black/70" aria-label={t("close")} onClick={onClose} />
      <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-lg font-semibold">{t("groupManageTitle")}</h2>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {!data ? (
            <p className="text-sm text-muted-foreground">{t("loading")}</p>
          ) : (
            <>
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  {data.avatarUrl ? (
                    <Image
                      src={data.avatarUrl}
                      alt=""
                      width={80}
                      height={80}
                      className="h-20 w-20 rounded-full object-cover ring-2 ring-border"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 ring-2 ring-border">
                      <Users className="h-8 w-8 text-primary" />
                    </div>
                  )}
                </div>
                {isAdmin && (
                  <label className="cursor-pointer text-xs text-primary hover:underline">
                    {t("changeGroupAvatar")}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void handleAvatar(f);
                      }}
                    />
                  </label>
                )}
              </div>

              <div className="space-y-2">
                <Label>{t("groupName")}</Label>
                {isAdmin ? (
                  <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
                ) : (
                  <p className="text-sm font-medium">{data.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>{t("groupAdmin")}</Label>
                <div className="flex items-center gap-2 rounded-md border border-border p-2">
                  <Avatar className="h-8 w-8">
                    {data.creator.avatarUrl ? (
                      <AvatarImage src={data.creator.avatarUrl} alt="" />
                    ) : null}
                    <AvatarFallback>
                      {data.creator.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">@{data.creator.username}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("groupMembers")}</Label>
                <ul className="space-y-2">
                  {data.members.map((m) => (
                    <li
                      key={m.userId}
                      className="flex items-center justify-between rounded-md border border-border px-2 py-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          {m.avatarUrl ? <AvatarImage src={m.avatarUrl} alt="" /> : null}
                          <AvatarFallback>{m.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">@{m.username}</span>
                      </div>
                      {m.role === "ADMIN" && (
                        <span className="text-[10px] font-medium text-primary">{t("adminBadge")}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              {isAdmin && (
                <Button type="button" disabled={saving} onClick={() => void handleSave()}>
                  {saving ? t("saving") : t("saveGroup")}
                </Button>
              )}
              {!isAdmin && (
                <p className="text-xs text-muted-foreground">{t("groupAdminOnlyHint")}</p>
              )}
            </>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      </aside>
    </div>
  );
}
