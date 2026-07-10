import type {
  BudgetPacingSourceRow,
  BudgetPacingCalculatedRow,
  CalendarContext,
  ExecutiveSummary,
  SparklinePoint,
} from '../types/budgetPacing';
import { deriveStatus } from './budgetPacingStatus';

// ---------------------------------------------------------------------------
// Calendar context
// ---------------------------------------------------------------------------

export function buildCalendarContext(date: Date = new Date()): CalendarContext {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-based
  const daysInMonth = new Date(year, month, 0).getDate();
  // Full days completed before today
  const daysPassed = date.getDate() - 1;
  // Remaining days including today
  const daysLeft = daysInMonth - daysPassed;

  const monthLabel = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return { year, month, daysInMonth, daysPassed, daysLeft, today: date, monthLabel };
}

// ---------------------------------------------------------------------------
// Row calculations
// ---------------------------------------------------------------------------

export function calculateRow(
  source: BudgetPacingSourceRow,
  ctx: CalendarContext,
): BudgetPacingCalculatedRow {
  const { monthBudget, actualSpend } = source;
  const { daysInMonth, daysPassed, daysLeft } = ctx;

  // Guard: no days passed yet → not started
  const safePassedDays = Math.max(daysPassed, 1);

  const expectedSpendToDate = (monthBudget / daysInMonth) * daysPassed;
  const remainingBudget = monthBudget - actualSpend;
  const diffAmount = actualSpend - expectedSpendToDate;
  const diffPercentage =
    expectedSpendToDate > 0 ? ((actualSpend - expectedSpendToDate) / expectedSpendToDate) * 100 : 0;

  // Projected end-of-month spend at current daily rate
  const dailyAverageSoFar = actualSpend / safePassedDays;
  const projectedMonthEndSpend = dailyAverageSoFar * daysInMonth;

  // Pacing %: how much of the budget will be consumed if current rate holds
  const pacingPercentage =
    daysPassed > 0 ? (actualSpend / monthBudget) * (daysInMonth / daysPassed) * 100 : 0;

  // Recommended daily spend to finish exactly on budget
  const safeDaysLeft = Math.max(daysLeft, 1);
  const recommendedDailySpend = remainingBudget / safeDaysLeft;
  const dailyAdjustmentNeeded = recommendedDailySpend - dailyAverageSoFar;

  const budgetUtilizationPct = (actualSpend / monthBudget) * 100;

  const status = deriveStatus({ actualSpend, diffPercentage, daysPassed });

  return {
    ...source,
    daysInMonth,
    daysPassed,
    daysLeft,
    expectedSpendToDate,
    remainingBudget,
    diffAmount,
    diffPercentage,
    pacingPercentage,
    projectedMonthEndSpend,
    recommendedDailySpend,
    dailyAverageSoFar,
    dailyAdjustmentNeeded,
    budgetUtilizationPct,
    status,
  };
}

export function calculateRows(
  sources: BudgetPacingSourceRow[],
  ctx: CalendarContext,
): BudgetPacingCalculatedRow[] {
  return sources.map((row) => calculateRow(row, ctx));
}

// ---------------------------------------------------------------------------
// Executive summary
// ---------------------------------------------------------------------------

export function buildExecutiveSummary(rows: BudgetPacingCalculatedRow[]): ExecutiveSummary {
  const totalBudget = rows.reduce((s, r) => s + r.monthBudget, 0);
  const totalSpend = rows.reduce((s, r) => s + r.actualSpend, 0);
  const totalExpected = rows.reduce((s, r) => s + r.expectedSpendToDate, 0);
  const totalProjected = rows.reduce((s, r) => s + r.projectedMonthEndSpend, 0);

  const portfolioDiffPct =
    totalExpected > 0 ? ((totalSpend - totalExpected) / totalExpected) * 100 : 0;

  const portfolioPacingPct = totalBudget > 0 ? (totalProjected / totalBudget) * 100 : 0;

  const budgetUtilization = totalBudget > 0 ? (totalSpend / totalBudget) * 100 : 0;

  const statusDistribution = rows.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  ) as ExecutiveSummary['statusDistribution'];

  const clientsAtRisk =
    (statusDistribution['critical-under'] ?? 0) + (statusDistribution['critical-over'] ?? 0);

  const clientsOnTrack = statusDistribution['on-track'] ?? 0;

  return {
    totalBudget,
    totalSpend,
    totalExpected,
    totalProjected,
    portfolioDiffPct,
    portfolioPacingPct,
    budgetUtilization,
    statusDistribution,
    clientsAtRisk,
    clientsOnTrack,
  };
}

// ---------------------------------------------------------------------------
// Sparkline data — simulated daily spend curve for a row
// ---------------------------------------------------------------------------

export function buildSparklineData(
  row: BudgetPacingCalculatedRow,
  ctx: CalendarContext,
): SparklinePoint[] {
  const points: SparklinePoint[] = [];
  const dailyBudget = row.monthBudget / ctx.daysInMonth;

  for (let day = 1; day <= ctx.daysInMonth; day++) {
    const expectedSpend = dailyBudget * day;

    // For past days: interpolate actual spend with slight variance
    let actualSpend: number | undefined;
    if (day <= ctx.daysPassed) {
      const fraction = day / ctx.daysPassed;
      // Apply a slight S-curve: accelerate or decelerate based on status
      const drift = row.diffPercentage / 100;
      actualSpend = row.actualSpend * Math.pow(fraction, 1 - drift * 0.3);
    }

    points.push({
      day,
      expectedSpend: Math.round(expectedSpend),
      actualSpend: actualSpend !== undefined ? Math.round(actualSpend) : 0,
      label: `Day ${day}`,
    });
  }

  return points;
}

// ---------------------------------------------------------------------------
// Portfolio-level sparkline (sum across all rows)
// ---------------------------------------------------------------------------

export function buildPortfolioSparkline(
  rows: BudgetPacingCalculatedRow[],
  ctx: CalendarContext,
): SparklinePoint[] {
  const totalBudget = rows.reduce((s, r) => s + r.monthBudget, 0);
  const dailyBudget = totalBudget / ctx.daysInMonth;

  return Array.from({ length: ctx.daysInMonth }, (_, i) => {
    const day = i + 1;
    const expectedSpend = dailyBudget * day;
    const actualSpend =
      day <= ctx.daysPassed
        ? rows.reduce((s, r) => {
            const fraction = day / ctx.daysPassed;
            const drift = r.diffPercentage / 100;
            return s + r.actualSpend * Math.pow(fraction, 1 - drift * 0.3);
          }, 0)
        : 0;

    return {
      day,
      expectedSpend: Math.round(expectedSpend),
      actualSpend: day <= ctx.daysPassed ? Math.round(actualSpend) : 0,
      label: `May ${day}`,
    };
  });
}
