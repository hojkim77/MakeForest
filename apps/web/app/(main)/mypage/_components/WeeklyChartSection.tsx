'use client';

import { useWeeklyStatsQuery } from '@/shared/hooks/queries/useWeeklyStatsQuery';
import { WeeklyChartLazy } from './WeeklyChartLazy';
import type { WeeklyStatsResType } from '@makeforest/types';

interface Props {
  userId: string;
  initialData: WeeklyStatsResType;
}

export function WeeklyChartSection({ userId, initialData }: Props) {
  const { data = initialData } = useWeeklyStatsQuery({ userId, initialData });
  return <WeeklyChartLazy weeklyData={data.weeklyData} weeklyAvg={data.weeklyAvg} />;
}

export function WeeklyChartSkeleton() {
  return (
    <div className="h-64 bg-surface-container border-2 border-outline animate-pulse" />
  );
}
