'use client';

import { Search, X, ChevronDown } from 'lucide-react';
import type { PacingFilters, BudgetPacingCalculatedRow } from '../types/budgetPacing';
import { ALL_STATUSES, getStatusMeta } from '../utils/budgetPacingStatus';

interface BudgetPacingFiltersProps {
  filters: PacingFilters;
  onChange: (filters: PacingFilters) => void;
  rows: BudgetPacingCalculatedRow[];
}

const PLATFORMS = ['Meta Ads', 'Google Ads', 'TikTok Ads', 'LinkedIn Ads', 'Pinterest Ads', 'Twitter Ads'];

export function BudgetPacingFilters({ filters, onChange, rows }: BudgetPacingFiltersProps) {
  const owners = Array.from(new Set(rows.map((r) => r.owner))).sort();

  const set = (patch: Partial<PacingFilters>) => onChange({ ...filters, ...patch });

  const hasActiveFilters =
    filters.search !== '' ||
    filters.platform !== 'all' ||
    filters.status !== 'all' ||
    filters.owner !== 'all';

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[180px] max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search client or channel…"
          value={filters.search}
          onChange={(e) => set({ search: e.target.value })}
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 placeholder:text-slate-400"
        />
        {filters.search && (
          <button
            onClick={() => set({ search: '' })}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Platform */}
      <div className="relative">
        <select
          value={filters.platform}
          onChange={(e) => set({ platform: e.target.value as PacingFilters['platform'] })}
          className="appearance-none pl-3 pr-8 py-2 text-sm rounded-lg border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 cursor-pointer"
        >
          <option value="all">All Platforms</option>
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
      </div>

      {/* Status */}
      <div className="relative">
        <select
          value={filters.status}
          onChange={(e) => set({ status: e.target.value as PacingFilters['status'] })}
          className="appearance-none pl-3 pr-8 py-2 text-sm rounded-lg border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 cursor-pointer"
        >
          <option value="all">All Statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{getStatusMeta(s).label}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
      </div>

      {/* Owner */}
      <div className="relative">
        <select
          value={filters.owner}
          onChange={(e) => set({ owner: e.target.value })}
          className="appearance-none pl-3 pr-8 py-2 text-sm rounded-lg border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 cursor-pointer"
        >
          <option value="all">All Owners</option>
          {owners.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
      </div>

      {/* Clear filters */}
      {hasActiveFilters && (
        <button
          onClick={() => onChange({ ...filters, search: '', platform: 'all', status: 'all', owner: 'all' })}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Clear
        </button>
      )}

      {/* Result count */}
      <span className="ml-auto text-xs text-slate-400 whitespace-nowrap">
        {rows.length} client{rows.length !== 1 ? 's' : ''}
      </span>
    </div>
  );
}
