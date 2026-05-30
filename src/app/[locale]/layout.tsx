import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

import { AppShell } from "@/components/layout/AppShell";
import { isLocale, type AppLocale } from "@/i18n/routing";
import "../globals.css";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Code4Ever",
  description: "Social coding network — feed, repos, and messages.",
  icons: {
    icon: "/icon",
    shortcut: "/icon",
    apple: "/icon",
  },
};

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const [messages, session] = await Promise.all([getMessages(), getSession()]);

  return (
    <html lang={locale} className="dark">
      <body>
        <NextIntlClientProvider messages={messages} locale={locale as AppLocale}>
          <AppShell locale={locale} session={session}>
            {children}
          </AppShell>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

