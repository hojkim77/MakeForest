'use client';

import { useWaterQuery, type WaterQueryData } from '@/shared/hooks/queries/useWaterQuery';
import { CreatureSprite, STAGE_LABELS } from '@/shared/components/ui/CreatureSprite';
import { Card } from '@/shared/components/ui/Card';
import { useSessionDraftStore } from '@/shared/store/sessionDraftStore';
import { useTodaySessionQuery } from '@/shared/hooks/queries/useTodaySessionQuery';
import { PixelBubble } from './PixelBubble';

interface Props {
  userId: string | null;
  initialWater: WaterQueryData;
}

export function CreatureSection({ userId, initialWater }: Props) {
  const { creatureStage } = useWaterQuery({ userId, initialData: initialWater });
  const stage = Math.min(creatureStage, 9) as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

  const goal = useSessionDraftStore((s) => s.goal);
  const setGoal = useSessionDraftStore((s) => s.setGoal);

  const { data: todayState } = useTodaySessionQuery({ userId, initialData: undefined });
  const sessionStatus = todayState?.sessionStatus ?? 'NONE';
  const isSession = sessionStatus !== 'NONE';
  const bounce = !isSession;

  const bubbleGoal = isSession ? (todayState?.todayGoal ?? goal) : goal;

  async function handleBubbleSubmit(text: string) {
    setGoal(text);
  }

  return (
    <div className="flex flex-col items-center gap-xs pt-sm pb-lg">
      <PixelBubble
        value={bubbleGoal}
        locked={isSession}
        bounce={bounce}
        onSubmit={handleBubbleSubmit}
      />
      <Card variant="high" border data-guide="creature.stage" className="relative flex flex-col items-center justify-center image-pixelated">
        <CreatureSprite stage={stage} size={128} />
        <span className="mt-xs font-mono text-label text-outline uppercase tracking-wider">
          {STAGE_LABELS[stage]} · Lv.{stage + 1}
        </span>
      </Card>
    </div>
  );
}
