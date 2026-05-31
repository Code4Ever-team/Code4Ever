import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { loadShowroomBySlug, readFileContent, SHOWROOM_ENTRY } from "@/lib/showroom";
import { isDatabaseAvailable } from "@/lib/db-safe";
import { ShowroomFrame } from "@/components/repo/ShowroomFrame";
import { DbOffline } from "@/components/system/DbOffline";

interface ShowroomPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export default async function ShowroomPage({ params }: ShowroomPageProps) {
  const { locale, slug } = await params;
  const t = await getTranslations("showroom");

  const dbOk = await isDatabaseAvailable();
  if (!dbOk) {
    return (
      <main className="py-10">
        <DbOffline />
      </main>
    );
  }

  const repo = await loadShowroomBySlug(slug);
  if (!repo) notFound();

  const entry = repo.files[0];
  const html = entry ? readFileContent(entry) : "";
  if (!html.trim()) notFound();

  return (
    <div className="relative">
      <header className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between border-b border-border/50 bg-black/80 px-4 py-2 backdrop-blur-sm">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{repo.name}</p>
          <p className="truncate text-[10px] text-muted-foreground">
            {repo.owner?.username ? `@${repo.owner.username}` : ""}
            {repo.description ? ` · ${repo.description}` : ""}
          </p>
        </div>
        <Link
          href={`/${locale}/repo/${repo.id}`}
          className="shrink-0 text-xs text-primary hover:underline"
        >
          {t("viewRepo")}
        </Link>
      </header>
      <ShowroomFrame html={html} title={repo.name} />
    </div>
  );
}

export async function generateMetadata({ params }: ShowroomPageProps) {
  const { slug } = await params;
  const repo = await loadShowroomBySlug(slug);
  if (!repo) return { title: "Showroom — Code4Ever" };
  return {
    title: `${repo.name} — Showroom`,
    description: repo.description ?? undefined,
  };
}
