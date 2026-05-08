import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Kakao from 'next-auth/providers/kakao';
import { prisma } from '@makeforest/db';
import { redis, RedisKeys } from '@makeforest/redis';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000';
const INTERNAL_SECRET = process.env.INTERNAL_SECRET ?? '';

const nextAuth = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    Kakao({
      clientId: process.env.AUTH_KAKAO_ID!,
      clientSecret: process.env.AUTH_KAKAO_SECRET ?? '',
    }),
  ],
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
  callbacks: {
    async signIn({ user, account }) {
      if (!account) return false;

      const dbUser = await prisma.user.upsert({
        where: {
          provider_providerId: {
            provider: account.provider,
            providerId: account.providerAccountId,
          },
        },
        update: { avatarUrl: user.image ?? null },
        create: {
          provider: account.provider,
          providerId: account.providerAccountId,
          nickname: user.name ?? '새 유저',
          avatarUrl: user.image ?? null,
        },
        select: { id: true, dongCode: true, regionCode: true },
      });

      // Attach to user so jwt callback picks it up without another DB round-trip
      user.id = dbUser.id;
      (user as Record<string, unknown>).dongCode = dbUser.dongCode ?? undefined;
      (user as Record<string, unknown>).regionCode = dbUser.regionCode ?? undefined;

      // 새 loginToken 발급 → Redis 저장 (30일 TTL) + 기존 기기 force_logout 브로드캐스트
      const loginToken = crypto.randomUUID();
      await redis.set(RedisKeys.loginToken(dbUser.id), loginToken, { ex: 30 * 24 * 60 * 60 });
      (user as Record<string, unknown>).loginToken = loginToken;

      void fetch(`${SERVER_URL}/sse/internal/force-logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-secret': INTERNAL_SECRET },
        body: JSON.stringify({ userId: dbUser.id }),
      }).catch(() => {});

      return true;
    },

    async jwt({ token, user, trigger }) {
      if (user?.id) {
        token.id = user.id;
        token.dongCode = (user as Record<string, unknown>).dongCode as string | undefined;
        token.regionCode = (user as Record<string, unknown>).regionCode as string | undefined;
        token.loginToken = (user as Record<string, unknown>).loginToken as string | undefined;
      }

      if (trigger === 'update' && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { dongCode: true, regionCode: true },
        });
        token.dongCode = dbUser?.dongCode ?? undefined;
        token.regionCode = (dbUser as Record<string, unknown> | null)?.['regionCode'] as string | undefined;
      }

      return token;
    },

    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      if (token.dongCode) session.user.dongCode = token.dongCode as string;
      if (token.regionCode) session.user.regionCode = token.regionCode as string;
      if (token.loginToken) session.user.loginToken = token.loginToken as string;
      return session;
    },
  },
});

export const handlers = nextAuth.handlers;
export const auth: typeof nextAuth.auth = nextAuth.auth;
export const signIn: typeof nextAuth.signIn = nextAuth.signIn;
export const signOut: typeof nextAuth.signOut = nextAuth.signOut;
export const unstable_update: typeof nextAuth.unstable_update = nextAuth.unstable_update;

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      dongCode?: string;
      regionCode?: string;
      loginToken?: string;
    };
  }
}
