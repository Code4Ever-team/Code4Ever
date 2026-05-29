"use client";

import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/actions/auth.actions";

interface LogoutButtonProps {
  locale: string;
  className?: string;
  variant?: "default" | "secondary" | "destructive" | "ghost";
}

function LogoutSubmit({ variant }: { variant: LogoutButtonProps["variant"] }) {
  const { pending } = useFormStatus();
  const t = useTranslations("common");

  return (
    <Button type="submit" variant={variant ?? "secondary"} disabled={pending} className="w-full sm:w-auto">
      {pending ? t("loggingOut") : t("logout")}
    </Button>
  );
}

export function LogoutButton({ locale, className, variant = "secondary" }: LogoutButtonProps) {
  return (
    <form action={logoutAction} className={className}>
      <input type="hidden" name="locale" value={locale} />
      <LogoutSubmit variant={variant} />
    </form>
  );
}
