'use client';

import { Button } from '@/shared/components/ui/Button';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function MainError({ error, reset }: ErrorProps) {
  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col items-center justify-center gap-md font-mono">
      <span className="text-heading text-on-background-variant">오류가 발생했어요</span>
      {process.env.NODE_ENV === 'development' && (
        <pre className="text-label text-error bg-error-container px-md py-sm max-w-lg overflow-auto">
          {error.message}
        </pre>
      )}
      <div className="flex gap-sm">
        <Button variant="ghost" onClick={reset}>다시 시도</Button>
        <Button variant="secondary" href="/">홈으로</Button>
      </div>
    </div>
  );
}
