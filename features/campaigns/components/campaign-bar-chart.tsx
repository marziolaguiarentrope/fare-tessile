'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { BAR_COLORS, formatMetric, MetricKey, METRIC_OPTIONS } from '@/features/campaigns/lib/campaign-utils';

interface CampaignBarChartProps {
  data: { name: string; value: number }[];
  metric: MetricKey;
}

export function CampaignBarChart({ data, metric }: CampaignBarChartProps) {
  if (data.length === 0) return null;
  const label = METRIC_OPTIONS.find((m) => m.value === metric)?.label ?? metric;

  return (
    <div className="card space-y-2">
      <p className="text-sm font-medium text-slate-700">By campaign — {label}</p>
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 36)}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 0, right: 24, left: 8, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
          <XAxis
            type="number"
            tickFormatter={(v) => formatMetric(metric, v)}
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={220}
            tick={{ fontSize: 11, fill: '#475569' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: string) => v.length > 32 ? v.slice(0, 30) + '…' : v}
          />
          <Tooltip
            formatter={(value) => [formatMetric(metric, Number(value)), label]}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((_, index) => (
              <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
