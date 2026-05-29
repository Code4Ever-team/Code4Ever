import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isLocale } from "@/i18n/routing";

export default getRequestConfig(async ({ locale }) => {
  const candidate = locale ?? "";
  const safeLocale = isLocale(candidate) ? candidate : defaultLocale;

  return {
    locale: safeLocale,
    messages: (await import(`../../messages/${safeLocale}.json`)).default,
  };
});

