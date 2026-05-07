'use client';

import { useState, useMemo } from 'react';
import type { MapUser } from '@makeforest/types';
import { CreatureSprite } from '@/components/panel/CreatureSprite';

interface UserOverlayProps {
  users: MapUser[];
  mapW: number;
  mapH: number;
}

const STATUS_OPACITY: Record<string, number> = {
  RUNNING: 1.0,
  PAUSED: 0.6,
  IDLE: 0.3,
};

// Circular jitter for same-dong users
function jitteredPositions(users: MapUser[], mapW: number, mapH: number) {
  const grouped = new Map<string, MapUser[]>();
  for (const u of users) {
    const key = u.dongCode;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(u);
  }

  return users.map((user) => {
    const group = grouped.get(user.dongCode)!;
    const idx = group.indexOf(user);
    const count = group.length;

    // base position as percentage of canvas
    const baseLeft = (user.pixelX / mapW) * 100;
    const baseTop = (user.pixelY / mapH) * 100;

    // circular jitter in px (CSS) when multiple users in same dong
    let jx = 0;
    let jy = 0;
    if (count > 1) {
      const angle = (2 * Math.PI * idx) / count;
      const radius = 14;
      jx = Math.round(Math.cos(angle) * radius);
      jy = Math.round(Math.sin(angle) * radius);
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
      className="absolute bottom-full left-1/2 mb-1 w-max max-w-48 rounded-lg border border-white/20 bg-black/80 p-2 text-xs text-white shadow-lg"
      style={{ transform: 'translateX(-50%)' }}
    >
      <p className="font-bold">{user.nickname}</p>
      {user.sessionStatus !== 'IDLE' && (
        <p className="text-green-300">
          {user.sessionStatus === 'RUNNING' ? '집중 중' : '일시정지'}
        </p>
      )}
      {visibleTodos.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {visibleTodos.slice(0, 3).map((t, i) => (
            <li key={i} className="truncate text-white/80">
              · {t.text}
            </li>
          ))}
          {visibleTodos.length > 3 && (
            <li className="text-white/50">+{visibleTodos.length - 3}개 더</li>
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
        const opacity = STATUS_OPACITY[user.sessionStatus] ?? 0.3;
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

              {/* Water badge */}
              {user.waterCount > 0 && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px]">
                  {'💧'.repeat(Math.min(user.waterCount, 5))}
                </div>
              )}

              <CreatureSprite stage={stage} size={24} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
