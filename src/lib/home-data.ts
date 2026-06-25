import { prisma } from "@/lib/prisma";
import { safeDbQuery } from "@/lib/db-safe";

export interface HomeFeedItem {
  id: string;
  content: string;
  mediaUrl: string | null;
  mediaType: string | null;
  mediaNonce: string | null;
  mediaKey: string | null;
  mediaMimeType: string | null;
  createdAt: Date;
  user: { username: string };
}

export interface HomeRepoItem {
  id: string;
  name: string;
  isPrivate: boolean;
  createdAt: Date;
  owner: { username: string } | null;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function loadHomeFeedAndRepos(userId: string | null): Promise<{
  feedItems: HomeFeedItem[];
  repoItems: HomeRepoItem[];
}> {
  if (userId) {
    const [feedItems, repoItems] = await Promise.all([
      safeDbQuery(
        "loadHomeFeed.loggedIn.feed",
        () =>
          prisma.feed.findMany({
            take: 12,
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              content: true,
              mediaUrl: true,
              mediaType: true,
              mediaNonce: true,
              mediaKey: true,
              mediaMimeType: true,
              createdAt: true,
              user: { select: { username: true } },
            },
          }),
        []
      ),
      safeDbQuery(
        "loadHomeFeed.loggedIn.repos",
        () =>
          prisma.repo.findMany({
            where: { ownerId: userId },
            take: 12,
            orderBy: { updatedAt: "desc" },
            select: {
              id: true,
              name: true,
              isPrivate: true,
              createdAt: true,
              owner: { select: { username: true } },
            },
          }),
        []
      ),
    ]);
    return { feedItems, repoItems };
  }

  const [allFeed, allRepos] = await Promise.all([
    safeDbQuery(
      "loadHomeFeed.guest.feed",
      () =>
        prisma.feed.findMany({
          take: 40,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            content: true,
            mediaUrl: true,
            mediaType: true,
            mediaNonce: true,
            mediaKey: true,
            mediaMimeType: true,
            createdAt: true,
            user: { select: { username: true } },
          },
        }),
      []
    ),
    safeDbQuery(
      "loadHomeFeed.guest.repos",
      () =>
        prisma.repo.findMany({
          where: { isPrivate: false },
          take: 40,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            isPrivate: true,
            createdAt: true,
            owner: { select: { username: true } },
          },
        }),
      []
    ),
  ]);

  return {
    feedItems: shuffle(allFeed).slice(0, 12),
    repoItems: shuffle(allRepos).slice(0, 12),
  };
}

export async function loadFeedList(): Promise<HomeFeedItem[]> {
  return safeDbQuery(
    "loadFeedList",
    () =>
      prisma.feed.findMany({
        take: 30,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          content: true,
          mediaUrl: true,
          mediaType: true,
          mediaNonce: true,
          mediaKey: true,
          mediaMimeType: true,
          createdAt: true,
          user: { select: { username: true } },
        },
      }),
    []
  );
}

export async function loadRepoList(userId: string | null): Promise<HomeRepoItem[]> {
  if (userId) {
    return safeDbQuery(
      "loadRepoList.loggedIn",
      () =>
        prisma.repo.findMany({
          where: { ownerId: userId },
          take: 30,
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            name: true,
            isPrivate: true,
            createdAt: true,
            owner: { select: { username: true } },
          },
        }),
      []
    );
  }

  const all = await safeDbQuery(
    "loadRepoList.guest",
    () =>
      prisma.repo.findMany({
        where: { isPrivate: false },
        take: 40,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          isPrivate: true,
          createdAt: true,
          owner: { select: { username: true } },
        },
      }),
    []
  );

  return shuffle(all).slice(0, 30);
}
