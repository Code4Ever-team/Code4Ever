import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { createSession } from '@/lib/session';
import { verifySession } from '@/lib/session-verify';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  const defaultLocale = 'tr';

  if (!code) {
    return NextResponse.redirect(new URL(`/${defaultLocale}/login?error=no_code_provided`, request.url));
  }

    const tokenResponse = await fetch('https://jubbio.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.JUBBIO_CLIENT_ID!,
        client_secret: process.env.JUBBIO_CLIENT_SECRET!,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: `${new URL(request.url).origin}/api/api/auth/callback/jubbio`,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) throw new Error(tokenData.error || 'Token alımı başarısız.');
    const { access_token } = tokenData;

    const userResponse = await fetch('https://jubbio.com/api/users/@me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const jubbioUser = await userResponse.json();

    if (state === 'link_account') {
      const session = await verifySession();
      if (!session || !session.userId) {
        return NextResponse.redirect(new URL(`/${defaultLocale}/login?error=unauthorized`, request.url));
      }

      await prisma.user.update({
        where: { id: session.userId },
        data: {
          jubbioId: jubbioUser.id,
          jubbioToken: access_token,
          jubbioBadges: jubbioUser.badges || [],
        },
      });

      return NextResponse.redirect(new URL(`/${defaultLocale}/settings?success=jubbio_linked`, request.url));
    }

    if (state === 'pure_auth') {
      let user = await prisma.user.findUnique({
        where: { jubbioId: jubbioUser.id },
      });

      if (!user) {
        user = await prisma.user.findUnique({
          where: { email: jubbioUser.email },
        });

        if (user) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              jubbioId: jubbioUser.id,
              jubbioToken: access_token,
              jubbioBadges: jubbioUser.badges || [],
            },
          });
        } else {
          const randomPasswordHash = crypto.randomBytes(32).toString('hex');
          const baseUsername = jubbioUser.username || jubbioUser.email.split('@')[0];
          const uniqueUsername = `${baseUsername}_${crypto.randomBytes(3).toString('hex')}`;

          user = await prisma.user.create({
            data: {
              email: jubbioUser.email,
              username: uniqueUsername,
              passwordHash: randomPasswordHash,
              avatarUrl: jubbioUser.avatar_url || null,
              jubbioId: jubbioUser.id,
              jubbioToken: access_token,
              jubbioBadges: jubbioUser.badges || [],
            },
          });
        }
      }

      await createSession(user.id);
      return NextResponse.redirect(new URL(`/${defaultLocale}/ana-sayfa`, request.url));
    }

    return NextResponse.redirect(new URL(`/${defaultLocale}/login`, request.url));
}