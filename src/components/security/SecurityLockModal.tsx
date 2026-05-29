"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

interface SecurityLockModalProps {
  open: boolean;
  title?: string;
  description?: string;
  onClose: () => void;
}

export function SecurityLockModal({
  open,
  title,
  description,
  onClose,
}: SecurityLockModalProps) {
  const locale = useLocale();
  const t = useTranslations("common");
  const tp = useTranslations("platform");

  if (!open) return null;

  const modalTitle = title ?? tp("guestLockTitle");
  const modalDesc = description ?? tp("guestLockDesc");

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-c4e-slate p-5 shadow-2xl">
        <div className="mb-4 flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-c4e-neon shadow-[0_0_14px_rgba(0,122,204,0.5)]" />
          <p className="text-xs tracking-[0.15em] text-c4e-neon">{t("brand")}</p>
        </div>

        <h3 className="text-lg font-semibold text-foreground">{modalTitle}</h3>
        <p className="mt-2 text-sm text-c4e-muted">{modalDesc}</p>

        <div className="mt-5 flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {t("close")}
          </Button>
          <Button asChild>
            <Link href={`/${locale}/login`}>{t("login")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
