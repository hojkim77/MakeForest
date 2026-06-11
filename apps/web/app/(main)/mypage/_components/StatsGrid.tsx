import { formatDuration } from '@/shared/utils/format';
import { Card } from '@/shared/components/ui/Card';
import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';
import type { FocusStatsResType, RankStatsResType } from '@makeforest/types';


export async function StatsGrid({ userId, dongCode }: { userId: string; dongCode?: string | undefined }) {
  const rankParams = new URLSearchParams({ userId });
  if (dongCode) rankParams.set('dongCode', dongCode);

  const [focus, rank] = await Promise.all([
    api.get<FocusStatsResType>(API_PATHS.SERVER_STATS_FOCUS(userId), { next: { tags: ['user-stats', `user-stats-${userId}`], revalidate: 3600 } }),
    api.get<RankStatsResType>(API_PATHS.SERVER_STATS_RANK(rankParams.toString()), { next: { tags: ['user-stats', `user-stats-${userId}`], revalidate: 3600 } }),
  ]);

  const cards = [
    {
      label: 'Focus Time',
      value: formatDuration(focus.totalFocusSec),
      sub: '누적 집중 시간',
    },
    {
      label: 'Current Streak',
      value: `${focus.currentStreak} Days`,
      sub: '연속 기여 중',
    },
    {
      label: 'Max Streak',
      value: `${focus.maxStreak} Days`,
      sub: '역대 최장 스트릭',
    },
    {
      label: 'Neighborhood Rank',
      value: rank.neighborhoodRank > 0 ? `#${rank.neighborhoodRank}` : '—',
      sub: rank.neighborhoodTotal > 0 ? `${rank.neighborhoodTotal}명 중` : '동네 미설정',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map(({ label, value, sub }) => (
        <Card key={label} border className="flex flex-col justify-between min-h-[96px]">
          <span className="font-label-mono text-on-surface-variant uppercase text-[11px]">{label}</span>
          <div>
            <div className="font-pixel-stat text-2xl text-primary">{value}</div>
            <div className="font-label-mono text-[10px] text-on-surface-variant">{sub}</div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function StatsGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="h-24 bg-surface-container border-2 border-outline animate-pulse" />
      ))}
    </div>
  );
}
