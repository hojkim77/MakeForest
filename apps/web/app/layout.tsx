import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '우리 동네 픽셀 숲',
  description: '집중하고, 우리 동네 숲을 키워요',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
