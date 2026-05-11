import { WeeklyChart } from './WeeklyChart';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000';

interface WeeklyStats {
  weeklyData: { week: number; waterCount: number }[];
  weeklyAvg: number;
}

export async function WeeklyChartSection({ userId }: { userId: string }) {
  const data = await fetch(`${SERVER_URL}/stats/weekly?userId=${userId}`, { cache: 'no-store' }).then(r => r.json()) as WeeklyStats;

  return <WeeklyChart weeklyData={data.weeklyData} weeklyAvg={data.weeklyAvg} />;
}

export function WeeklyChartSkeleton() {
  return (
    <div className="h-64 bg-surface-container border border-outline-variant animate-pulse" />
  );
}
