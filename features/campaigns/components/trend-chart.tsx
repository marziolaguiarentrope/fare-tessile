'use client';

import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { formatMetric, MetricKey, METRIC_OPTIONS } from '@/features/campaigns/lib/campaign-utils';

interface TrendChartProps {
  data: Record<string, number | string>[];
  primaryMetric: MetricKey;
  secondaryMetric: MetricKey | 'none';
}

export function TrendChart({ data, primaryMetric, secondaryMetric }: TrendChartProps) {
  if (data.length === 0) return null;

  const primaryColor  = METRIC_OPTIONS.find((m) => m.value === primaryMetric)?.color  ?? '#6366f1';
  const secondaryColor = METRIC_OPTIONS.find((m) => m.value === secondaryMetric)?.color ?? '#f59e0b';
  const hasSecondary = secondaryMetric !== 'none';

  return (
    <div className="card space-y-2">
      <p className="text-sm font-medium text-slate-700">Trend over time</p>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 4, right: hasSecondary ? 48 : 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="left"
            orientation="left"
            tickFormatter={(v) => formatMetric(primaryMetric, v)}
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            width={72}
          />
          {hasSecondary && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={(v) => formatMetric(secondaryMetric as MetricKey, v)}
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
              width={64}
            />
          )}
          <Tooltip
            formatter={(value, name) => [
              formatMetric(name as string, Number(value)),
              METRIC_OPTIONS.find((m) => m.value === name)?.label ?? name
            ]}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey={primaryMetric}
            stroke={primaryColor}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
            name={METRIC_OPTIONS.find((m) => m.value === primaryMetric)?.label ?? primaryMetric}
          />
          {hasSecondary && (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey={secondaryMetric}
              stroke={secondaryColor}
              strokeWidth={2}
              strokeDasharray="5 3"
              dot={false}
              activeDot={{ r: 4 }}
              name={METRIC_OPTIONS.find((m) => m.value === secondaryMetric)?.label ?? secondaryMetric}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
