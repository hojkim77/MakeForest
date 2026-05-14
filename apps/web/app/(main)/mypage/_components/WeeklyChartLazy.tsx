'use client';

import dynamic from 'next/dynamic';

const WeeklyChart = dynamic(() => import('./WeeklyChart').then(m => m.WeeklyChart), { ssr: false });

interface Props {
  weeklyData: { week: number; waterCount: number }[];
  weeklyAvg: number;
}

export function WeeklyChartLazy(props: Props) {
  return <WeeklyChart {...props} />;
}
