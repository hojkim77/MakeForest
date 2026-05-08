import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest, NextMiddleware } from 'next/server';
import { redis, RedisKeys } from '@makeforest/redis';

const { auth } = NextAuth(authConfig);

export default auth(async (req: NextRequest & Parameters<Parameters<typeof auth>[0]>[0]) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const isLoggedIn = !!session?.user?.id;
  const hasDong = !!session?.user?.dongCode;

  if (pathname.startsWith('/login')) {
    if (isLoggedIn) return NextResponse.redirect(new URL(hasDong ? '/' : '/onboarding', req.url));
    return NextResponse.next();
  }

  if (pathname.startsWith('/onboarding')) {
    if (!isLoggedIn) return NextResponse.redirect(new URL('/login', req.url));
    if (hasDong) return NextResponse.redirect(new URL('/', req.url));
    return NextResponse.next();
  }

  if (isLoggedIn && !hasDong) {
    return NextResponse.redirect(new URL('/onboarding', req.url));
  }

  // loginToken 검증: 다른 기기 로그인 시 기존 JWT 무효화
  if (isLoggedIn) {
    const rawToken = await getToken({ req, secret: process.env.AUTH_SECRET! });
    const jwtLoginToken = rawToken?.loginToken as string | undefined;
    if (jwtLoginToken) {
      const redisToken = await redis.get<string>(RedisKeys.loginToken(session!.user.id));
      if (redisToken && redisToken !== jwtLoginToken) {
        const res = NextResponse.redirect(new URL('/login', req.url));
        res.cookies.delete('authjs.session-token');
        res.cookies.delete('__Secure-authjs.session-token');
        return res;
      }
    }
  }

  return NextResponse.next();
}) as unknown as NextMiddleware;

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)', '/'],
};
