'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';

type Provider = 'kakao' | 'google';

export default function LoginPage() {
  const [loading, setLoading] = useState<Provider | null>(null);

  async function handleSignIn(provider: Provider) {
    setLoading(provider);
    try {
      await signIn(provider, { redirectTo: '/' });
    } finally {
      setLoading(null);
    }
  }

  return (
    <main className="bg-[#FAF9F7] text-on-surface min-h-screen flex flex-col items-center justify-center p-md pixel-grid relative">
      <div className="max-w-[400px] w-full flex flex-col items-center text-center">
        {/* Title */}
        <header className="mb-xl">
          <h1 className="font-mono text-display text-primary mb-sm uppercase tracking-tighter">
            집중의 시작, 픽셀 숲
          </h1>
          <p className="font-sans text-body-md text-outline">
            함께 숲을 가꾸기 위해 로그인이 필요해요.
          </p>
        </header>

        {/* Forest icon */}
        <div className="mb-xl">
          <div className="w-12 h-12 flex items-center justify-center bg-surface-container border border-outline-variant">
            <span className="material-symbols-outlined text-primary text-[32px]">forest</span>
          </div>
        </div>

        {/* Login buttons */}
        <div className="w-full flex flex-col gap-sm mb-xl">
          <button
            onClick={() => handleSignIn('kakao')}
            disabled={loading !== null}
            className="w-full h-12 bg-[#FEE500] flex items-center justify-center border border-[#FEE500] hover:brightness-95 transition-all duration-75 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-sm">
              {loading === 'kakao' ? (
                <span className="material-symbols-outlined text-[20px] text-[#191919] animate-spin">sync</span>
              ) : (
                <span
                  className="material-symbols-outlined text-[20px] text-[#191919]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  chat_bubble
                </span>
              )}
              <span className="font-mono text-label tracking-wider text-[#191919]">
                {loading === 'kakao' ? '연결 중…' : '카카오로 시작하기'}
              </span>
            </div>
          </button>

          <button
            onClick={() => handleSignIn('google')}
            disabled={loading !== null}
            className="w-full h-12 bg-white flex items-center justify-center border border-outline-variant hover:bg-surface-container-low transition-all duration-75 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-sm">
              {loading === 'google' ? (
                <span className="material-symbols-outlined text-[20px] text-on-surface animate-spin">sync</span>
              ) : (
                <span className="material-symbols-outlined text-[20px] text-on-surface">google</span>
              )}
              <span className="font-mono text-label tracking-wider text-on-surface">
                {loading === 'google' ? '연결 중…' : '구글로 시작하기'}
              </span>
            </div>
          </button>
        </div>

        {/* Footer pixel grid decoration */}
        <footer className="mt-xl flex flex-col items-center gap-md">
          <div className="grid grid-cols-3 gap-1">
            <div className="w-2 h-2 bg-primary" />
            <div className="w-2 h-2 bg-primary-container" />
            <div className="w-2 h-2 bg-primary" />
            <div className="w-2 h-2 bg-secondary-container" />
            <div className="w-2 h-2 bg-primary" />
            <div className="w-2 h-2 bg-secondary-container" />
          </div>
          <p className="font-mono text-pixel-stat text-outline-variant uppercase tracking-widest">
            Our Neighborhood Pixel Forest
          </p>
        </footer>
      </div>

      {/* Bottom decorative sprout */}
      <div className="fixed bottom-xl left-1/2 -translate-x-1/2 opacity-20 pointer-events-none">
        <span className="material-symbols-outlined text-primary text-[48px]">potted_plant</span>
      </div>
    </main>
  );
}
