"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/layout/BottomNav";
import { TopBar } from "@/components/layout/TopBar";
import { MessageNotificationProvider } from "@/components/notifications/MessageNotificationProvider";
import { usePresenceHeartbeat } from "@/hooks/usePresenceHeartbeat";
interface ShellSession {
  id: string;
  username: string;
}

interface NavCommunity {
  id: string;
  name: string;
  logoUrl: string | null;
}

interface NavUser {
  username: string;
  avatarUrl: string | null;
}

interface NavPayload {
  user: NavUser | null;
  communities: NavCommunity[];
  isFounder: boolean;
}

interface AppShellProps {
  locale: string;
  session: ShellSession | null;
  children: React.ReactNode;
}

export function AppShell({ locale, session, children }: AppShellProps) {
  const pathname = usePathname();
  const isShowroom = /\/p\/[^/]+$/.test(pathname);

  const [nav, setNav] = useState<NavPayload | null>(null);
  usePresenceHeartbeat(session !== null && !isShowroom);

  useEffect(() => {
    if (!session) {
      setNav(null);
      return;
    }

    let cancelled = false;
    void fetch("/api/me/nav", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: NavPayload | null) => {
        if (!cancelled && data) setNav(data);
      })
      .catch(() => {
        if (!cancelled) {
          setNav({
            user: { username: session.username, avatarUrl: null },
            communities: [],
            isFounder: false,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session?.id, session?.username]);

  const navUser =
    nav?.user ??
    (session ? { username: session.username, avatarUrl: null } : null);

  if (isShowroom) {
    return <>{children}</>;
  }

  return (
    <>
      <TopBar
        user={navUser}
        communities={nav?.communities ?? []}
        isLoggedIn={session !== null}
        isFounder={nav?.isFounder ?? false}
      />
      <div className="mx-auto max-w-6xl px-4 pb-24 md:pb-10">{children}</div>
      {session && (
        <MessageNotificationProvider userId={session.id} locale={locale} />
      )}
      <BottomNav user={navUser} communities={nav?.communities} />
    </>
  );
}
