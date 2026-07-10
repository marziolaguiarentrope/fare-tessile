'use client';

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { SparklinePoint, ExecutiveSummary } from '../types/budgetPacing';
import { getStatusMeta, ALL_STATUSES } from '../utils/budgetPacingStatus';
import { fmtCurrency } from '../utils/budgetPacingFormatting';

interface BudgetPacingChartsProps {
  sparklineData: SparklinePoint[];
  summary: ExecutiveSummary;
  currency?: string;
  daysPassed: number;
}

// -----------------------------------------------------------------------
// Custom tooltip for the portfolio area chart
// -----------------------------------------------------------------------
function PaceTooltip({ active, payload, label, currency }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-semibold text-slate-800">{fmtCurrency(p.value, currency ?? 'USD', true)}</span>
        </div>
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------
// Portfolio pace chart (area)
// -----------------------------------------------------------------------
export function PortfolioPaceChart({
  sparklineData,
  currency = 'USD',
  daysPassed,
}: {
  sparklineData: SparklinePoint[];
  currency?: string;
  daysPassed: number;
}) {
  // Only show data points that have actual spend
  const data = sparklineData.map((p) => ({
    ...p,
    actualSpend: p.day <= daysPassed ? p.actualSpend : null,
  }));

  return (
    <div className="card">
      <div className="mb-4">
        <p className="text-sm font-semibold text-slate-800">Portfolio Spend vs Expected Pace</p>
        <p className="text-xs text-slate-400 mt-0.5">Cumulative daily spend across all clients</p>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="expectedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.1} />
              <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickFormatter={(d) => (d % 5 === 0 || d === 1 ? `D${d}` : '')}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickFormatter={(v) => fmtCurrency(v, currency, true)}
            width={52}
          />
          <Tooltip content={<PaceTooltip currency={currency} />} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          />
          {/* Expected pace line */}
          <Area
            type="monotone"
            dataKey="expectedSpend"
            name="Expected"
            stroke="#94a3b8"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            fill="url(#expectedGrad)"
            dot={false}
            activeDot={{ r: 3 }}
          />
          {/* Actual spend */}
          <Area
            type="monotone"
            dataKey="actualSpend"
            name="Actual"
            stroke="#2563eb"
            strokeWidth={2}
            fill="url(#actualGrad)"
            dot={false}
            activeDot={{ r: 4, fill: '#2563eb' }}
            connectNulls={false}
          />
          {/* Today line */}
          <ReferenceLine
            x={daysPassed}
            stroke="#e2e8f0"
            strokeWidth={1.5}
            label={{ value: 'Today', position: 'top', fontSize: 9, fill: '#94a3b8' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// -----------------------------------------------------------------------
// Status distribution bar chart
// -----------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  'critical-under': '#ef4444',
  'under-pacing': '#f59e0b',
  'on-track': '#10b981',
  'over-pacing': '#f97316',
  'critical-over': '#e11d48',
  'not-started': '#94a3b8',
  completed: '#64748b',
};

export function StatusDistributionChart({ summary }: { summary: ExecutiveSummary }) {
  const data = ALL_STATUSES
    .map((s) => ({
      status: s,
      label: getStatusMeta(s).shortLabel,
      count: summary.statusDistribution[s] ?? 0,
      color: STATUS_COLORS[s],
    }))
    .filter((d) => d.count > 0);

  return (
    <div className="card">
      <div className="mb-4">
        <p className="text-sm font-semibold text-slate-800">Status Distribution</p>
        <p className="text-xs text-slate-400 mt-0.5">Clients by pacing status</p>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barSize={36}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: '#94a3b8' }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            allowDecimals={false}
            width={24}
          />
          <Tooltip
            cursor={{ fill: '#f8fafc' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const item = payload[0];
              return (
                <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-xs">
                  <p className="font-semibold text-slate-700">{item.payload.label}</p>
                  <p className="text-slate-500 mt-0.5">{item.value} client{item.value !== 1 ? 's' : ''}</p>
                </div>
              );
            }}
          />
          <Bar dataKey="count" name="Clients" radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.status} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
