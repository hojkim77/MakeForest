import { Icon } from './Icon';
import { cn } from '@/shared/lib/cn';
import React from 'react';

interface KakaoButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

const baseClasses =
  'w-full inline-flex items-center justify-center gap-sm bg-kakao-bg text-kakao-fg border border-kakao-bg font-mono text-label tracking-wider hover:brightness-95 transition-all duration-75 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed rounded';

export const KakaoButton = React.forwardRef<HTMLButtonElement, KakaoButtonProps>(
  function KakaoButton({ loading = false, disabled, className, children, type = 'button', ...rest }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={loading || disabled}
        className={cn(baseClasses, className)}
        {...rest}
      >
        {loading ? (
          <Icon name="sync" size={20} className="animate-spin text-kakao-fg" />
        ) : (
          <img src="/images/kakao-logo.svg" alt="" width={20} height={20} />
        )}
        {children}
      </button>
    );
  },
);
