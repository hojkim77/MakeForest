import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import { NextResponse } from 'next/server';
import type { NextMiddleware } from 'next/server';

const { auth } = NextAuth(authConfig);

const VISITED_COOKIE = 'mf_visited';
const VISITED_COOKIE_OPTS = { path: '/', maxAge: 60 * 60 * 24 * 365 } as const;

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const isLoggedIn = !!session?.user?.id;
  const hasDong = !!session?.user?.dongCode;

  // First-time visitor on / → redirect to /welcome
  if (pathname === '/' && !req.cookies.has(VISITED_COOKIE)) {
    const res = NextResponse.redirect(new URL('/welcome', req.url));
    res.cookies.set(VISITED_COOKIE, '1', VISITED_COOKIE_OPTS);
    return res;
  }

  // Mark as visited when landing on /welcome (handles direct access)
  if (pathname === '/welcome' && !req.cookies.has(VISITED_COOKIE)) {
    const res = NextResponse.next();
    res.cookies.set(VISITED_COOKIE, '1', VISITED_COOKIE_OPTS);
    return res;
  }

  if (pathname.startsWith('/login')) {
    if (isLoggedIn) return NextResponse.redirect(new URL(hasDong ? '/' : '/onboarding', req.url));
    return NextResponse.next();
  }

  if (pathname.startsWith('/onboarding')) {
    if (!isLoggedIn) return NextResponse.redirect(new URL('/login', req.url));
    if (hasDong) return NextResponse.redirect(new URL('/', req.url));
    return NextResponse.next();
  }

  // 로그인은 됐지만 동네 미설정 → 온보딩 강제
  if (isLoggedIn && !hasDong) {
    return NextResponse.redirect(new URL('/onboarding', req.url));
  }

  return NextResponse.next();
}) as unknown as NextMiddleware;

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)', '/'],
};
