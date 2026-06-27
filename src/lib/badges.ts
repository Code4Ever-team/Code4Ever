import type { BadgeRarity } from "@prisma/client";
import type { AppLocale } from "@/i18n/routing";

export interface BadgeViewModel {
  id: string;
  slug: string;
  nameEn: string;
  nameTr: string;
  descriptionEn: string;
  descriptionTr: string;
  icon: string;
  rarity: BadgeRarity;
}

export function badgeName(badge: Pick<BadgeViewModel, "nameEn" | "nameTr">, locale: string): string {
  return locale === "tr" ? badge.nameTr : badge.nameEn;
}

export function badgeDescription(
  badge: Pick<BadgeViewModel, "descriptionEn" | "descriptionTr">,
  locale: string
): string {
  return locale === "tr" ? badge.descriptionTr : badge.descriptionEn;
}

export type BadgeRarityKey = "common" | "rare" | "epic" | "legendary";

export function rarityToKey(rarity: BadgeRarity): BadgeRarityKey {
  return rarity.toLowerCase() as BadgeRarityKey;
}

export const RARITY_GLOW: Record<BadgeRarity, string> = {
  COMMON: "hover:shadow-[0_0_12px_rgba(0,122,204,0.25)]",
  RARE: "hover:shadow-[0_0_16px_rgba(0,122,204,0.45)]",
  EPIC: "hover:shadow-[0_0_20px_rgba(0,122,204,0.65)]",
  LEGENDARY: "hover:shadow-[0_0_24px_rgba(0,122,204,0.85)]",
};

export const RARITY_BORDER: Record<BadgeRarity, string> = {
  COMMON: "border-border",
  RARE: "border-primary/40",
  EPIC: "border-primary/60",
  LEGENDARY: "border-primary",
};
