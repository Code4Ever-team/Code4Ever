import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

import { AppShell } from "@/components/layout/AppShell";
import { isLocale, type AppLocale } from "@/i18n/routing";
import { getSession } from "@/lib/auth";

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: { locale: string };
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = params;

  if (!isLocale(locale)) {
    notFound();
  }

  const [messages, session] = await Promise.all([getMessages(), getSession()]);

  return (
    <NextIntlClientProvider messages={messages} locale={locale as AppLocale}>
      <AppShell locale={locale} session={session}>
        {children}
      </AppShell>
    </NextIntlClientProvider>
  );
}

