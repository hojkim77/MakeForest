'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Icon } from './Icon';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Community', href: '/community' },
  { label: 'Forest Map', href: '/' },
  { label: 'Stats', href: '/mypage' },
] as const;

export function TopAppBar() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface border-b border-outline-variant">
      <div className="flex justify-between items-center w-full px-lg py-sm">
        {/* Logo */}
        <Link
          href="/"
          className="font-mono text-headline text-primary-container tracking-tighter uppercase"
        >
          Neighborhood Pixel Forest
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_ITEMS.map(({ label, href }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={[
                  'font-mono text-label uppercase tracking-wider py-1 transition-none',
                  isActive
                    ? 'text-primary-container border-b-2 border-primary-container'
                    : 'text-on-surface-variant hover:text-on-surface',
                ].join(' ')}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-sm">
          <button
            className="p-xs text-on-surface-variant hover:bg-surface-container-high transition-none"
            aria-label="알림"
          >
            <Icon name="notifications" />
          </button>
          <Link
            href="/mypage"
            className="p-xs text-on-surface-variant hover:bg-surface-container-high transition-none"
            aria-label="내 계정"
          >
            <Icon name="account_circle" />
          </Link>
        </div>
      </div>
    </header>
  );
}
