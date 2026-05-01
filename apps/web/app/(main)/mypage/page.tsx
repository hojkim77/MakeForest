'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { CreatureSprite } from '@/components/panel/CreatureSprite';

interface StatsData {
  totalFocusSec: number;
  currentStreak: number;
  maxStreak: number;
  neighborhoodRank: number;
  neighborhoodTotal: number;
  weeklyData: { week: number; waterCount: number }[];
  weeklyAvg: number;
  collection: { seed: number; sprout: number; grass: number; tree: number };
  dongName: string | null;
}

interface UserData {
  nickname: string;
  avatarUrl: string | null;
  dongCode: string | null;
  createdAt: string;
}

function formatFocusTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatJoinDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    timeZone: 'Asia/Seoul',
  });
}

const COLLECTION_ITEMS = [
  { key: 'seed' as const, label: '씨앗', stage: 0 as const, highlight: false },
  { key: 'sprout' as const, label: '새싹', stage: 1 as const, highlight: false },
  { key: 'grass' as const, label: '풀', stage: 2 as const, highlight: false },
  { key: 'tree' as const, label: '나무', stage: 3 as const, highlight: true },
];

export default function MypagePage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) return;

    Promise.all([
      fetch('/api/user/me').then(r => r.json()) as Promise<UserData>,
      fetch('/api/stats/me').then(r => r.json()) as Promise<StatsData>,
    ]).then(([userData, statsData]) => {
      setUser(userData);
      setStats(statsData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [session?.user?.id]);

  if (!session) {
    return (
      <main className="max-w-[1000px] mx-auto py-16 px-6 text-center">
        <p className="font-label-mono text-on-surface-variant">로그인이 필요합니다.</p>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="max-w-[1000px] mx-auto py-16 px-6">
        <div className="space-y-4 animate-pulse">
          <div className="h-28 bg-surface-container border border-outline-variant" />
          <div className="grid grid-cols-4 gap-4">
            {[0, 1, 2, 3].map(i => <div key={i} className="h-24 bg-surface-container border border-outline-variant" />)}
          </div>
          <div className="h-64 bg-surface-container border border-outline-variant" />
          <div className="h-64 bg-surface-container border border-outline-variant" />
        </div>
      </main>
    );
  }

  const maxWeeklyWater = Math.max(...(stats?.weeklyData.map(w => w.waterCount) ?? [1]), 1);

  return (
    <main className="max-w-[1000px] mx-auto py-8 px-6 space-y-6">

      {/* Profile Header */}
      <section className="bg-surface-container p-6 border border-outline-variant">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="text-4xl bg-surface-container-highest p-3 border border-outline-variant">
              {user?.avatarUrl
                ? <img src={user.avatarUrl} alt="avatar" className="w-10 h-10 rounded-full" />
                : '🌿'
              }
            </div>
            <div>
              <h1 className="font-h1 text-on-surface">{user?.nickname ?? session.user?.name ?? '—'}</h1>
              <div className="flex flex-wrap gap-4 mt-1 font-label-mono text-on-surface-variant text-[12px]">
                {stats?.dongName && (
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">location_on</span>
                    {stats.dongName}
                  </span>
                )}
                {user?.createdAt && (
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                    {formatJoinDate(user.createdAt)} 가입
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <span className="px-2 py-1 bg-primary-container text-on-primary-container font-label-mono border border-primary-container text-[12px]">
              SEEDLING
            </span>
            {stats && stats.neighborhoodTotal > 0 && (
              <span className="px-2 py-1 bg-surface-container-highest text-on-surface-variant font-label-mono border border-outline-variant text-[12px]">
                TOP {Math.round((stats.neighborhoodRank / stats.neighborhoodTotal) * 100)}%
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-container p-4 border border-outline-variant flex flex-col justify-between min-h-[96px]">
          <span className="font-label-mono text-on-surface-variant uppercase text-[11px]">Focus Time</span>
          <div>
            <div className="font-pixel-stat text-2xl text-primary">
              {stats ? formatFocusTime(stats.totalFocusSec) : '—'}
            </div>
            <div className="font-label-mono text-[10px] text-on-surface-variant">누적 집중 시간</div>
          </div>
        </div>

        <div className="bg-surface-container p-4 border border-outline-variant flex flex-col justify-between min-h-[96px]">
          <span className="font-label-mono text-on-surface-variant uppercase text-[11px]">Current Streak</span>
          <div>
            <div className="font-pixel-stat text-2xl text-primary">
              {stats?.currentStreak ?? 0} Days
            </div>
            <div className="font-label-mono text-[10px] text-on-surface-variant">연속 기여 중</div>
          </div>
        </div>

        <div className="bg-surface-container p-4 border border-outline-variant flex flex-col justify-between min-h-[96px]">
          <span className="font-label-mono text-on-surface-variant uppercase text-[11px]">Max Streak</span>
          <div>
            <div className="font-pixel-stat text-2xl text-primary">
              {stats?.maxStreak ?? 0} Days
            </div>
            <div className="font-label-mono text-[10px] text-on-surface-variant">역대 최장 스트릭</div>
          </div>
        </div>

        <div className="bg-surface-container p-4 border border-outline-variant flex flex-col justify-between min-h-[96px]">
          <span className="font-label-mono text-on-surface-variant uppercase text-[11px]">Neighborhood Rank</span>
          <div>
            <div className="font-pixel-stat text-2xl text-primary">
              #{stats?.neighborhoodRank ?? '—'}
            </div>
            <div className="font-label-mono text-[10px] text-on-surface-variant">
              {stats?.neighborhoodTotal ? `${stats.neighborhoodTotal}명 중` : '동네 미설정'}
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Contribution Chart */}
      <section className="bg-surface-container p-6 border border-outline-variant">
        <div className="flex justify-between items-end mb-6">
          <h2 className="font-h2 text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">analytics</span>
            WEEKLY CONTRIBUTION
          </h2>
          <span className="font-label-mono text-on-surface-variant text-[10px]">
            AVG: {stats?.weeklyAvg ?? 0} WATERS/WEEK
          </span>
        </div>

        <ResponsiveContainer width="100%" height={192}>
          <BarChart
            data={stats?.weeklyData ?? []}
            margin={{ top: 20, right: 0, left: -32, bottom: 0 }}
            barCategoryGap="20%"
          >
            <XAxis
              dataKey="week"
              tickFormatter={(v) => `WEEK ${v}`}
              tick={{ fontFamily: 'IBM Plex Mono', fontSize: 10, fill: '#404942' }}
              axisLine={{ stroke: '#c0c9c0' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontFamily: 'IBM Plex Mono', fontSize: 10, fill: '#404942' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'rgba(61,122,90,0.08)' }}
              contentStyle={{
                fontFamily: 'IBM Plex Mono',
                fontSize: 12,
                border: '1px solid #c0c9c0',
                borderRadius: 0,
                background: '#f2ede5',
              }}
              formatter={(value) => [`${value}회`, '물주기']}
              labelFormatter={(label) => `WEEK ${label}`}
            />
            <Bar dataKey="waterCount" radius={0}>
              {(stats?.weeklyData ?? []).map((entry, idx) => (
                <Cell
                  key={idx}
                  fill={entry.waterCount === maxWeeklyWater ? '#226143' : '#3D7A5A'}
                  stroke={entry.waterCount === maxWeeklyWater ? '#0e5134' : '#226143'}
                  strokeWidth={1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </section>

      {/* My Grown Trees */}
      <section className="bg-surface-container p-6 border border-outline-variant">
        <h2 className="font-h2 text-on-surface mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">forest</span>
          MY GROWN TREES
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {COLLECTION_ITEMS.map(({ key, label, stage, highlight }) => {
            const count = stats?.collection[key] ?? 0;
            return (
              <div
                key={key}
                className={[
                  'border p-4 text-center',
                  highlight
                    ? 'bg-surface-container-low border-primary-container border-2'
                    : 'bg-surface-container-low border-outline-variant',
                ].join(' ')}
              >
                <div
                  className={[
                    'aspect-square flex items-center justify-center mb-3',
                    highlight ? 'bg-primary-container' : 'bg-[#E8E4DC]',
                  ].join(' ')}
                >
                  <CreatureSprite stage={stage} size={64} />
                </div>
                <div className={[
                  'font-label-mono uppercase text-[13px]',
                  highlight ? 'text-on-primary-container font-bold' : 'text-on-surface',
                ].join(' ')}>
                  {label}
                </div>
                <div className={[
                  'font-label-mono text-[10px] mt-0.5',
                  highlight ? 'text-on-primary-container' : 'text-on-surface-variant',
                ].join(' ')}>
                  {count} COLLECTED
                </div>
              </div>
            );
          })}
        </div>
      </section>

    </main>
  );
}
