import { auth } from '@/auth';
import { prisma } from '@makeforest/db';
import { WaterStoreInitializer } from './WaterStoreInitializer';
import { PeekingBanner } from './PeekingBanner';
import { SloganSection } from './SloganSection';
import { CreatureSection } from './CreatureSection';
import { TimerWaterSection } from './TimerWaterSection';
import { TaskList } from './TaskList';
import { NeighborhoodStats } from './NeighborhoodStats';
import { WaterToast } from './WaterToast';
import { LoginPrompt } from './LoginPrompt';

function getKstDateString(): string {
  return new Date().toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\. /g, '-').replace(/\.$/, '');
}

export async function Panel() {
  const session = await auth();
  const isLoggedIn = !!session?.user?.id;
  const myRegionCode = session?.user?.regionCode ?? null;

  let initialWater = { waterCount: 0, creatureStage: 0, growthPercent: 0 };
  if (isLoggedIn && session?.user?.id) {
    const today = getKstDateString();
    const [focusSession, creature] = await Promise.all([
      prisma.focusSession.findUnique({
        where: { userId_date: { userId: session.user.id, date: today } },
        select: { waterCount: true },
      }),
      prisma.userCreature.findUnique({
        where: { userId: session.user.id },
        select: { stage: true, waterCount: true },
      }),
    ]);
    const wc = focusSession?.waterCount ?? 0;
    initialWater = {
      waterCount: wc,
      creatureStage: creature?.stage ?? 0,
      growthPercent: Math.min(Math.round((wc / 12) * 100), 100),
    };
  }

  return (
    <aside className="w-[420px] flex-shrink-0 bg-surface-container border-r border-outline-variant flex flex-col h-full overflow-y-auto">
      <div className="flex flex-col gap-xl p-lg flex-1">
        <WaterStoreInitializer {...initialWater} />
        <PeekingBanner myRegionCode={myRegionCode} />
        <SloganSection myRegionCode={myRegionCode} />
        <WaterToast myRegionCode={myRegionCode} />

        {isLoggedIn && <CreatureSection />}
        {isLoggedIn && <NeighborhoodStats myRegionCode={myRegionCode} />}

        {isLoggedIn ? (
          <>
            <TimerWaterSection myRegionCode={myRegionCode} />
            <TaskList myRegionCode={myRegionCode} />
          </>
        ) : (
          <LoginPrompt />
        )}
      </div>
    </aside>
  );
}
