import { WeeklyChartLazy } from './WeeklyChartLazy';
import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';

interface WeeklyStats {
  weeklyData: { week: number; waterCount: number }[];
  weeklyAvg: number;
}

export async function WeeklyChartSection({ userId }: { userId: string }) {
  const data = await api.get<WeeklyStats>(API_PATHS.SERVER_STATS_WEEKLY(userId), { cache: 'no-store' });
  return <WeeklyChartLazy weeklyData={data.weeklyData} weeklyAvg={data.weeklyAvg} />;
}

export function WeeklyChartSkeleton() {
  return (
    <div className="h-64 bg-surface-container border border-outline-variant animate-pulse" />
  );
}
