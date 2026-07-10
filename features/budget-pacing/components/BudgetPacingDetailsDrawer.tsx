'use client';

import { X, TrendingUp, TrendingDown, Minus, ExternalLink } from 'lucide-react';
import { useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { BudgetPacingCalculatedRow } from '../types/budgetPacing';
import { getStatusMeta, PLATFORM_META } from '../utils/budgetPacingStatus';
import {
  fmtCurrency,
  fmtPercent,
  fmtPercentPlain,
  fmtDate,
} from '../utils/budgetPacingFormatting';
import { buildSparklineData, buildCalendarContext } from '../utils/budgetPacingCalculations';

interface BudgetPacingDetailsDrawerProps {
  row: BudgetPacingCalculatedRow | null;
  onClose: () => void;
}

function MetricRow({
  label,
  value,
  valueClass = 'text-slate-800',
  sub,
}: {
  label: string;
  value: string;
  valueClass?: string;
  sub?: string;
}) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500 leading-tight">{label}</span>
      <div className="text-right">
        <span className={`text-sm font-semibold ${valueClass}`}>{value}</span>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">{title}</h3>
      <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-4 divide-y divide-slate-100">
        {children}
      </div>
    </div>
  );
}

export function BudgetPacingDetailsDrawer({ row, onClose }: BudgetPacingDetailsDrawerProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const isOpen = row !== null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-lg bg-white shadow-2xl border-l border-slate-200 overflow-y-auto transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {row && <DrawerContent row={row} onClose={onClose} />}
      </div>
    </>
  );
}

function DrawerContent({ row, onClose }: { row: BudgetPacingCalculatedRow; onClose: () => void }) {
  const meta = getStatusMeta(row.status);
  const pm = PLATFORM_META[row.platform];
  const ctx = buildCalendarContext(new Date());
  const sparkline = buildSparklineData(row, ctx);
  const currency = row.currency;

  const diffPositive = row.diffPercentage >= 0;
  const diffClass = Math.abs(row.diffPercentage) <= 7
    ? 'text-emerald-600'
    : diffPositive
    ? 'text-orange-600'
    : 'text-red-600';

  const DiffIcon = Math.abs(row.diffPercentage) <= 7
    ? Minus
    : diffPositive
    ? TrendingUp
    : TrendingDown;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <span
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-white text-xs font-black shrink-0"
            style={{ backgroundColor: pm?.color ?? '#64748b' }}
          >
            {pm?.abbr ?? '??'}
          </span>
          <div>
            <h2 className="text-base font-bold text-slate-900">{row.client}</h2>
            <p className="text-xs text-slate-400">{row.platform} · {row.channel}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Status banner */}
      <div className={`px-6 py-3 flex items-center gap-3 ${meta.bg} border-b ${meta.border}`}>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${meta.badgeCss}`}>
          <span className={`w-2 h-2 rounded-full ${meta.dot.replace('text-', 'bg-')}`} />
          {meta.label}
        </span>
        <div className={`flex items-center gap-1 text-sm font-semibold ${diffClass}`}>
          <DiffIcon className="w-3.5 h-3.5" />
          {fmtPercent(row.diffPercentage)} vs expected
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-6 py-5 space-y-6 overflow-y-auto">

        {/* Spend curve */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Spend Curve</h3>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={sparkline} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="drawerActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 9, fill: '#94a3b8' }}
                tickFormatter={(d) => (d % 5 === 0 || d === 1 ? `D${d}` : '')}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 9, fill: '#94a3b8' }}
                tickFormatter={(v) => fmtCurrency(v, currency, true)}
                width={46}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-white border border-slate-200 rounded-lg shadow p-2 text-xs">
                      <p className="font-semibold text-slate-600 mb-1">Day {label}</p>
                      {payload.map((p: any) => (
                        <p key={p.dataKey} className="text-slate-500">
                          {p.name}: <span className="font-bold text-slate-800">{fmtCurrency(p.value, currency)}</span>
                        </p>
                      ))}
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="expectedSpend"
                name="Expected"
                stroke="#cbd5e1"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                fill="none"
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="actualSpend"
                name="Actual"
                stroke="#2563eb"
                strokeWidth={2}
                fill="url(#drawerActual)"
                dot={false}
                connectNulls={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Budget overview */}
        <Section title="Budget Overview">
          <MetricRow
            label="Month Budget"
            value={fmtCurrency(row.monthBudget, currency)}
          />
          <MetricRow
            label="Actual Spend"
            value={fmtCurrency(row.actualSpend, currency)}
            sub={`Day ${row.daysPassed} of ${row.daysInMonth}`}
          />
          <MetricRow
            label="Expected to Date"
            value={fmtCurrency(row.expectedSpendToDate, currency)}
            valueClass={diffClass}
          />
          <MetricRow
            label="Remaining Budget"
            value={fmtCurrency(row.remainingBudget, currency)}
            valueClass={row.remainingBudget < 0 ? 'text-red-600' : 'text-slate-800'}
          />
          <MetricRow
            label="Budget Utilization"
            value={fmtPercentPlain(row.budgetUtilizationPct)}
          />
        </Section>

        {/* Pacing metrics */}
        <Section title="Pacing Metrics">
          <MetricRow
            label="Diff vs Expected"
            value={fmtPercent(row.diffPercentage)}
            valueClass={diffClass}
            sub={`${row.diffAmount >= 0 ? '+' : ''}${fmtCurrency(row.diffAmount, currency)}`}
          />
          <MetricRow
            label="Pacing % (proj. vs budget)"
            value={fmtPercentPlain(row.pacingPercentage)}
            valueClass={
              row.pacingPercentage > 107 ? 'text-orange-600' : row.pacingPercentage < 93 ? 'text-red-600' : 'text-emerald-600'
            }
          />
          <MetricRow
            label="Projected Month-End"
            value={fmtCurrency(row.projectedMonthEndSpend, currency)}
            sub={`${row.projectedMonthEndSpend >= row.monthBudget ? '+' : ''}${fmtCurrency(row.projectedMonthEndSpend - row.monthBudget, currency)} vs budget`}
          />
        </Section>

        {/* Daily details */}
        <Section title="Daily Details">
          <MetricRow
            label="Avg Daily Spend So Far"
            value={fmtCurrency(row.dailyAverageSoFar, currency)}
          />
          <MetricRow
            label="Recommended Daily Spend"
            value={fmtCurrency(row.recommendedDailySpend, currency)}
            sub={`For remaining ${row.daysLeft} days`}
          />
          <MetricRow
            label="Daily Adjustment Needed"
            value={`${row.dailyAdjustmentNeeded >= 0 ? '+' : ''}${fmtCurrency(row.dailyAdjustmentNeeded, currency)}`}
            valueClass={
              Math.abs(row.dailyAdjustmentNeeded) < 50
                ? 'text-slate-600'
                : row.dailyAdjustmentNeeded > 0
                ? 'text-emerald-700'
                : 'text-red-600'
            }
          />
        </Section>

        {/* Meta */}
        <Section title="Details">
          <MetricRow label="Owner" value={row.owner} />
          <MetricRow label="Currency" value={row.currency} />
          <MetricRow label="Last Updated" value={fmtDate(row.lastUpdated)} />
        </Section>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-100 px-6 py-4 bg-slate-50/60 flex items-center justify-between">
        <p className="text-xs text-slate-400">{row.month}</p>
        <button className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700">
          Open in platform <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
