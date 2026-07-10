import type { PacingStatus } from '../types/budgetPacing';

interface StatusInput {
  actualSpend: number;
  diffPercentage: number;
  daysPassed: number;
}

// ---------------------------------------------------------------------------
// Status derivation
// ---------------------------------------------------------------------------

export function deriveStatus({ actualSpend, diffPercentage, daysPassed }: StatusInput): PacingStatus {
  if (actualSpend === 0 && daysPassed === 0) return 'not-started';
  if (actualSpend === 0 && daysPassed > 0) return 'not-started';

  if (diffPercentage <= -20) return 'critical-under';
  if (diffPercentage > -20 && diffPercentage < -7) return 'under-pacing';
  if (diffPercentage >= -7 && diffPercentage <= 7) return 'on-track';
  if (diffPercentage > 7 && diffPercentage < 20) return 'over-pacing';
  return 'critical-over'; // >= 20
}

// ---------------------------------------------------------------------------
// Status metadata
// ---------------------------------------------------------------------------

export interface StatusMeta {
  label: string;
  shortLabel: string;
  color: string;       // Tailwind text color
  bg: string;          // Tailwind background
  border: string;      // Tailwind border
  dot: string;         // Tailwind fill/text for the dot indicator
  badgeCss: string;    // inline className shorthand
  severity: 'critical' | 'warning' | 'ok' | 'neutral';
}

const STATUS_META: Record<PacingStatus, StatusMeta> = {
  'critical-under': {
    label: 'Critical Under',
    shortLabel: 'Crit. Under',
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    dot: 'text-red-500',
    badgeCss: 'bg-red-50 text-red-700 border border-red-200',
    severity: 'critical',
  },
  'under-pacing': {
    label: 'Under Pacing',
    shortLabel: 'Under',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    dot: 'text-amber-500',
    badgeCss: 'bg-amber-50 text-amber-700 border border-amber-200',
    severity: 'warning',
  },
  'on-track': {
    label: 'On Track',
    shortLabel: 'On Track',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    dot: 'text-emerald-500',
    badgeCss: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    severity: 'ok',
  },
  'over-pacing': {
    label: 'Over Pacing',
    shortLabel: 'Over',
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    dot: 'text-orange-500',
    badgeCss: 'bg-orange-50 text-orange-700 border border-orange-200',
    severity: 'warning',
  },
  'critical-over': {
    label: 'Critical Over',
    shortLabel: 'Crit. Over',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    dot: 'text-rose-500',
    badgeCss: 'bg-rose-50 text-rose-700 border border-rose-200',
    severity: 'critical',
  },
  'not-started': {
    label: 'Not Started',
    shortLabel: 'Pending',
    color: 'text-slate-500',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    dot: 'text-slate-400',
    badgeCss: 'bg-slate-50 text-slate-500 border border-slate-200',
    severity: 'neutral',
  },
  completed: {
    label: 'Completed',
    shortLabel: 'Done',
    color: 'text-slate-600',
    bg: 'bg-slate-100',
    border: 'border-slate-200',
    dot: 'text-slate-500',
    badgeCss: 'bg-slate-100 text-slate-600 border border-slate-200',
    severity: 'neutral',
  },
};

export function getStatusMeta(status: PacingStatus): StatusMeta {
  return STATUS_META[status];
}

export const ALL_STATUSES = Object.keys(STATUS_META) as PacingStatus[];

// ---------------------------------------------------------------------------
// Platform metadata
// ---------------------------------------------------------------------------

export interface PlatformMeta {
  color: string;   // hex for chart / avatar background
  abbr: string;    // short abbr for tight spaces
}

export const PLATFORM_META: Record<string, PlatformMeta> = {
  'Meta Ads':     { color: '#1877F2', abbr: 'META' },
  'Google Ads':   { color: '#4285F4', abbr: 'GOOG' },
  'TikTok Ads':   { color: '#010101', abbr: 'TKTK' },
  'LinkedIn Ads': { color: '#0A66C2', abbr: 'LKDN' },
  'Pinterest Ads':{ color: '#E60023', abbr: 'PINT' },
  'Twitter Ads':  { color: '#1DA1F2', abbr: 'TWTR' },
};
