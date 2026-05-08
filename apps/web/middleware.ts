import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import { NextResponse } from 'next/server';
import type { NextMiddleware } from 'next/server';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
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

  return NextResponse.next();
}) as unknown as NextMiddleware;

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)', '/'],
};
