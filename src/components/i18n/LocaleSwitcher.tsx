"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { locales, type AppLocale } from "@/i18n/routing";

export function LocaleSwitcher({ className }: { className?: string }) {
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const t = useTranslations("common");

  function hrefFor(target: AppLocale) {
    const segments = pathname.split("/");
    if (segments.length > 1 && locales.includes(segments[1] as AppLocale)) {
      segments[1] = target;
      return segments.join("/") || `/${target}`;
    }
    return `/${target}${pathname}`;
  }

  return (
    <div className={cn("flex gap-2", className)}>
      {locales.map((loc) => (
        <Link
          key={loc}
          href={hrefFor(loc)}
          className={cn(
            "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
            locale === loc
              ? "border-c4e-neon bg-c4e-neon/10 text-c4e-neon"
              : "border-border text-c4e-muted hover:border-c4e-neon/40 hover:text-foreground"
          )}
          aria-current={locale === loc ? "true" : undefined}
        >
          {loc === "tr" ? t("languageTr") : t("languageEn")}
        </Link>
      ))}
    </div>
  );
}
