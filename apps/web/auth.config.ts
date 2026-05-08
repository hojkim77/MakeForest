import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import Kakao from 'next-auth/providers/kakao';

// Edge-safe config: no Prisma, no Node.js-only modules.
// Imported by middleware.ts only. auth.ts defines its own full config separately.
export const authConfig: NextAuthConfig = {
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
  callbacks: {
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      if (token.dongCode) session.user.dongCode = token.dongCode as string;
      if (token.loginToken) session.user.loginToken = token.loginToken as string;
      return session;
    },
  },
};
