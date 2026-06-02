import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';

export type DetectStatus = 'detecting' | 'found' | 'failed' | 'denied';

interface LocationDetectStepProps {
  status: DetectStatus;
  detectedDong?: { code: string; name: string } | undefined;
  onConfirm: () => void;
  onSearchManually: () => void;
}

export function LocationDetectStep({
  status,
  detectedDong,
  onConfirm,
  onSearchManually,
}: LocationDetectStepProps) {
  return (
    <div className="w-full flex flex-col items-center text-center gap-xl">
      {/* Pixel pin icon */}
      <div className="relative w-24 h-24 flex items-center justify-center">
        <div className="absolute inset-0 pixel-grid opacity-30 border border-outline-variant rounded-full" />
        <div className="relative flex flex-col items-center">
          <div
            className={[
              'w-8 h-8 border-2 border-on-primary-fixed-variant flex items-center justify-center transition-colors',
              status === 'detecting' ? 'bg-outline animate-pulse' : status === 'denied' ? 'bg-error' : 'bg-primary',
            ].join(' ')}
          >
            <div className="w-2 h-2 bg-white" />
          </div>
          <div
            className={[
              'w-2 h-4 border-x-2 border-on-primary-fixed-variant',
              status === 'detecting' ? 'bg-outline animate-pulse' : status === 'denied' ? 'bg-error' : 'bg-primary',
            ].join(' ')}
          />
          <div className="w-4 h-1 bg-on-surface-variant/20 mt-1" />
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-sm">
        <h1 className="font-mono text-display text-on-surface uppercase tracking-tight">
          {status === 'detecting' && '동네를 확인하고 있어요.'}
          {status === 'found' && `${detectedDong?.name} 이 맞나요?`}
          {status === 'failed' && 'GPS 신호를 찾지 못했어요.'}
          {status === 'denied' && '위치 권한이 거부되어 있어요.'}
        </h1>
        <p className="font-sans text-body-md text-on-surface-variant">
          {status === 'detecting' && 'GPS 신호를 수신 중입니다…'}
          {status === 'found' && '감지된 위치를 확인해주세요.'}
          {status === 'failed' && '직접 동네를 검색해서 설정할 수 있어요.'}
          {status === 'denied' && '브라우저 설정에서 위치 권한을 허용한 뒤 새로고침 해주세요.'}
        </p>
      </div>

      {/* Location card — only shown when found */}
      {status === 'found' && detectedDong && (
        <Card variant="low" border padding="lg" className="w-full max-w-md flex flex-col gap-lg">
          <div className="flex flex-col gap-xs">
            <span className="font-mono text-label text-primary uppercase">Current Detection</span>
            <h2 className="font-mono text-[28px] font-bold text-on-surface leading-none tracking-tighter">
              {detectedDong.name}
            </h2>
          </div>
          <div className="h-20 w-full bg-surface border border-border-subtle relative overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 pixel-grid opacity-40" />
            <span className="relative z-10 material-symbols-outlined text-primary text-[36px]"
              style={{ fontVariationSettings: "'FILL' 1" }}>
              location_on
            </span>
          </div>
        </Card>
      )}

      {/* Detecting skeleton */}
      {status === 'detecting' && (
        <Card variant="low" border padding="lg" className="w-full max-w-md flex flex-col gap-lg animate-pulse">
          <div className="h-4 bg-outline-variant w-24 rounded" />
          <div className="h-8 bg-outline-variant w-48 rounded" />
          <div className="h-20 bg-surface-container border border-border-subtle" />
        </Card>
      )}

      {/* Actions */}
      <div className="w-full max-w-md flex flex-col gap-sm">
        {status === 'found' && (
          <Button iconAfter="check_circle" className="w-full" onClick={onConfirm}>
            네, 맞아요
          </Button>
        )}

        <Button
          variant="ghost"
          disabled={status === 'detecting'}
          iconAfter="search"
          className="w-full"
          onClick={onSearchManually}
        >
          직접 검색하기
        </Button>
      </div>
    </div>
  );
}
