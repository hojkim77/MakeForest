'use client';

import type { MissionProgress } from '@makeforest/types';
import { useMissionQuery } from '@/shared/hooks/queries/useMissionQuery';
import { ProgressBar } from '@/shared/components/ui/ProgressBar';

interface Props {
  dongCode: string | null;
  regionCode: string | null;
  initialMission: MissionProgress | null;
}

export function DailyMissionCard({ dongCode, regionCode, initialMission }: Props) {
  const { data: mission } = useMissionQuery({ regionCode, initialData: initialMission });

  if (!dongCode || !mission) return null;

  if (mission.isCompleted) {
    return <CompletedState count={mission.targetCount} />;
  }

  const pct = Math.min(100, Math.round((mission.currentCount / mission.targetCount) * 100));

  return <ActiveState currentCount={mission.currentCount} targetCount={mission.targetCount} pct={pct} />;
}

function ActiveState({ currentCount, targetCount, pct }: { currentCount: number; targetCount: number; pct: number }) {
  return (
    <div className="flex flex-col gap-md">
      <div className="flex flex-col gap-xs">
        <span className="font-mono text-pixel-stat text-on-surface">오늘의 공통 미션</span>
        <span className="font-sans text-label text-on-surface-variant">이웃들과 함께 집중을 시작하면 달성돼요</span>
      </div>

      <div className="flex flex-col gap-xs">
        <ProgressBar value={pct} size="md" />
        <span className="font-mono text-label text-on-surface-variant" data-testid="mission-progress">
          {currentCount}명 참여 중 / 목표 {targetCount}명
        </span>
      </div>

      <div className="border-2 border-outline shadow-island p-sm flex flex-col gap-xs bg-surface-container">
        <span className="font-mono text-pixel-stat text-primary">집중 보너스 +60분</span>
        <span className="font-sans text-label text-on-surface-variant">미션 달성 시 활성 유저에게 지급</span>
      </div>
    </div>
  );
}

function CompletedState({ count }: { count: number }) {
  return (
    <div className="flex flex-col items-center gap-sm text-center">
      <span className="font-mono text-pixel-stat text-primary">🎉 오늘의 미션 달성!</span>
      <span className="font-mono text-label text-on-surface-variant">집중 보너스 60분이 지급됐어요</span>
      <span className="font-mono text-label text-on-surface-variant">{count}명이 함께 달성했어요</span>
    </div>
  );
}
