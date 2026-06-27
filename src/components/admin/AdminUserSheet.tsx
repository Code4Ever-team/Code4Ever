"use client";

import Image from "next/image";
import { useCallback, useEffect, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import {
  fetchAdminUserDetail,
  adminUpdateUserAction,
  adminSuspendUserAction,
  adminDeleteUserAction,
  adminGrantBadgeAction,
  adminRevokeBadgeAction,
  type AdminResult,
  type AdminUserDetail,
} from "@/lib/actions/admin.actions";
import type { Badge } from "@prisma/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge as UiBadge } from "@/components/ui/badge";
import { UserBadgeChip } from "@/components/badges/UserBadgeChip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

const initial: AdminResult = { success: false, message: "" };

function SaveBtn() {
  const { pending } = useFormStatus();
  const t = useTranslations("admin");
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? t("saving") : t("saveChanges")}
    </Button>
  );
}

function resultMessage(t: ReturnType<typeof useTranslations<"admin">>, key: string): string {
  const map: Record<string, string> = {
    updated: t("msgUpdated"),
    username_short: t("msgUsernameShort"),
    username_taken: t("msgUsernameTaken"),
    avatar_failed: t("msgAvatarFailed"),
    no_changes: t("msgNoChanges"),
    forbidden: t("forbidden"),
    failed: t("msgFailed"),
    suspended: t("msgSuspended"),
    unsuspended: t("msgUnsuspended"),
    deleted: t("msgDeleted"),
    self: t("msgSelf"),
    founder: t("msgFounder"),
    not_found: t("msgNotFound"),
    granted: t("msgGranted"),
    revoked: t("msgRevoked"),
  };
  return map[key] ?? key;
}

interface AdminUserSheetProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: string;
  badges: Badge[];
  onUserChanged: () => void;
}

export function AdminUserSheet({
  userId,
  open,
  onOpenChange,
  locale,
  badges,
  onUserChanged,
}: AdminUserSheetProps) {
  const t = useTranslations("admin");
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [updateState, updateAction] = useFormState(adminUpdateUserAction, initial);
  const [grantBadgeId, setGrantBadgeId] = useState("");
  const [revokeBadgeId, setRevokeBadgeId] = useState("");

  const loadDetail = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const row = await fetchAdminUserDetail(userId);
      setDetail(row);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (open && userId) {
      void loadDetail();
      setActionMsg(null);
    } else if (!open) {
      setDetail(null);
    }
  }, [open, userId, loadDetail]);

  useEffect(() => {
    if (updateState.message) {
      setActionMsg(resultMessage(t, updateState.message));
      if (updateState.success) {
        void loadDetail();
        onUserChanged();
      }
    }
  }, [updateState, t, loadDetail, onUserChanged]);

  function runAction(fn: () => Promise<AdminResult>) {
    startTransition(async () => {
      const res = await fn();
      setActionMsg(resultMessage(t, res.message));
      if (res.success) {
        if (res.message === "deleted") {
          onOpenChange(false);
          onUserChanged();
          return;
        }
        void loadDetail();
        onUserChanged();
      }
    });
  }

  const dateFmt = locale === "tr" ? "tr-TR" : "en-US";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-w-xl">
        <SheetHeader>
          <SheetTitle>{t("userSheetTitle")}</SheetTitle>
          <SheetDescription>{t("userSheetDesc")}</SheetDescription>
        </SheetHeader>

        <SheetBody>
          {loading && !detail ? (
            <p className="text-sm text-muted-foreground">{t("loadingUser")}</p>
          ) : !detail ? (
            <p className="text-sm text-destructive">{t("msgNotFound")}</p>
          ) : (
            <ScrollArea className="h-[calc(100vh-8rem)] pr-4">
              <div className="space-y-6">
                {/* Profile preview */}
                <section className="overflow-hidden border border-border bg-card/30">
                  {detail.bannerUrl ? (
                    <div className="relative h-24 w-full bg-c4e-slate">
                      <Image src={detail.bannerUrl} alt="" fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="h-16 bg-gradient-to-r from-c4e-slate to-black" />
                  )}
                  <div className="relative px-4 pb-4">
                    <div className="-mt-8 flex items-end gap-3">
                      <Avatar className="h-16 w-16 border-2 border-black ring-1 ring-border">
                        {detail.avatarUrl ? (
                          <AvatarImage src={detail.avatarUrl} alt={detail.username} />
                        ) : null}
                        <AvatarFallback className="bg-c4e-slate font-mono text-lg text-primary">
                          {detail.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1 pb-1">
                        <p className="truncate font-mono text-lg font-semibold text-foreground">
                          @{detail.username}
                          {detail.isFounder && (
                            <span className="ml-1 text-primary" title={t("founder")}>
                              ★
                            </span>
                          )}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{detail.email}</p>
                      </div>
                      {detail.suspendedAt && (
                        <UiBadge variant="destructive" className="shrink-0">
                          {t("suspended")}
                        </UiBadge>
                      )}
                    </div>
                    {detail.bio && (
                      <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">{detail.bio}</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {detail.userBadges.map((ub) => (
                        <UserBadgeChip key={ub.badgeId} badge={ub.badge} locale={locale} size="sm" />
                      ))}
                      {detail.userBadges.length === 0 && (
                        <span className="text-xs text-muted-foreground">{t("noBadges")}</span>
                      )}
                    </div>
                    <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
                      <div className="border border-border p-2">
                        <p className="font-mono text-primary">{detail._count.feeds}</p>
                        <p className="text-muted-foreground">{t("statPosts")}</p>
                      </div>
                      <div className="border border-border p-2">
                        <p className="font-mono text-primary">{detail._count.reposOwned}</p>
                        <p className="text-muted-foreground">{t("statRepos")}</p>
                      </div>
                      <div className="border border-border p-2">
                        <p className="font-mono text-primary">{detail._count.followerEdges}</p>
                        <p className="text-muted-foreground">{t("statFollowers")}</p>
                      </div>
                      <div className="border border-border p-2">
                        <p className="font-mono text-primary">{detail._count.followingEdges}</p>
                        <p className="text-muted-foreground">{t("statFollowing")}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-[10px] text-muted-foreground">
                      {t("joined")}: {new Date(detail.createdAt).toLocaleDateString(dateFmt)}
                    </p>
                  </div>
                </section>

                {/* Edit */}
                <section className="space-y-3 border border-border p-4">
                  <h3 className="font-mono text-sm font-semibold text-foreground">{t("editUser")}</h3>
                  <form action={updateAction} className="space-y-3" encType="multipart/form-data">
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="userId" value={detail.id} />
                    <div className="space-y-1">
                      <Label htmlFor="admin-username">{t("username")}</Label>
                      <Input
                        id="admin-username"
                        name="username"
                        defaultValue={detail.username}
                        className="font-mono"
                        autoComplete="off"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="admin-avatar">{t("avatar")}</Label>
                      <Input
                        id="admin-avatar"
                        name="avatar"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="text-xs"
                      />
                    </div>
                    <SaveBtn />
                  </form>
                </section>

                {/* Badges grant/revoke */}
                <section className="space-y-3 border border-border p-4">
                  <h3 className="font-mono text-sm font-semibold text-foreground">{t("badgesSection")}</h3>
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="min-w-[10rem] flex-1 space-y-1">
                      <Label htmlFor="grant-badge">{t("grantBadge")}</Label>
                      <select
                        id="grant-badge"
                        value={grantBadgeId}
                        onChange={(e) => setGrantBadgeId(e.target.value)}
                        className="flex h-10 w-full border border-border bg-black px-3 text-sm"
                      >
                        <option value="">{t("selectBadge")}</option>
                        {badges.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.slug}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={!grantBadgeId || pending}
                      onClick={() =>
                        runAction(() => adminGrantBadgeAction(detail.id, grantBadgeId, locale))
                      }
                    >
                      {t("grant")}
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="min-w-[10rem] flex-1 space-y-1">
                      <Label htmlFor="revoke-badge">{t("revokeBadge")}</Label>
                      <select
                        id="revoke-badge"
                        value={revokeBadgeId}
                        onChange={(e) => setRevokeBadgeId(e.target.value)}
                        className="flex h-10 w-full border border-border bg-black px-3 text-sm"
                      >
                        <option value="">{t("selectBadge")}</option>
                        {detail.userBadges.map((ub) => (
                          <option key={ub.badgeId} value={ub.badgeId}>
                            {ub.badge.slug}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!revokeBadgeId || pending}
                      onClick={() =>
                        runAction(() => adminRevokeBadgeAction(detail.id, revokeBadgeId, locale))
                      }
                    >
                      {t("revoke")}
                    </Button>
                  </div>
                </section>

                {/* Recent posts */}
                {detail.feeds.length > 0 && (
                  <section className="space-y-2">
                    <h3 className="font-mono text-sm font-semibold text-foreground">{t("recentPosts")}</h3>
                    <ul className="space-y-2">
                      {detail.feeds.map((f) => (
                        <li key={f.id} className="border border-border bg-black/50 p-3 text-xs">
                          <p className="line-clamp-3 text-foreground">{f.content}</p>
                          <p className="mt-1 text-muted-foreground">
                            {new Date(f.createdAt).toLocaleString(dateFmt)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                <Separator />

                {/* Moderation */}
                <section className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={detail.suspendedAt ? "secondary" : "outline"}
                    disabled={pending || detail.isFounder}
                    onClick={() =>
                      runAction(() =>
                        adminSuspendUserAction(detail.id, locale, !detail.suspendedAt)
                      )
                    }
                  >
                    {detail.suspendedAt ? t("unsuspend") : t("suspend")}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={pending || detail.isFounder}
                    onClick={() => {
                      if (window.confirm(t("deleteUserConfirm"))) {
                        runAction(() => adminDeleteUserAction(detail.id, locale));
                      }
                    }}
                  >
                    {t("deleteUser")}
                  </Button>
                </section>

                {actionMsg && (
                  <p
                    className={`text-xs ${actionMsg.includes(t("msgFailed")) || actionMsg.includes(t("forbidden")) ? "text-destructive" : "text-primary"}`}
                  >
                    {actionMsg}
                  </p>
                )}
              </div>
            </ScrollArea>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
