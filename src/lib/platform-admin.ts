import { prisma } from "@/lib/prisma";
import { safeDbQuery } from "@/lib/db-safe";

/** İlk kayıt olan kullanıcı veya isFounder işaretli hesap. */
export async function isPlatformFounder(userId: string): Promise<boolean> {
  const marked = await safeDbQuery(
    "isPlatformFounder.marked",
    () =>
      prisma.user.findFirst({
        where: { isFounder: true },
        select: { id: true },
      }),
    null
  );

  if (marked) {
    return marked.id === userId;
  }

  const first = await safeDbQuery(
    "isPlatformFounder.firstUser",
    () =>
      prisma.user.findFirst({
        orderBy: { createdAt: "asc" },
        select: { id: true },
      }),
    null
  );

  return first?.id === userId;
}
