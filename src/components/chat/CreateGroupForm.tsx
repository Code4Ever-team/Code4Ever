"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreateGroupFormProps {
  locale: string;
}

export function CreateGroupForm({ locale }: CreateGroupFormProps) {
  const t = useTranslations("chat");
  const router = useRouter();
  const [name, setName] = useState("");
  const [members, setMembers] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      router.push(`/${locale}/chat/groups/${data.groupId}`);
      router.refresh();
    } catch {
      setError(t("groupCreateFailed"));
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="space-y-1">
          <Label htmlFor="group-name">{t("groupName")}</Label>
          <Input
            id="group-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("groupNamePlaceholder")}
            maxLength={80}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="group-members">{t("groupMembers")}</Label>
          <Input
            id="group-members"
            value={members}
            onChange={(e) => setMembers(e.target.value)}
            placeholder={t("groupMembersPlaceholder")}
          />
        </div>
        <Button type="button" onClick={() => void handleCreate()} disabled={pending}>
          {pending ? t("groupCreating") : t("createGroup")}
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
