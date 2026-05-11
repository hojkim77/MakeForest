'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface Props {
  weeklyData: { week: number; waterCount: number }[];
  weeklyAvg: number;
}

export function WeeklyChart({ weeklyData, weeklyAvg }: Props) {
  const maxWeeklyWater = Math.max(...weeklyData.map(w => w.waterCount), 1);

  return (
    <section className="bg-surface-container p-6 border border-outline-variant">
      <div className="flex justify-between items-end mb-6">
        <h2 className="font-h2 text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">analytics</span>
          WEEKLY CONTRIBUTION
        </h2>
        <span className="font-label-mono text-on-surface-variant text-[10px]">
          AVG: {weeklyAvg} WATERS/WEEK
        </span>
      </div>

      <ResponsiveContainer width="100%" height={192}>
        <BarChart
          data={weeklyData}
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
            {weeklyData.map((entry, idx) => (
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
  );
}
