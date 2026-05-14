'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';

type Provider = 'kakao' | 'google';

export function LoginButtons() {
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
  );
}
