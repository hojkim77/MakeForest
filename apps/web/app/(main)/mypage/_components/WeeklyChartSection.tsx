import { WeeklyChartLazy } from './WeeklyChartLazy';
import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';
import type { WeeklyStatsResType } from '@makeforest/types';

export async function WeeklyChartSection({ userId }: { userId: string }) {
  const data = await api.get<WeeklyStatsResType>(API_PATHS.SERVER_STATS_WEEKLY(userId), { next: { revalidate: 3600 } });
  return <WeeklyChartLazy weeklyData={data.weeklyData} weeklyAvg={data.weeklyAvg} />;
}

export function WeeklyChartSkeleton() {
  return (
    <div className="h-64 bg-surface-container border-2 border-outline animate-pulse" />
  );
}
