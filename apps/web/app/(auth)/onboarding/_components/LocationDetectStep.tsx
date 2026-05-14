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
        <div className="w-full max-w-md bg-[#F5F3EF] border border-[#E8E4DC] p-xl flex flex-col gap-lg">
          <div className="flex flex-col gap-xs">
            <span className="font-mono text-label text-primary uppercase">Current Detection</span>
            <h2 className="font-mono text-[28px] font-bold text-on-surface leading-none tracking-tighter">
              {detectedDong.name}
            </h2>
          </div>
          <div className="h-20 w-full bg-surface border border-[#E8E4DC] relative overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 pixel-grid opacity-40" />
            <span className="relative z-10 material-symbols-outlined text-primary text-[36px]"
              style={{ fontVariationSettings: "'FILL' 1" }}>
              location_on
            </span>
          </div>
        </div>
      )}

      {/* Detecting skeleton */}
      {status === 'detecting' && (
        <div className="w-full max-w-md bg-[#F5F3EF] border border-[#E8E4DC] p-xl flex flex-col gap-lg animate-pulse">
          <div className="h-4 bg-outline-variant w-24 rounded" />
          <div className="h-8 bg-outline-variant w-48 rounded" />
          <div className="h-20 bg-surface-container border border-[#E8E4DC]" />
        </div>
      )}

      {/* Actions */}
      <div className="w-full max-w-md flex flex-col gap-sm">
        {status === 'found' && (
          <button
            onClick={onConfirm}
            className="w-full h-14 bg-[#3D7A5A] text-white font-mono text-label tracking-wider border border-[#3D7A5A] hover:bg-[#2C6A4B] transition-colors flex items-center justify-center gap-sm"
          >
            네, 맞아요
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
          </button>
        )}

        <button
          onClick={onSearchManually}
          disabled={status === 'detecting'}
          className={[
            'w-full h-14 font-mono text-label tracking-wider border transition-colors flex items-center justify-center gap-sm',
            status === 'detecting'
              ? 'bg-surface-container text-outline border-outline-variant cursor-not-allowed'
              : 'bg-transparent text-outline border-[#E8E4DC] hover:bg-[#E8E4DC]',
          ].join(' ')}
        >
          직접 검색하기
          <span className="material-symbols-outlined text-[18px]">search</span>
        </button>
      </div>
    </div>
  );
}
