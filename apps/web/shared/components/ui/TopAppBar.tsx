'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Icon } from './Icon';
import { NotificationBell } from './top-app-bar/NotificationBell';

const NAV_ITEMS = [
  { label: 'Map', href: '/' },
  { label: 'Community', href: '/community', guideId: 'community.entry' },
  { label: 'Dashboard', href: '/mypage', guideId: 'mypage.entry' },
] as const;

export function TopAppBar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (
        mobileNavOpen &&
        !hamburgerRef.current?.contains(e.target as Node) &&
        !mobileNavRef.current?.contains(e.target as Node)
      ) {
        setMobileNavOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [mobileNavOpen]);

  return (
    <header className="fixed top-0 left-0 right-0 z-header bg-surface border-b border-outline pt-[var(--safe-top)]">
      <div className="flex justify-between items-center w-full px-lg py-sm">
        {/* Logo */}
        <Link
          href="/"
          className="font-mono text-headline text-primary-container tracking-tighter uppercase"
        >
          PixelForest
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-12">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const guideId = 'guideId' in item ? item.guideId : undefined;
            return (
              <Link
                key={item.href}
                href={item.href}
                {...(guideId ? { 'data-guide': guideId } : {})}
                className={[
                  'font-mono text-base font-bold uppercase tracking-wider py-1 transition-none',
                  isActive
                    ? 'text-primary-container border-b-2 border-primary-container'
                    : 'text-on-surface-variant hover:text-on-surface',
                ].join(' ')}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-sm">
          {/* 모바일 햄버거 버튼 */}
          <button
            ref={hamburgerRef}
            className="md:hidden p-xs text-on-surface-variant hover:bg-surface-container-high transition-none"
            onClick={() => {
              setMobileNavOpen((v) => !v);
              setMenuOpen(false);
            }}
            aria-label="메뉴 열기"
          >
            <Icon name={mobileNavOpen ? 'close' : 'menu'} />
          </button>
          {session && <NotificationBell />}
          {session ? (
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="p-xs text-on-surface-variant hover:bg-surface-container-high transition-none"
                aria-label="내 계정"
              >
                <Icon name="account_circle" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-36 bg-surface border-2 border-outline shadow-island z-50 flex flex-col">
                  <Link
                    href="/mypage"
                    onClick={() => setMenuOpen(false)}
                    className="px-md py-sm font-mono text-label text-on-surface hover:bg-surface-container-high"
                  >
                    마이페이지
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="text-left px-md py-sm font-mono text-label text-error hover:bg-surface-container-high"
                  >
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/mypage"
              className="p-xs text-on-surface-variant hover:bg-surface-container-high transition-none"
              aria-label="내 계정"
            >
              <Icon name="account_circle" />
            </Link>
          )}
        </div>
      </div>
      {mobileNavOpen && (
        <div ref={mobileNavRef} className="md:hidden absolute top-full left-0 right-0 bg-surface border-b border-outline z-50 flex flex-col">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const guideId = 'guideId' in item ? item.guideId : undefined;
            return (
              <Link
                key={item.href}
                href={item.href}
                {...(guideId ? { 'data-guide': guideId } : {})}
                onClick={() => setMobileNavOpen(false)}
                className={[
                  'px-lg py-sm font-mono text-label border-b border-outline last:border-0',
                  isActive ? 'text-primary-container bg-surface-container' : 'text-on-surface hover:bg-surface-container-high',
                ].join(' ')}
              >
                {item.label}
              </Link>
            );
          })}
          {session ? (
            <button
              onClick={() => { signOut({ callbackUrl: '/' }); setMobileNavOpen(false); }}
              className="text-left px-lg py-sm font-mono text-label border-b border-outline last:border-0 text-error hover:bg-surface-container-high"
            >
              로그아웃
            </button>
          ) : (
            <Link
              href="/login"
              onClick={() => setMobileNavOpen(false)}
              className="px-lg py-sm font-mono text-label text-on-surface hover:bg-surface-container-high"
            >
              로그인
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
