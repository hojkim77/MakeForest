import { create } from 'zustand';
import { getKstDateString } from '@/shared/utils/date';

interface KstDateState {
  kstDate: string;
}

function msUntilKstMidnight(): number {
  const now = new Date();
  const kstNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const kstMidnight = new Date(kstNow);
  kstMidnight.setHours(24, 0, 0, 0);
  return kstMidnight.getTime() - kstNow.getTime();
}

function scheduleRollover(update: () => void): void {
  const ms = msUntilKstMidnight();
  setTimeout(() => {
    update();
    scheduleRollover(update);
  }, ms);
}

export const useKstDateStore = create<KstDateState>(() => ({
  kstDate: getKstDateString(),
}));

if (typeof window !== 'undefined') {
  scheduleRollover(() => {
    useKstDateStore.setState({ kstDate: getKstDateString() });
  });
}
