export const locales = ["en", "tr"] as const;
export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "tr";

export function isLocale(value: string): value is AppLocale {
  return (locales as readonly string[]).includes(value);
}

