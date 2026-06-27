"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  badgeDescription,
  badgeName,
  RARITY_BORDER,
  RARITY_GLOW,
  rarityToKey,
  type BadgeViewModel,
} from "@/lib/badges";
import { cn } from "@/lib/utils";

interface UserBadgeChipProps {
  badge: BadgeViewModel;
  locale: string;
  size?: "sm" | "md";
}

export function UserBadgeChip({ badge, locale, size = "md" }: UserBadgeChipProps) {
  const t = useTranslations("badges");
  const name = badgeName(badge, locale);
  const description = badgeDescription(badge, locale);
  const rarityKey = rarityToKey(badge.rarity);

  return (
    <motion.div
      title={description}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.03 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
      className={cn(
        "group inline-flex items-center gap-2 border bg-black px-2.5 py-1.5 font-mono transition-shadow duration-200",
        RARITY_BORDER[badge.rarity],
        RARITY_GLOW[badge.rarity],
        size === "sm" ? "text-[10px]" : "text-xs"
      )}
    >
      <span className="text-base leading-none text-primary" aria-hidden>
        {badge.icon}
      </span>
      <span className="font-medium text-foreground">{name}</span>
      <span className="hidden text-[9px] uppercase tracking-wider text-primary/70 group-hover:inline">
        {t(`rarity.${rarityKey}`)}
      </span>
    </motion.div>
  );
}

interface UserBadgeListProps {
  badges: BadgeViewModel[];
  locale: string;
  emptyLabel?: string;
}

export function UserBadgeList({ badges, locale, emptyLabel }: UserBadgeListProps) {
  const t = useTranslations("badges");

  if (badges.length === 0) {
    return emptyLabel ? (
      <p className="text-xs text-muted-foreground">{emptyLabel}</p>
    ) : null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge) => (
        <UserBadgeChip key={badge.id} badge={badge} locale={locale} />
      ))}
      <span className="sr-only">{t("listLabel")}</span>
    </div>
  );
}
