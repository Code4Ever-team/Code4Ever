"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavLinkProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  match?: "exact" | "prefix";
  className?: string;
}

export function NavLink({ href, label, icon, match = "prefix", className }: NavLinkProps) {
  const pathname = usePathname();
  const active =
    match === "exact"
      ? pathname === href || pathname === `${href}/`
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      prefetch
      className={cn(
        "group flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-c4e-neon/10 text-c4e-neon"
          : "text-c4e-muted hover:bg-card/60 hover:text-foreground",
        className
      )}
      aria-current={active ? "page" : undefined}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

interface DockLinkProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  match?: "exact" | "prefix";
}

export function DockLink({ href, label, icon, match = "prefix" }: DockLinkProps) {
  const pathname = usePathname();
  const active =
    match === "exact"
      ? pathname === href || pathname === `${href}/`
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      prefetch
      className={cn(
        "relative flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors",
        active ? "text-c4e-neon" : "text-c4e-muted hover:text-foreground"
      )}
      aria-current={active ? "page" : undefined}
    >
      {active && (
        <span className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-c4e-neon shadow-[0_0_12px_rgba(0,122,204,0.8)]" />
      )}
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg border transition-colors",
          active
            ? "border-c4e-neon/50 bg-c4e-neon/10"
            : "border-transparent bg-transparent"
        )}
      >
        {icon}
      </span>
      <span className="truncate max-w-[4.5rem]">{label}</span>
    </Link>
  );
}
