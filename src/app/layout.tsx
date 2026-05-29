interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  // HTML/body etiketleri locale layout'ta yönetiliyor.
  return children;
}
