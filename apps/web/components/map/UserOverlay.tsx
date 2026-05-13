'use client';

import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { MapUser } from '@makeforest/types';
import { CreatureSprite } from '@/components/panel/CreatureSprite';

interface UserOverlayProps {
  users: MapUser[];
  mapW: number;
  mapH: number;
}

const STATUS_OPACITY: Record<string, number> = {
  RUNNING: 0.75,
  COMPLETE: 0.5,
  IDLE: 0.25,
};

const SPRITE_SIZE = 2;    // 시각적 크기 (px)
const HIT_SIZE = 1;       // 호버 hit area (px) — div 크기
const JITTER_RADIUS = 0.5; // 같은 동 유저 이격 (hit area 절반 — 2명은 비겹침 보장)

function jitteredPositions(users: MapUser[], mapW: number, mapH: number) {
  const grouped = new Map<string, MapUser[]>();
  for (const u of users) {
    if (!grouped.has(u.dongCode)) grouped.set(u.dongCode, []);
    grouped.get(u.dongCode)!.push(u);
  }

  return users.map((user) => {
    const group = grouped.get(user.dongCode)!;
    const idx = group.indexOf(user);
    const count = group.length;

    const baseLeft = (user.pixelX / mapW) * 100;
    const baseTop = (user.pixelY / mapH) * 100;

    let jx = 0;
    let jy = 0;
    if (count > 1) {
      const angle = (2 * Math.PI * idx) / count;
      jx = Math.cos(angle) * JITTER_RADIUS;
      jy = Math.sin(angle) * JITTER_RADIUS;
    }

    return { user, baseLeft, baseTop, jx, jy };
  });
}

interface HoverState {
  user: MapUser;
  screenX: number;
  screenY: number;
}

export function UserOverlay({ users, mapW, mapH }: UserOverlayProps) {
  const [hovered, setHovered] = useState<HoverState | null>(null);

  const positioned = useMemo(
    () => jitteredPositions(users, mapW, mapH),
    [users, mapW, mapH],
  );

  return (
    <div className="pointer-events-none absolute inset-0">
      {positioned.map(({ user, baseLeft, baseTop, jx, jy }) => {
        const opacity = STATUS_OPACITY[user.sessionStatus] ?? 0.25;
        const stage = Math.min(9, Math.max(0, user.creatureStage)) as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

        return (
          <div
            key={user.userId}
            className="pointer-events-auto absolute"
            style={{
              left: `${baseLeft}%`,
              top: `${baseTop}%`,
              transform: `translate(calc(-50% + ${jx}px), calc(-50% + ${jy}px))`,
              opacity,
              width: HIT_SIZE,
              height: HIT_SIZE,
              overflow: 'visible',
            }}
            onMouseEnter={(e) => {
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              setHovered({ user, screenX: rect.left + rect.width / 2, screenY: rect.top + rect.height / 2 });
            }}
            onMouseLeave={() => setHovered(null)}
          >
            <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}>
              <CreatureSprite stage={stage} size={SPRITE_SIZE} />
            </div>
          </div>
        );
      })}

      {/* 팝오버: transform 밖에 렌더링해 scale 영향 없음 */}
      {hovered && typeof document !== 'undefined' && createPortal(
        <div
          className="pointer-events-none fixed z-[9999] w-max max-w-[140px] border border-white/20 bg-black/85 px-2 py-1.5 text-[11px] leading-snug text-white shadow-lg"
          style={{ left: hovered.screenX, top: hovered.screenY + 6, transform: 'translateX(-50%)' }}
        >
          {/* 닉네임 + 동네 순위 */}
          <div className="flex items-baseline gap-1.5">
            <p className="font-bold">{hovered.user.nickname}</p>
            <p className="text-[10px] text-yellow-300">#{hovered.user.neighborhoodRank}위</p>
          </div>

          {/* 세션 상태 */}
          {hovered.user.sessionStatus === 'RUNNING' && (
            <p className="text-green-400 text-[10px]">집중 중</p>
          )}

          {/* 오늘 물주기 횟수 */}
          <p className="text-blue-300 text-[10px]">
            💧 {hovered.user.todayWaterCount}/12회
          </p>

          {/* 오늘의 할일 */}
          {hovered.user.todos.length > 0 && (
            <div className="mt-1 border-t border-white/10 pt-1 space-y-px">
              {hovered.user.todos.filter((t) => !t.done).slice(0, 3).map((t, i) => (
                <p key={i} className="truncate text-white/70 text-[10px]">· {t.text}</p>
              ))}
              {hovered.user.todos.filter((t) => !t.done).length > 3 && (
                <p className="text-white/40 text-[10px]">+{hovered.user.todos.filter((t) => !t.done).length - 3}개</p>
              )}
            </div>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}
