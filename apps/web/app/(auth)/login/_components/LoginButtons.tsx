'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Button } from '@/shared/components/ui/Button';
import { KakaoButton } from '@/shared/components/ui/KakaoButton';

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
      <KakaoButton
        onClick={() => handleSignIn('kakao')}
        disabled={loading !== null}
        loading={loading === 'kakao'}
        className="h-12"
      >
        {loading === 'kakao' ? '연결 중…' : '카카오로 시작하기'}
      </KakaoButton>

      <Button
        variant="secondary"
        onClick={() => handleSignIn('google')}
        disabled={loading !== null}
        loading={loading === 'google'}
        className="w-full h-12"
      >
        {loading !== 'google' && (
          <img src="/images/google-logo.svg" alt="" width={20} height={20} />
        )}
        <span className="font-mono text-label tracking-wider text-on-surface">
          {loading === 'google' ? '연결 중…' : '구글로 시작하기'}
        </span>
      </Button>
    </div>
  );
}
