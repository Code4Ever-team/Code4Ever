import { prisma } from "@/lib/prisma";
import { signToken, setSessionCookie } from "@/lib/auth";
import { getJubbioTokens, getJubbioUserProfile } from "@/lib/jubbio";
import { NextRequest, NextResponse } from "next/server";
import logger from "@/lib/logger";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      { error: "Authorization code not provided." },
      { status: 400 }
    );
  }

  try {
    const tokens = await getJubbioTokens(code);
    const jubbioUser = await getJubbioUserProfile(tokens.access_token);

    let user = await prisma.user.findFirst({
      where: {
        accounts: {
          some: {
            provider: "jubbio",
            providerAccountId: jubbioUser.id,
          },
        },
      },
    });

    if (!user) {
      user = await prisma.user.findUnique({
        where: { email: jubbioUser.email },
      });

      if (user) {
        await prisma.account.create({
          data: {
            userId: user.id,
            type: "oauth",
            provider: "jubbio",
            providerAccountId: jubbioUser.id,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: Math.floor(Date.now() / 1000) + tokens.expires_in,
            scope: tokens.scope,
            token_type: tokens.token_type,
          },
        });
      } else {
        user = await prisma.user.create({
          data: {
            email: jubbioUser.email,
            username: jubbioUser.username,
            avatarUrl: jubbioUser.avatar,
            accounts: {
              create: {
                type: "oauth",
                provider: "jubbio",
                providerAccountId: jubbioUser.id,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expires_at:
                  Math.floor(Date.now() / 1000) + tokens.expires_in,
                scope: tokens.scope,
                token_type: tokens.token_type,
              },
            },
          },
        });
      }
    }

    const sessionToken = await signToken({
      id: user.id,
      username: user.username,
      email: user.email,
    });

    await setSessionCookie(sessionToken);

    return NextResponse.redirect("/feed");
  } catch (error) {
    logger.error("Jubbio callback error:", error);
    return NextResponse.json(
      { error: "An error occurred during Jubbio authentication." },
      { status: 500 }
    );
  }
}
