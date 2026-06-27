export type CommunityRole = "ADMIN" | "MODERATOR" | "MEMBER";

export interface UserFeedItem {
  id: string;
  content: string;
  mediaUrl: string | null;
  mediaType: string | null;
  mediaNonce: string | null;
  mediaKey: string | null;
  mediaMimeType: string | null;
  createdAt: Date;
}

export interface UserRepoItem {
  id: string;
  name: string;
  description: string | null;
  isPrivate: boolean;
  createdAt: Date;
}

export interface UserForkItem {
  id: string;
  createdAt: Date;
  sourceRepo: { id: string; name: string };
  forkedRepo: { id: string; name: string };
}

export interface UserBadgeItem {
  id: string;
  slug: string;
  nameEn: string;
  nameTr: string;
  descriptionEn: string;
  descriptionTr: string;
  icon: string;
  rarity: "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  createdAt: Date;
  badges: UserBadgeItem[];
  feeds: UserFeedItem[];
  reposOwned: UserRepoItem[];
  forks: UserForkItem[];
  _count: {
    feeds: number;
    reposOwned: number;
    forks: number;
    followingEdges: number;
    followerEdges: number;
  };
}

export interface CommunityMemberUser {
  id: string;
  username: string;
  avatarUrl: string | null;
}

export interface CommunityMemberEntry {
  id: string;
  role: CommunityRole;
  joinedAt: Date;
  user: CommunityMemberUser;
}

export interface CommunityProfile {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  createdAt: Date;
  members: CommunityMemberEntry[];
  _count: {
    members: number;
    repos: number;
    feeds: number;
  };
}

export type SlugResolveResult =
  | { kind: "user"; data: UserProfile }
  | { kind: "community"; data: CommunityProfile };

export interface CurrentUser {
  id: string;
  username: string;
  email: string;
}
