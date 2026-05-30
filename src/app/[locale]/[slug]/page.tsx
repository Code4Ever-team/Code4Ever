import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { UserProfile } from "@/components/profile/UserProfile";
import { CommunityPanel } from "@/components/profile/CommunityPanel";
import { safeDbQuery, isDatabaseAvailable } from "@/lib/db-safe";
import { isPlatformFounder } from "@/lib/platform-admin";
import { getFollowStatus, hasConversation } from "@/lib/chat-data";
import { DbOffline } from "@/components/system/DbOffline";
import type { UserProfile as UserProfileType, CommunityProfile } from "@/types/profile";

const RESERVED_SLUGS = new Set([
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
]);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  if (RESERVED_SLUGS.has(slug)) {
    return { title: `${slug} — Code4Ever` };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { username: slug },
      select: { username: true, bio: true },
    });

    if (user) {
      return {
        title: `${user.username} — Code4Ever`,
        description: user.bio ?? undefined,
      };
    }

    const community = await prisma.community.findUnique({
      where: { name: slug },
      select: { displayName: true, description: true },
    });

    if (community) {
      return {
        title: `${community.displayName} — Code4Ever`,
        description: community.description ?? undefined,
      };
    }
  } catch {
    return { title: "Code4Ever" };
  }

  return { title: "Code4Ever" };
}

async function fetchUserProfile(
  username: string,
  viewerId: string | null
): Promise<UserProfileType | null> {
  return safeDbQuery(
    "fetchUserProfile",
    async () => {
      const row = await prisma.user.findUnique({
        where: { username },
        select: {
          id: true,
          username: true,
          email: true,
          bio: true,
          avatarUrl: true,
          bannerUrl: true,
          createdAt: true,
          feeds: {
            take: 20,
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              content: true,
              mediaUrl: true,
              mediaType: true,
              createdAt: true,
            },
          },
          reposOwned: {
            where:
              viewerId === null
                ? { isPrivate: false }
                : {
                    OR: [{ isPrivate: false }, { ownerId: viewerId }],
                  },
            take: 20,
            orderBy: { updatedAt: "desc" },
            select: {
              id: true,
              name: true,
              description: true,
              isPrivate: true,
              createdAt: true,
            },
          },
          forks: {
            take: 20,
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              createdAt: true,
              sourceRepo: { select: { id: true, name: true } },
              forkedRepo: { select: { id: true, name: true } },
            },
          },
          _count: {
            select: {
              feeds: true,
              forks: true,
              followingEdges: true,
              followerEdges: true,
            },
          },
        },
      });

      if (!row) return null;

      const isOwner = viewerId === row.id;
      const repoCount = await prisma.repo.count({
        where: {
          ownerId: row.id,
          ...(isOwner ? {} : { isPrivate: false }),
        },
      });

      const profile = row as unknown as UserProfileType;
      profile._count = { ...profile._count, reposOwned: repoCount };
      if (!isOwner) {
        profile.email = "";
      }
      return profile;
    },
    null
  );
}

async function fetchCommunityProfile(name: string): Promise<CommunityProfile | null> {
  return safeDbQuery(
    "fetchCommunityProfile",
    async () =>
      (await prisma.community.findUnique({
        where: { name },
        select: {
          id: true,
          name: true,
          displayName: true,
          description: true,
          logoUrl: true,
          bannerUrl: true,
          createdAt: true,
          members: {
            take: 50,
            orderBy: { joinedAt: "asc" },
            select: {
              id: true,
              role: true,
              joinedAt: true,
              user: {
                select: {
                  id: true,
                  username: true,
                  avatarUrl: true,
                },
              },
            },
          },
          _count: {
            select: { members: true, repos: true, feeds: true },
          },
        },
      })) as CommunityProfile | null,
    null
  );
}

interface SlugPageProps {
  params: Promise<{ slug: string; locale: string }>;
}

export default async function SlugPage({ params }: SlugPageProps) {
  const { slug, locale } = await params;

  if (RESERVED_SLUGS.has(slug)) {
    notFound();
  }

  const dbOk = await isDatabaseAvailable();
  if (!dbOk) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <DbOffline />
      </main>
    );
  }

  const session = await getSession();
  const user = await fetchUserProfile(slug, session?.id ?? null);
  const isLoggedIn = session !== null;
  const isOwnProfile = session?.username === slug;
  if (user) {
    const canModerateFeeds =
      session !== null && (isOwnProfile || (await isPlatformFounder(session.id)));
    const isFollowing =
      session !== null && !isOwnProfile
        ? await getFollowStatus(session.id, user.id)
        : false;
    const canMessage =
      session !== null &&
      !isOwnProfile &&
      (isFollowing || (await hasConversation(session.id, user.id)));

    return (
      <UserProfile
        user={user}
        locale={locale}
        isLoggedIn={isLoggedIn}
        isOwnProfile={isOwnProfile}
        canModerateFeeds={canModerateFeeds}
        isFollowing={isFollowing}
        canMessage={canMessage}
      />
    );
  }

  const community = await fetchCommunityProfile(slug);
  if (community) {
    return (
      <CommunityPanel community={community} locale={locale} isLoggedIn={isLoggedIn} />
    );
  }

  notFound();
}
