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
  callbacks: {
    async signIn({ user, account }) {
      if (!account || !user.email) return false;

      await prisma.user.upsert({
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
      });

      return true;
    },
    async session({ session, token }) {
      if (token.sub) {
        const dbUser = await prisma.user.findFirst({
          where: {
            provider: token.provider as string,
            providerId: token.providerId as string,
          },
        });
        if (dbUser) {
          session.user.id = dbUser.id;
          if (dbUser.dongCode) session.user.dongCode = dbUser.dongCode;
        }
      }
      return session;
    },
    async jwt({ token, account }) {
      if (account) {
        token.provider = account.provider;
        token.providerId = account.providerAccountId;
      }
      return token;
    },
  },
  pages: {
    signIn: '/login',
    newUser: '/onboarding',
  },
});

export const handlers = nextAuth.handlers;
export const auth: typeof nextAuth.auth = nextAuth.auth;
export const signIn: typeof nextAuth.signIn = nextAuth.signIn;
export const signOut: typeof nextAuth.signOut = nextAuth.signOut;

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
