"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import type { Badge } from "@prisma/client";
import {
  adminCreateBadgeAction,
  adminSendMailAction,
  type AdminResult,
} from "@/lib/actions/admin.actions";
import { AdminFeedRow } from "@/components/admin/AdminFeedRow";
import { AdminUserSheet } from "@/components/admin/AdminUserSheet";
import { UserBadgeChip } from "@/components/badges/UserBadgeChip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge as UiBadge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, FileText, Award, Mail, LayoutDashboard, Search } from "lucide-react";

export interface AdminUserRow {
  id: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  isFounder: boolean;
  suspendedAt: Date | null;
  createdAt: Date;
}

export interface AdminFeedRowData {
  id: string;
  content: string;
  createdAt: Date;
  author: string;
}

interface AdminDashboardProps {
  locale: string;
  userCount: number;
  feedCount: number;
  repoCount: number;
  users: AdminUserRow[];
  feeds: AdminFeedRowData[];
  badges: Badge[];
}

const badgeInitial: AdminResult = { success: false, message: "" };
const mailInitial: AdminResult = { success: false, message: "" };

function CreateBadgeBtn() {
  const { pending } = useFormStatus();
  const t = useTranslations("admin");
  return (
    <Button type="submit" disabled={pending}>
      {pending ? t("saving") : t("createBadge")}
    </Button>
  );
}

function SendMailBtn() {
  const { pending } = useFormStatus();
  const t = useTranslations("admin");
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? t("sending") : t("sendMail")}
    </Button>
  );
}

function adminMsg(t: ReturnType<typeof useTranslations<"admin">>, key: string): string {
  const map: Record<string, string> = {
    badge_created: t("msgBadgeCreated"),
    missing_fields: t("msgMissingFields"),
    sent: t("msgMailSent"),
    empty: t("msgMailEmpty"),
    smtp: t("msgSmtp"),
    forbidden: t("forbidden"),
    failed: t("msgFailed"),
    not_found: t("msgNotFound"),
  };
  return map[key] ?? key;
}

export function AdminDashboard({
  locale,
  userCount,
  feedCount,
  repoCount,
  users: initialUsers,
  feeds,
  badges,
}: AdminDashboardProps) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mailUserId, setMailUserId] = useState("");
  const [, startRefresh] = useTransition();

  const [badgeState, badgeAction] = useFormState(adminCreateBadgeAction, badgeInitial);
  const [mailState, mailAction] = useFormState(adminSendMailAction, mailInitial);

  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  const refresh = useCallback(() => {
    startRefresh(() => router.refresh());
  }, [router]);

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const dateFmt = locale === "tr" ? "tr-TR" : "en-US";

  function openUser(id: string) {
    setSelectedUserId(id);
    setSheetOpen(true);
  }

  return (
    <div className="space-y-6">
      <header className="border-b border-border pb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center border border-primary/40 bg-primary/5">
            <LayoutDashboard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-mono text-xl font-semibold tracking-wide text-foreground">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>
      </header>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="h-auto flex-wrap gap-0 border-b border-border bg-transparent p-0">
          <TabsTrigger value="overview" className="gap-1.5 rounded-none">
            <LayoutDashboard className="h-3.5 w-3.5" />
            {t("tabOverview")}
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5 rounded-none">
            <Users className="h-3.5 w-3.5" />
            {t("tabUsers")}
          </TabsTrigger>
          <TabsTrigger value="feeds" className="gap-1.5 rounded-none">
            <FileText className="h-3.5 w-3.5" />
            {t("tabFeeds")}
          </TabsTrigger>
          <TabsTrigger value="badges" className="gap-1.5 rounded-none">
            <Award className="h-3.5 w-3.5" />
            {t("tabBadges")}
          </TabsTrigger>
          <TabsTrigger value="mail" className="gap-1.5 rounded-none">
            <Mail className="h-3.5 w-3.5" />
            {t("tabMail")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="border-border bg-card/40 p-5">
              <p className="font-mono text-3xl font-bold text-primary">{userCount}</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{t("statsUsers")}</p>
            </Card>
            <Card className="border-border bg-card/40 p-5">
              <p className="font-mono text-3xl font-bold text-primary">{feedCount}</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{t("statsFeeds")}</p>
            </Card>
            <Card className="border-border bg-card/40 p-5">
              <p className="font-mono text-3xl font-bold text-primary">{repoCount}</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{t("statsRepos")}</p>
            </Card>
          </div>
          <Card className="border-border bg-black/50 p-4">
            <p className="text-sm text-muted-foreground">{t("overviewHint")}</p>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder={t("searchUsers")}
              className="pl-9 font-mono"
            />
          </div>
          <ScrollArea className="h-[min(32rem,calc(100vh-16rem))]">
            <ul className="space-y-1 pr-4">
              {filteredUsers.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => openUser(u.id)}
                    className="flex w-full items-center gap-3 border border-border bg-card/30 px-4 py-3 text-left transition hover:border-primary/50 hover:bg-card/60"
                  >
                    <Avatar className="h-9 w-9">
                      {u.avatarUrl ? <AvatarImage src={u.avatarUrl} alt={u.username} /> : null}
                      <AvatarFallback className="bg-c4e-slate text-xs text-primary">
                        {u.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-sm font-medium text-foreground">
                        @{u.username}
                        {u.isFounder && <span className="ml-1 text-primary">★</span>}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    {u.suspendedAt && (
                      <UiBadge variant="destructive" className="shrink-0 text-[10px]">
                        {t("suspended")}
                      </UiBadge>
                    )}
                    <span className="hidden shrink-0 text-[10px] text-muted-foreground sm:inline">
                      {new Date(u.createdAt).toLocaleDateString(dateFmt)}
                    </span>
                  </button>
                </li>
              ))}
              {filteredUsers.length === 0 && (
                <li className="py-8 text-center text-sm text-muted-foreground">{t("noUsers")}</li>
              )}
            </ul>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="feeds" className="space-y-3">
          {feeds.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noFeeds")}</p>
          ) : (
            <ul className="space-y-2">
              {feeds.map((feed) => (
                <AdminFeedRow
                  key={feed.id}
                  id={feed.id}
                  content={feed.content}
                  author={feed.author}
                  createdAt={feed.createdAt}
                  locale={locale}
                />
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="badges" className="space-y-6">
          <Card className="border-border bg-black/50 p-5">
            <h2 className="mb-4 font-mono text-sm font-semibold text-foreground">{t("createBadgeTitle")}</h2>
            <form action={badgeAction} className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="slug">{t("badgeSlug")}</Label>
                <Input id="slug" name="slug" required placeholder="core-dev" className="font-mono" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="icon">{t("badgeIcon")}</Label>
                <Input id="icon" name="icon" required maxLength={8} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="nameEn">{t("badgeNameEn")}</Label>
                <Input id="nameEn" name="nameEn" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="nameTr">{t("badgeNameTr")}</Label>
                <Input id="nameTr" name="nameTr" required />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="descriptionEn">{t("badgeDescEn")}</Label>
                <Textarea id="descriptionEn" name="descriptionEn" rows={2} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="descriptionTr">{t("badgeDescTr")}</Label>
                <Textarea id="descriptionTr" name="descriptionTr" rows={2} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rarity">{t("badgeRarity")}</Label>
                <select
                  id="rarity"
                  name="rarity"
                  className="flex h-10 w-full border border-border bg-black px-3 text-sm"
                  defaultValue="COMMON"
                >
                  <option value="COMMON">COMMON</option>
                  <option value="RARE">RARE</option>
                  <option value="EPIC">EPIC</option>
                  <option value="LEGENDARY">LEGENDARY</option>
                </select>
              </div>
              <div className="flex items-end">
                <CreateBadgeBtn />
              </div>
            </form>
            {badgeState.message && (
              <p
                className={`mt-3 text-xs ${badgeState.success ? "text-primary" : "text-destructive"}`}
              >
                {adminMsg(t, badgeState.message)}
              </p>
            )}
          </Card>

          <div>
            <h2 className="mb-3 font-mono text-sm font-semibold text-muted-foreground">
              {t("allBadges")} ({badges.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {badges.map((b) => (
                <UserBadgeChip key={b.id} badge={b} locale={locale} size="sm" />
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="mail" className="space-y-4">
          <Card className="border-border bg-black/50 p-5">
            <h2 className="mb-1 font-mono text-sm font-semibold text-foreground">{t("mailTitle")}</h2>
            <p className="mb-4 text-xs text-muted-foreground">{t("mailDesc")}</p>
            <form action={mailAction} className="space-y-4">
              <input type="hidden" name="locale" value={locale} />
              <div className="space-y-1">
                <Label htmlFor="mail-user">{t("mailRecipient")}</Label>
                <select
                  id="mail-user"
                  name="userId"
                  required
                  value={mailUserId}
                  onChange={(e) => setMailUserId(e.target.value)}
                  className="flex h-10 w-full border border-border bg-black px-3 text-sm font-mono"
                >
                  <option value="">{t("selectUser")}</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      @{u.username} — {u.email}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="mail-subject">{t("mailSubject")}</Label>
                <Input id="mail-subject" name="subject" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="mail-intro">{t("mailBody")}</Label>
                <Textarea id="mail-intro" name="intro" rows={5} required className="font-mono text-sm" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="mail-btn">{t("mailButtonText")}</Label>
                  <Input id="mail-btn" name="buttonText" placeholder={t("mailButtonOptional")} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="mail-url">{t("mailButtonUrl")}</Label>
                  <Input id="mail-url" name="buttonUrl" type="url" placeholder="https://" />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="mail-footer">{t("mailFooter")}</Label>
                <Input id="mail-footer" name="footer" placeholder={t("mailFooterOptional")} />
              </div>
              <SendMailBtn />
            </form>
            {mailState.message && (
              <p className={`mt-3 text-xs ${mailState.success ? "text-primary" : "text-destructive"}`}>
                {adminMsg(t, mailState.message)}
              </p>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <AdminUserSheet
        userId={selectedUserId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        locale={locale}
        badges={badges}
        onUserChanged={() => {
          refresh();
          setUsers((prev) => prev);
        }}
      />
    </div>
  );
}
