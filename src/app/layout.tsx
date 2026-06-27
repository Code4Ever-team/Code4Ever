import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Code4Ever",
  description: "Social coding network — feed, repos, and messages.",
  icons: {
    icon: "/icon",
    shortcut: "/icon",
    apple: "/icon",
  },
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="tr" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-black font-sans text-foreground antialiased">{children}</body>
    </html>
  );
}
