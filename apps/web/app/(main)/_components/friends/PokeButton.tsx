'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@/shared/components/ui/Icon';
import { usePokeMutation } from '@/shared/hooks/mutations/usePokeMutation';
import { toast } from '@/shared/lib/toast';

interface PokeButtonProps {
  targetUserId: string;
  myUserId: string;
  myPoints: number;
  pokeCooldownEndsAt: string | null;
}

function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const mm = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const ss = (totalSec % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

export function PokeButton({ targetUserId, myUserId, myPoints, pokeCooldownEndsAt }: PokeButtonProps) {
  const { mutate, isPending } = usePokeMutation();
  const [countdown, setCountdown] = useState<string | null>(null);

  const cooldownEndsMs = pokeCooldownEndsAt ? new Date(pokeCooldownEndsAt).getTime() : null;

  useEffect(() => {
    if (!cooldownEndsMs) {
      setCountdown(null);
      return;
    }
    const diff = cooldownEndsMs - Date.now();
    if (diff <= 0) {
      setCountdown(null);
      return;
    }
    setCountdown(formatCountdown(diff));
    const timer = setInterval(() => {
      const remaining = cooldownEndsMs - Date.now();
      if (remaining <= 0) {
        setCountdown(null);
        clearInterval(timer);
      } else {
        setCountdown(formatCountdown(remaining));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownEndsMs]);

  const isOnCooldown = countdown !== null;
  const hasEnoughPoints = myPoints >= 2;
  const isDisabled = isPending || isOnCooldown || !hasEnoughPoints;

  function handleClick() {
    if (isOnCooldown) return;
    if (!hasEnoughPoints) {
      toast.error('포인트가 부족합니다. (2pt 필요)');
      return;
    }
    mutate({ toUserId: targetUserId, userId: myUserId });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      className={[
        'p-1 transition-none',
        isDisabled
          ? 'text-on-surface-variant opacity-40 cursor-not-allowed'
          : 'text-primary-container hover:bg-surface-container-high',
      ].join(' ')}
      aria-label="찌르기"
      title={isOnCooldown ? '쿨다운 중' : !hasEnoughPoints ? '포인트 부족' : '찌르기 (-2pt)'}
    >
      {isOnCooldown ? (
        <span className="font-mono text-[10px]">{countdown}</span>
      ) : (
        <Icon name="touch_app" size={18} />
      )}
    </button>
  );
}
