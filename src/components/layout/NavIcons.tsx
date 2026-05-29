import { cn } from "@/lib/utils";

interface IconProps {
  className?: string;
}

export function HomeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="none" className={className} aria-hidden>
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FeedIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="none" className={className} aria-hidden>
      <path
        d="M4 6.5h16M4 12h16M4 17.5h10"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function RepoIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="none" className={className} aria-hidden>
      <path
        d="M8 6 3 12l5 6M16 6l5 6-5 6M14 4l-4 16"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChatIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="none" className={className} aria-hidden>
      <path
        d="M4 6h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 3v-3H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function UserIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="none" className={className} aria-hidden>
      <path
        d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM5 20a7 7 0 0 1 14 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ShieldIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={14} height={14} fill="none" className={className} aria-hidden>
      <path
        d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M9.5 12 11 13.5 14.5 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function NavIconWrap({
  children,
  active,
}: {
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-md border transition-colors",
        active
          ? "border-c4e-neon/60 bg-c4e-neon/10 text-c4e-neon"
          : "border-transparent text-c4e-muted group-hover:border-border group-hover:bg-card/50 group-hover:text-foreground"
      )}
    >
      {children}
    </span>
  );
}
