'use client';

import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Target } from 'lucide-react';
import type { ExecutiveSummary, CalendarContext } from '../types/budgetPacing';
import { fmtCurrency, fmtPercent, fmtPercentPlain } from '../utils/budgetPacingFormatting';

interface BudgetPacingCardsProps {
  summary: ExecutiveSummary;
  ctx: CalendarContext;
  currency?: string;
}

interface CardProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
  note?: string;
}

function SummaryCard({ icon, iconBg, label, value, sub, subColor = 'text-slate-500', note }: CardProps) {
  return (
    <div className="card flex flex-col gap-3 min-w-0">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <div className={`rounded-lg p-2 ${iconBg}`}>{icon}</div>
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 leading-tight">{value}</p>
        {sub && (
          <p className={`text-xs mt-1 font-medium ${subColor}`}>{sub}</p>
        )}
        {note && (
          <p className="text-xs mt-1 text-slate-400">{note}</p>
        )}
      </div>
    </div>
  );
}

export function BudgetPacingCards({ summary, ctx, currency = 'USD' }: BudgetPacingCardsProps) {
  const pacingSign = summary.portfolioDiffPct >= 0 ? '+' : '';
  const isPacingOk = Math.abs(summary.portfolioDiffPct) <= 7;
  const isPacingUnder = summary.portfolioDiffPct < -7;

  const projectedOverUnder = summary.totalProjected - summary.totalBudget;
  const projectedSign = projectedOverUnder >= 0 ? '+' : '';

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      {/* Total Budget */}
      <SummaryCard
        icon={<DollarSign className="w-4 h-4 text-blue-600" />}
        iconBg="bg-blue-50"
        label="Total Budget"
        value={fmtCurrency(summary.totalBudget, currency, true)}
        sub={`${ctx.monthLabel}`}
        note={`${ctx.daysLeft} days remaining`}
      />

      {/* Spend to Date */}
      <SummaryCard
        icon={<TrendingUp className="w-4 h-4 text-indigo-600" />}
        iconBg="bg-indigo-50"
        label="Spend to Date"
        value={fmtCurrency(summary.totalSpend, currency, true)}
        sub={`Expected: ${fmtCurrency(summary.totalExpected, currency, true)}`}
        subColor={
          summary.portfolioDiffPct >= -7 && summary.portfolioDiffPct <= 7
            ? 'text-emerald-600'
            : summary.portfolioDiffPct < -7
            ? 'text-red-600'
            : 'text-orange-600'
        }
        note={`Day ${ctx.daysPassed} of ${ctx.daysInMonth}`}
      />

      {/* Portfolio Pacing */}
      <SummaryCard
        icon={
          isPacingOk ? (
            <Target className="w-4 h-4 text-emerald-600" />
          ) : isPacingUnder ? (
            <TrendingDown className="w-4 h-4 text-red-600" />
          ) : (
            <TrendingUp className="w-4 h-4 text-orange-600" />
          )
        }
        iconBg={isPacingOk ? 'bg-emerald-50' : isPacingUnder ? 'bg-red-50' : 'bg-orange-50'}
        label="Portfolio Pacing"
        value={`${pacingSign}${summary.portfolioDiffPct.toFixed(1)}%`}
        sub={
          isPacingOk
            ? 'On track'
            : isPacingUnder
            ? `${Math.abs(summary.portfolioDiffPct).toFixed(1)}% behind pace`
            : `${summary.portfolioDiffPct.toFixed(1)}% ahead of pace`
        }
        subColor={isPacingOk ? 'text-emerald-600' : isPacingUnder ? 'text-red-600' : 'text-orange-600'}
        note={`Utilization: ${fmtPercentPlain(summary.budgetUtilization)}`}
      />

      {/* Projected Month-End */}
      <SummaryCard
        icon={<TrendingUp className="w-4 h-4 text-violet-600" />}
        iconBg="bg-violet-50"
        label="Projected Month-End"
        value={fmtCurrency(summary.totalProjected, currency, true)}
        sub={`${projectedSign}${fmtCurrency(projectedOverUnder, currency, true)} vs budget`}
        subColor={
          Math.abs(projectedOverUnder) / summary.totalBudget < 0.07
            ? 'text-emerald-600'
            : projectedOverUnder < 0
            ? 'text-red-600'
            : 'text-orange-600'
        }
        note="At current daily rate"
      />

      {/* Clients at Risk */}
      <SummaryCard
        icon={
          summary.clientsAtRisk > 0 ? (
            <AlertTriangle className="w-4 h-4 text-red-600" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          )
        }
        iconBg={summary.clientsAtRisk > 0 ? 'bg-red-50' : 'bg-emerald-50'}
        label="Clients at Risk"
        value={String(summary.clientsAtRisk)}
        sub={
          summary.clientsAtRisk > 0
            ? `${summary.clientsAtRisk} need immediate action`
            : 'All clients healthy'
        }
        subColor={summary.clientsAtRisk > 0 ? 'text-red-600' : 'text-emerald-600'}
        note={`${summary.clientsOnTrack} on track`}
      />
    </div>
  );
}
