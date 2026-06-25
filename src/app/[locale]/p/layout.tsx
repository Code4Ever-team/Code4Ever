/** Showroom — GitHub Pages gibi tam ekran; C4E chrome yok. */
export default function ShowroomLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] h-dvh w-dvw overflow-hidden bg-black">{children}</div>
  );
}
