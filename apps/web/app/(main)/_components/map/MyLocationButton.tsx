'use client';

import { Icon } from '@/shared/components/ui/Icon';

interface MyLocationButtonProps {
  onReset: () => void;
  isForest: boolean;
  onGoHome?: () => void;
}

export function MyLocationButton({ onReset, isForest, onGoHome }: MyLocationButtonProps) {
  const handleClick = isForest ? onReset : (onGoHome ?? onReset);
  return (
    <button
      data-guide="map.modeToggle"
      onClick={handleClick}
      className="absolute bottom-4 right-4 z-map-ui flex h-10 w-10 items-center justify-center bg-surface border border-outline-variant hover:bg-surface-container-high active:scale-95 transition-transform"
      title={isForest ? '전체 보기로 돌아가기' : onGoHome ? '내 지역 숲으로' : '전체 보기'}
    >
      <Icon name={isForest ? 'arrow_back' : 'location_on'} filled size={20} className="text-primary" />
    </button>
  );
}
