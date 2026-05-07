'use client';

import { useState, useMemo } from 'react';
import type { MapUser } from '@makeforest/types';
import { CreatureSprite } from '@/components/panel/CreatureSprite';

interface UserOverlayProps {
  users: MapUser[];
  mapW: number;
  mapH: number;
}

// 모든 상태에 기본 투명도 적용 (겹쳐도 아래가 보임)
const STATUS_OPACITY: Record<string, number> = {
  RUNNING: 0.75,
  PAUSED: 0.5,
  IDLE: 0.25,
};

const SPRITE_SIZE = 2;   // 원래 24px의 1/12
const JITTER_RADIUS = 2; // 원래 14px의 1/7 (2px 단위 이격)

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
      jx = Math.round(Math.cos(angle) * JITTER_RADIUS);
      jy = Math.round(Math.sin(angle) * JITTER_RADIUS);
    }

    return { user, baseLeft, baseTop, jx, jy };
  });
}

interface PopoverProps {
  user: MapUser;
}

function UserPopover({ user }: PopoverProps) {
  const visibleTodos = user.todos.filter((t) => !t.done);
  return (
    <div
      className="absolute bottom-full left-1/2 mb-0.5 w-max max-w-32 rounded border border-white/20 bg-black/85 px-1.5 py-1 text-[8px] leading-tight text-white shadow-lg"
      style={{ transform: 'translateX(-50%)' }}
    >
      <p className="font-bold text-[9px]">{user.nickname}</p>
      {user.sessionStatus !== 'IDLE' && (
        <p className="text-green-400 text-[8px]">
          {user.sessionStatus === 'RUNNING' ? '집중 중' : '일시정지'}
        </p>
      )}
      {user.waterCount > 0 && (
        <p className="text-blue-300">💧×{user.waterCount}</p>
      )}
      {visibleTodos.length > 0 && (
        <ul className="mt-0.5 space-y-px">
          {visibleTodos.slice(0, 2).map((t, i) => (
            <li key={i} className="truncate text-white/70">
              · {t.text}
            </li>
          ))}
          {visibleTodos.length > 2 && (
            <li className="text-white/40">+{visibleTodos.length - 2}개</li>
          )}
        </ul>
      )}
    </div>
  );
}

export function UserOverlay({ users, mapW, mapH }: UserOverlayProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const positioned = useMemo(
    () => jitteredPositions(users, mapW, mapH),
    [users, mapW, mapH],
  );

  return (
    <div className="pointer-events-none absolute inset-0">
      {positioned.map(({ user, baseLeft, baseTop, jx, jy }) => {
        const opacity = STATUS_OPACITY[user.sessionStatus] ?? 0.25;
        const stage = Math.min(4, Math.max(0, user.creatureStage)) as 0 | 1 | 2 | 3 | 4;
        const isHovered = hoveredId === user.userId;

        return (
          <div
            key={user.userId}
            className="pointer-events-auto absolute"
            style={{
              left: `${baseLeft}%`,
              top: `${baseTop}%`,
              transform: `translate(calc(-50% + ${jx}px), calc(-50% + ${jy}px))`,
              opacity,
            }}
            onMouseEnter={() => setHoveredId(user.userId)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <div className="relative flex flex-col items-center">
              {isHovered && <UserPopover user={user} />}
              <CreatureSprite stage={stage} size={SPRITE_SIZE} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
