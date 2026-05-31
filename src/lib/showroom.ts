import { prisma } from "@/lib/prisma";
import { safeDbQuery } from "@/lib/db-safe";

export const SHOWROOM_ENTRY = ".pub/index.html";

export const SHOWROOM_SLUG_RESERVED = new Set([
  "feed",
  "repos",
  "repo",
  "chat",
  "groups",
  "login",
  "register",
  "dashboard",
  "settings",
  "admin",
  "p",
  "api",
  "tr",
  "en",
]);

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

export function normalizeShowroomSlug(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
}

export function validateShowroomSlug(slug: string): string | null {
  if (slug.length < 3 || slug.length > 40) return "showroomSlugLength";
  if (!SLUG_PATTERN.test(slug)) return "showroomSlugFormat";
  if (SHOWROOM_SLUG_RESERVED.has(slug)) return "showroomSlugReserved";
  return null;
}

export async function isShowroomSlugAvailable(slug: string, excludeRepoId?: string): Promise<boolean> {
  const [repo, user, community] = await Promise.all([
    prisma.repo.findFirst({
      where: {
        showroomSlug: slug,
        ...(excludeRepoId ? { id: { not: excludeRepoId } } : {}),
      },
      select: { id: true },
    }),
    prisma.user.findUnique({ where: { username: slug }, select: { id: true } }),
    prisma.community.findUnique({ where: { name: slug }, select: { id: true } }),
  ]);
  return !repo && !user && !community;
}

export function readFileContent(file: {
  content: string | null;
  encryptedContent: string | null;
}): string {
  return file.content ?? file.encryptedContent ?? "";
}

export async function loadShowroomBySlug(slug: string) {
  return safeDbQuery(
    "loadShowroomBySlug",
    () =>
      prisma.repo.findFirst({
        where: {
          showroomSlug: slug,
          showroomPublished: true,
          isPrivate: false,
          isEncrypted: false,
        },
        select: {
          id: true,
          name: true,
          description: true,
          showroomSlug: true,
          owner: { select: { username: true } },
          files: {
            where: { path: SHOWROOM_ENTRY },
            take: 1,
          },
        },
      }),
    null
  );
}

export async function getShowroomHtml(repoId: string): Promise<string | null> {
  const repo = await prisma.repo.findUnique({
    where: { id: repoId },
    select: { isEncrypted: true },
  });
  if (!repo || repo.isEncrypted) return null;

  const file = await prisma.repoFile.findUnique({
    where: { repoId_path: { repoId, path: SHOWROOM_ENTRY } },
    select: { content: true, encryptedContent: true, ciphertext: true },
  });
  if (!file) return null;
  if (file.ciphertext) return null;
  return readFileContent(file);
}
