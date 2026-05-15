'use client';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col items-center justify-center gap-md font-mono">
      <span className="text-heading text-on-background-variant">오류가 발생했어요</span>
      {process.env.NODE_ENV === 'development' && (
        <pre className="text-label text-error bg-error-container px-md py-sm max-w-lg overflow-auto">
          {error.message}
        </pre>
      )}
      <button
        onClick={reset}
        className="px-md py-sm border border-outline text-label hover:bg-surface-variant"
      >
        다시 시도
      </button>
    </div>
  );
}
