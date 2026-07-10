export type PacingStatus =
  | 'critical-under'
  | 'under-pacing'
  | 'on-track'
  | 'over-pacing'
  | 'critical-over'
  | 'not-started'
  | 'completed';

export type Platform =
  | 'Meta Ads'
  | 'Google Ads'
  | 'TikTok Ads'
  | 'LinkedIn Ads'
  | 'Pinterest Ads'
  | 'Twitter Ads';

export type ViewMode = 'executive' | 'operator';

// Raw data as it comes from API / mock
export interface BudgetPacingSourceRow {
  id: string;
  client: string;
  platform: Platform;
  channel: string;
  monthBudget: number;
  actualSpend: number;
  currency: string;
  owner: string;
  lastUpdated: string; // ISO date string
  month: string; // 'YYYY-MM'
}

// Calendar context computed once per render
export interface CalendarContext {
  year: number;
  month: number; // 1–12
  daysInMonth: number;
  daysPassed: number; // full days completed (e.g. on May 6 → 5)
  daysLeft: number; // days remaining including today (e.g. on May 6 → 26)
  today: Date;
  monthLabel: string; // e.g. "May 2026"
}

// Fully enriched row after calculations
export interface BudgetPacingCalculatedRow extends BudgetPacingSourceRow {
  // Calendar
  daysInMonth: number;
  daysPassed: number;
  daysLeft: number;

  // Core metrics
  expectedSpendToDate: number;
  remainingBudget: number;
  diffAmount: number; // actualSpend - expectedSpendToDate
  diffPercentage: number; // (actualSpend - expectedSpendToDate) / expectedSpendToDate * 100
  pacingPercentage: number; // projected vs budget: (actualSpend / budget) * (daysInMonth / daysPassed) * 100
  projectedMonthEndSpend: number; // (actualSpend / daysPassed) * daysInMonth
  recommendedDailySpend: number; // (budget - actualSpend) / daysLeft
  dailyAverageSoFar: number; // actualSpend / daysPassed
  dailyAdjustmentNeeded: number; // recommendedDailySpend - dailyAverageSoFar
  budgetUtilizationPct: number; // (actualSpend / monthBudget) * 100

  status: PacingStatus;
}

// Filters & sort
export interface PacingFilters {
  search: string;
  platform: Platform | 'all';
  status: PacingStatus | 'all';
  owner: string | 'all';
  sortBy: keyof BudgetPacingCalculatedRow;
  sortDir: 'asc' | 'desc';
}

// Executive summary computed from all rows
export interface ExecutiveSummary {
  totalBudget: number;
  totalSpend: number;
  totalExpected: number;
  totalProjected: number;
  portfolioDiffPct: number;
  portfolioPacingPct: number;
  budgetUtilization: number;
  statusDistribution: Record<PacingStatus, number>;
  clientsAtRisk: number; // critical-under + critical-over
  clientsOnTrack: number;
}

// Auto-generated alert
export interface PacingAlert {
  id: string;
  client: string;
  platform: Platform;
  status: PacingStatus;
  severity: 'high' | 'medium' | 'low';
  message: string;
  detail: string;
}

// Auto-generated recommendation
export interface PacingRecommendation {
  id: string;
  client: string;
  platform: Platform;
  status: PacingStatus;
  action: string;
  rationale: string;
  impact: 'high' | 'medium' | 'low';
}

// Sparkline data point for charts
export interface SparklinePoint {
  day: number;
  actualSpend: number;
  expectedSpend: number;
  label: string;
}
