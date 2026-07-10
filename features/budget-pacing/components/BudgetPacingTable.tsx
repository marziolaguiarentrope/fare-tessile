'use client';

import { ChevronUp, ChevronDown, ChevronsUpDown, ExternalLink } from 'lucide-react';
import type { BudgetPacingCalculatedRow, PacingFilters } from '../types/budgetPacing';
import { getStatusMeta, PLATFORM_META } from '../utils/budgetPacingStatus';
import { fmtCurrency, fmtPercent, fmtPercentPlain, fmtRelativeTime } from '../utils/budgetPacingFormatting';

interface BudgetPacingTableProps {
  rows: BudgetPacingCalculatedRow[];
  filters: PacingFilters;
  onSortChange: (col: keyof BudgetPacingCalculatedRow) => void;
  onRowClick: (row: BudgetPacingCalculatedRow) => void;
  viewMode: 'executive' | 'operator';
}

interface ColDef {
  key: keyof BudgetPacingCalculatedRow;
  label: string;
  align?: 'left' | 'right' | 'center';
  operatorOnly?: boolean;
  render: (row: BudgetPacingCalculatedRow) => React.ReactNode;
}

const COLUMNS: ColDef[] = [
  {
    key: 'client',
    label: 'Client',
    align: 'left',
    render: (row) => {
      const pm = PLATFORM_META[row.platform];
      return (
        <div className="flex items-center gap-2.5">
          <span
            className="inline-flex items-center justify-center w-7 h-7 rounded-md text-white text-[10px] font-black shrink-0"
            style={{ backgroundColor: pm?.color ?? '#64748b' }}
          >
            {pm?.abbr.slice(0, 2) ?? '??'}
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-800 leading-tight">{row.client}</p>
            <p className="text-xs text-slate-400 leading-tight">{row.channel}</p>
          </div>
        </div>
      );
    },
  },
  {
    key: 'platform',
    label: 'Platform',
    align: 'left',
    render: (row) => (
      <span className="text-xs font-medium text-slate-600">{row.platform}</span>
    ),
  },
  {
    key: 'status',
    label: 'Status',
    align: 'center',
    render: (row) => {
      const meta = getStatusMeta(row.status);
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${meta.badgeCss}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot.replace('text-', 'bg-')}`} />
          {meta.label}
        </span>
      );
    },
  },
  {
    key: 'monthBudget',
    label: 'Month Budget',
    align: 'right',
    render: (row) => (
      <span className="text-sm font-medium text-slate-700">{fmtCurrency(row.monthBudget, row.currency)}</span>
    ),
  },
  {
    key: 'actualSpend',
    label: 'Actual Spend',
    align: 'right',
    render: (row) => (
      <span className="text-sm font-semibold text-slate-800">{fmtCurrency(row.actualSpend, row.currency)}</span>
    ),
  },
  {
    key: 'expectedSpendToDate',
    label: 'Expected to Date',
    align: 'right',
    render: (row) => (
      <span className="text-sm text-slate-500">{fmtCurrency(row.expectedSpendToDate, row.currency)}</span>
    ),
  },
  {
    key: 'diffPercentage',
    label: 'Diff %',
    align: 'right',
    render: (row) => {
      const isPos = row.diffPercentage > 0;
      const isNeg = row.diffPercentage < 0;
      const cls = isPos ? 'text-orange-600' : isNeg ? 'text-red-600' : 'text-slate-500';
      return (
        <span className={`text-sm font-semibold ${cls}`}>
          {fmtPercent(row.diffPercentage)}
        </span>
      );
    },
  },
  {
    key: 'diffAmount',
    label: 'Diff $',
    align: 'right',
    operatorOnly: true,
    render: (row) => {
      const isPos = row.diffAmount > 0;
      const cls = isPos ? 'text-orange-600' : 'text-red-600';
      return (
        <span className={`text-xs font-medium ${Math.abs(row.diffAmount) < 1 ? 'text-slate-400' : cls}`}>
          {row.diffAmount >= 0 ? '+' : ''}{fmtCurrency(row.diffAmount, row.currency)}
        </span>
      );
    },
  },
  {
    key: 'pacingPercentage',
    label: 'Pacing %',
    align: 'right',
    render: (row) => {
      const cls =
        row.pacingPercentage > 107
          ? 'text-orange-600'
          : row.pacingPercentage < 93
          ? 'text-red-600'
          : 'text-emerald-600';
      return (
        <div className="flex flex-col items-end gap-1">
          <span className={`text-sm font-semibold ${cls}`}>{fmtPercentPlain(row.pacingPercentage)}</span>
          {/* Mini progress bar */}
          <div className="w-16 h-1 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                row.pacingPercentage > 107 ? 'bg-orange-400' : row.pacingPercentage < 93 ? 'bg-red-400' : 'bg-emerald-400'
              }`}
              style={{ width: `${Math.min(row.pacingPercentage, 150)}%` }}
            />
          </div>
        </div>
      );
    },
  },
  {
    key: 'remainingBudget',
    label: 'Remaining',
    align: 'right',
    render: (row) => {
      const cls = row.remainingBudget < 0 ? 'text-red-600' : 'text-slate-700';
      return <span className={`text-sm ${cls}`}>{fmtCurrency(row.remainingBudget, row.currency)}</span>;
    },
  },
  {
    key: 'projectedMonthEndSpend',
    label: 'Projected End',
    align: 'right',
    render: (row) => {
      const over = row.projectedMonthEndSpend > row.monthBudget * 1.07;
      const under = row.projectedMonthEndSpend < row.monthBudget * 0.93;
      const cls = over ? 'text-orange-600' : under ? 'text-red-600' : 'text-slate-700';
      return <span className={`text-sm font-medium ${cls}`}>{fmtCurrency(row.projectedMonthEndSpend, row.currency)}</span>;
    },
  },
  {
    key: 'recommendedDailySpend',
    label: 'Rec. Daily',
    align: 'right',
    operatorOnly: true,
    render: (row) => (
      <span className="text-sm text-slate-700">{fmtCurrency(row.recommendedDailySpend, row.currency)}</span>
    ),
  },
  {
    key: 'dailyAverageSoFar',
    label: 'Avg Daily',
    align: 'right',
    operatorOnly: true,
    render: (row) => (
      <span className="text-xs text-slate-500">{fmtCurrency(row.dailyAverageSoFar, row.currency)}</span>
    ),
  },
  {
    key: 'dailyAdjustmentNeeded',
    label: 'Daily Adj.',
    align: 'right',
    operatorOnly: true,
    render: (row) => {
      const isPos = row.dailyAdjustmentNeeded > 0;
      const cls = isPos ? 'text-emerald-700' : 'text-red-600';
      return (
        <span className={`text-xs font-semibold ${Math.abs(row.dailyAdjustmentNeeded) < 1 ? 'text-slate-400' : cls}`}>
          {row.dailyAdjustmentNeeded >= 0 ? '+' : ''}{fmtCurrency(row.dailyAdjustmentNeeded, row.currency)}
        </span>
      );
    },
  },
  {
    key: 'budgetUtilizationPct',
    label: 'Utilization',
    align: 'right',
    render: (row) => (
      <span className="text-sm text-slate-600">{fmtPercentPlain(row.budgetUtilizationPct)}</span>
    ),
  },
  {
    key: 'daysPassed',
    label: 'Days Passed',
    align: 'center',
    operatorOnly: true,
    render: (row) => <span className="text-xs text-slate-500">{row.daysPassed} / {row.daysInMonth}</span>,
  },
  {
    key: 'owner',
    label: 'Owner',
    align: 'left',
    render: (row) => (
      <span className="text-xs text-slate-500">{row.owner}</span>
    ),
  },
  {
    key: 'lastUpdated',
    label: 'Last Updated',
    align: 'left',
    operatorOnly: true,
    render: (row) => (
      <span className="text-xs text-slate-400">{fmtRelativeTime(row.lastUpdated)}</span>
    ),
  },
];

function SortIcon({ colKey, filters }: { colKey: keyof BudgetPacingCalculatedRow; filters: PacingFilters }) {
  if (filters.sortBy !== colKey) return <ChevronsUpDown className="w-3 h-3 text-slate-300" />;
  return filters.sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-blue-500" />
    : <ChevronDown className="w-3 h-3 text-blue-500" />;
}

export function BudgetPacingTable({
  rows,
  filters,
  onSortChange,
  onRowClick,
  viewMode,
}: BudgetPacingTableProps) {
  const visibleColumns = COLUMNS.filter((col) => viewMode === 'operator' || !col.operatorOnly);

  if (rows.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center py-16 text-slate-400">
        <p className="text-sm font-medium">No clients match your filters.</p>
        <p className="text-xs mt-1">Try adjusting the search or filter options above.</p>
      </div>
    );
  }

  return (
    <div className="card p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70">
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 cursor-pointer hover:text-slate-700 whitespace-nowrap select-none ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  }`}
                  onClick={() => onSortChange(col.key)}
                >
                  <div className={`inline-flex items-center gap-1 ${col.align === 'right' ? 'flex-row-reverse' : ''}`}>
                    {col.label}
                    <SortIcon colKey={col.key} filters={filters} />
                  </div>
                </th>
              ))}
              {/* Actions */}
              <th className="px-4 py-3 w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick(row)}
                className="group cursor-pointer hover:bg-blue-50/40 transition-colors"
              >
                {visibleColumns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 ${
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    }`}
                  >
                    {col.render(row)}
                  </td>
                ))}
                <td className="px-4 py-3">
                  <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-400 transition-colors" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-100 px-4 py-2.5 bg-slate-50/50 flex items-center justify-between">
        <p className="text-xs text-slate-400">{rows.length} client{rows.length !== 1 ? 's' : ''} shown</p>
        <p className="text-xs text-slate-400">Click any row to view details</p>
      </div>
    </div>
  );
}
