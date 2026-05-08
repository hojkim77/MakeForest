import type { Metadata } from 'next';
import { IBM_Plex_Mono, Inter } from 'next/font/google';
import { SessionProvider } from 'next-auth/react';
import { SessionGuard } from '@/components/SessionGuard';
import './globals.css';

const monoFont = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono',
  display: 'swap',
});

const sansFont = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: '우리 동네 픽셀 숲',
  description: '집중하고, 우리 동네 숲을 키워요',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${monoFont.variable} ${sansFont.variable}`}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />
      </head>
      <body className="bg-background text-on-background font-sans selection:bg-primary-fixed selection:text-on-primary-fixed min-h-screen">
        <SessionProvider>
          <SessionGuard />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
