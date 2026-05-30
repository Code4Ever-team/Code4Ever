"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreateGroupDialogProps {
  locale: string;
  open: boolean;
  onClose: () => void;
}

export function CreateGroupDialog({ locale, open, onClose }: CreateGroupDialogProps) {
  const t = useTranslations("chat");
  const router = useRouter();
  const [name, setName] = useState("");
  const [members, setMembers] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleCreate() {
    const trimmed = name.trim();
    if (trimmed.length < 2 || pending) return;
    setPending(true);
    setError(null);
    try {
      const memberUsernames = members
        .split(/[,\s]+/)
        .map((s) => s.replace(/^@/, "").trim())
        .filter(Boolean);

      const res = await fetch("/api/chat/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: trimmed, memberUsernames }),
      });
      const data = (await res.json()) as { groupId?: string; error?: string };
      if (!res.ok || !data.groupId) throw new Error(data.error ?? "fail");

      onClose();
      setName("");
      setMembers("");
      router.push(`/${locale}/chat/groups/${data.groupId}`);
    } catch {
      setError(t("groupCreateFailed"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        aria-label={t("close")}
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("createGroup")}</h2>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="dlg-group-name">{t("groupName")}</Label>
            <Input
              id="dlg-group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("groupNamePlaceholder")}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="dlg-group-members">{t("groupMembers")}</Label>
            <Input
              id="dlg-group-members"
              value={members}
              onChange={(e) => setMembers(e.target.value)}
              placeholder={t("groupMembersPlaceholder")}
            />
          </div>
          <Button type="button" className="w-full" disabled={pending} onClick={() => void handleCreate()}>
            {pending ? t("groupCreating") : t("createGroup")}
          </Button>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      </div>
    </div>
  );
}
