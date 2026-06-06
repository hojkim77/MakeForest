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

const CHART_TOKENS = {
  axisTick: '#6E7268', // on-surface-variant
  axisLine: '#B6AE99', // outline-variant
  tooltipBorder: '#1B3A26', // outline
  tooltipBackground: '#EDE8DC', // surface-container
  tooltipCursor: 'rgba(61,122,90,0.08)', // primary-container faded
  barMax: '#226143', // primary
  barMaxStroke: '#0e5134', // on-primary-fixed-variant
  bar: '#3D7A5A', // primary-container
  barStroke: '#226143', // primary
} as const;

interface Props {
  weeklyData: { week: number; waterCount: number }[];
  weeklyAvg: number;
}

export function WeeklyChart({ weeklyData, weeklyAvg }: Props) {
  const maxWeeklyWater = Math.max(...weeklyData.map(w => w.waterCount), 1);

  return (
    <section className="bg-surface-container p-lg border-2 border-outline shadow-island">
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
            tick={{ fontFamily: 'IBM Plex Mono', fontSize: 10, fill: CHART_TOKENS.axisTick }}
            axisLine={{ stroke: CHART_TOKENS.axisLine }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontFamily: 'IBM Plex Mono', fontSize: 10, fill: CHART_TOKENS.axisTick }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: CHART_TOKENS.tooltipCursor }}
            contentStyle={{
              fontFamily: 'IBM Plex Mono',
              fontSize: 12,
              border: `2px solid ${CHART_TOKENS.tooltipBorder}`,
              borderRadius: 0,
              background: CHART_TOKENS.tooltipBackground,
            }}
            formatter={(value) => [`${value}회`, '물주기']}
            labelFormatter={(label) => `WEEK ${label}`}
          />
          <Bar dataKey="waterCount" radius={0}>
            {weeklyData.map((entry, idx) => (
              <Cell
                key={idx}
                fill={entry.waterCount === maxWeeklyWater ? CHART_TOKENS.barMax : CHART_TOKENS.bar}
                stroke={entry.waterCount === maxWeeklyWater ? CHART_TOKENS.barMaxStroke : CHART_TOKENS.barStroke}
                strokeWidth={1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
