import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Kakao from 'next-auth/providers/kakao';
import { prisma } from '@makeforest/db';

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
        select: { id: true, dongCode: true },
      });

      // Attach to user so jwt callback picks it up without another DB round-trip
      user.id = dbUser.id;
      (user as Record<string, unknown>).dongCode = dbUser.dongCode ?? undefined;

      return true;
    },

    async jwt({ token, user, trigger }) {
      if (user?.id) {
        token.id = user.id;
        token.dongCode = (user as Record<string, unknown>).dongCode as string | undefined;
      }

      if (trigger === 'update' && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { dongCode: true },
        });
        token.dongCode = dbUser?.dongCode ?? undefined;
      }

      return token;
    },

    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      if (token.dongCode) session.user.dongCode = token.dongCode as string;
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
    };
  }
}
