import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="font-mono text-6xl font-bold text-primary">404</p>
      <p className="mt-2 text-sm text-muted-foreground">Page not found.</p>
      <Link href="/tr" className="mt-6 text-sm text-primary hover:underline">
        ← Home
      </Link>
    </main>
  );
}
