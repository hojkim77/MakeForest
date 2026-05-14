'use client';

import Link from 'next/link';

export function LoginPrompt() {
  return (
    <div className="flex flex-col gap-md p-lg border border-outline-variant bg-surface-container-low">
      <p className="font-sans text-body-md text-on-surface-variant leading-relaxed">
        로그인하면 타이머를 켜고<br />우리 동네 숲에 기여할 수 있어요.
      </p>

      <Link
        href="/login"
        className="w-full h-10 bg-primary text-on-primary font-mono text-label tracking-wider flex items-center justify-center gap-xs hover:bg-primary/90 transition-colors active:scale-[0.98]"
      >
        <span className="material-symbols-outlined text-[16px]">login</span>
        로그인하기
      </Link>
    </div>
  );
}
