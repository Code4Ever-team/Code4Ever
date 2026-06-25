import { notFound } from "next/navigation";
import { loadShowroomBySlug, readFileContent } from "@/lib/showroom";
import { isDatabaseAvailable } from "@/lib/db-safe";
import { ShowroomFrame } from "@/components/repo/ShowroomFrame";
import { DbOffline } from "@/components/system/DbOffline";

interface ShowroomPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export default async function ShowroomPage({ params }: ShowroomPageProps) {
  const { slug } = await params;

  const dbOk = await isDatabaseAvailable();
  if (!dbOk) {
    return (
      <main className="flex h-dvh items-center justify-center bg-black">
        <DbOffline />
      </main>
    );
  }

  const repo = await loadShowroomBySlug(slug);
  if (!repo) notFound();

  const entry = repo.files[0];
  const html = entry ? readFileContent(entry) : "";
  if (!html.trim()) notFound();

  return <ShowroomFrame html={html} title={repo.name} />;
}

export async function generateMetadata({ params }: ShowroomPageProps) {
  const { slug } = await params;
  const repo = await loadShowroomBySlug(slug);
  if (!repo) return { title: "404" };
  return {
    title: repo.name,
    description: repo.description ?? undefined,
  };
}
