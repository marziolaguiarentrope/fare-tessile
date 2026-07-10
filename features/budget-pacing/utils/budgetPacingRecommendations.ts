import type { BudgetPacingCalculatedRow, PacingAlert, PacingRecommendation } from '../types/budgetPacing';
import { fmtCurrency } from './budgetPacingFormatting';

// ---------------------------------------------------------------------------
// Auto-generated alerts
// ---------------------------------------------------------------------------

export function buildAlerts(rows: BudgetPacingCalculatedRow[]): PacingAlert[] {
  const alerts: PacingAlert[] = [];

  for (const row of rows) {
    const currency = row.currency;

    if (row.status === 'critical-under') {
      alerts.push({
        id: `${row.id}-alert`,
        client: row.client,
        platform: row.platform,
        status: row.status,
        severity: 'high',
        message: `${row.client} is severely under-pacing on ${row.platform}`,
        detail: `Spend is ${fmtCurrency(Math.abs(row.diffAmount), currency)} below the expected pace (${row.diffPercentage.toFixed(1)}%). Projected end-of-month: ${fmtCurrency(row.projectedMonthEndSpend, currency)} vs budget ${fmtCurrency(row.monthBudget, currency)}.`,
      });
    } else if (row.status === 'critical-over') {
      alerts.push({
        id: `${row.id}-alert`,
        client: row.client,
        platform: row.platform,
        status: row.status,
        severity: 'high',
        message: `${row.client} is critically over-pacing on ${row.platform}`,
        detail: `Spend is ${fmtCurrency(row.diffAmount, currency)} above the expected pace (+${row.diffPercentage.toFixed(1)}%). Projected end-of-month: ${fmtCurrency(row.projectedMonthEndSpend, currency)} vs budget ${fmtCurrency(row.monthBudget, currency)}.`,
      });
    } else if (row.status === 'under-pacing') {
      alerts.push({
        id: `${row.id}-alert`,
        client: row.client,
        platform: row.platform,
        status: row.status,
        severity: 'medium',
        message: `${row.client} is under-pacing on ${row.platform}`,
        detail: `${row.diffPercentage.toFixed(1)}% below expected. Needs ${fmtCurrency(row.recommendedDailySpend, currency)}/day to finish on budget.`,
      });
    } else if (row.status === 'over-pacing') {
      alerts.push({
        id: `${row.id}-alert`,
        client: row.client,
        platform: row.platform,
        status: row.status,
        severity: 'medium',
        message: `${row.client} is over-pacing on ${row.platform}`,
        detail: `+${row.diffPercentage.toFixed(1)}% above expected. Recommended daily spend to stay on budget: ${fmtCurrency(row.recommendedDailySpend, currency)}.`,
      });
    }
  }

  // Sort: high severity first, then by absolute diff percentage
  return alerts.sort((a, b) => {
    if (a.severity !== b.severity) {
      return a.severity === 'high' ? -1 : 1;
    }
    return 0;
  });
}

// ---------------------------------------------------------------------------
// Auto-generated recommendations
// ---------------------------------------------------------------------------

export function buildRecommendations(rows: BudgetPacingCalculatedRow[]): PacingRecommendation[] {
  const recs: PacingRecommendation[] = [];

  for (const row of rows) {
    const currency = row.currency;
    const adjStr =
      row.dailyAdjustmentNeeded > 0
        ? `+${fmtCurrency(row.dailyAdjustmentNeeded, currency)}`
        : fmtCurrency(row.dailyAdjustmentNeeded, currency);

    switch (row.status) {
      case 'critical-under':
        recs.push({
          id: `${row.id}-rec`,
          client: row.client,
          platform: row.platform,
          status: row.status,
          action: `Increase ${row.platform} daily budget by ${adjStr}/day`,
          rationale: `At the current spend rate, ${row.client} will only deliver ${fmtCurrency(row.projectedMonthEndSpend, currency)} of its ${fmtCurrency(row.monthBudget, currency)} budget — a ${Math.abs(row.diffPercentage).toFixed(0)}% shortfall. Consider expanding targeting, raising bids, or reviewing campaign status.`,
          impact: 'high',
        });
        break;

      case 'under-pacing':
        recs.push({
          id: `${row.id}-rec`,
          client: row.client,
          platform: row.platform,
          status: row.status,
          action: `Adjust ${row.platform} daily spend to ${fmtCurrency(row.recommendedDailySpend, currency)}/day`,
          rationale: `${row.client} is ${Math.abs(row.diffPercentage).toFixed(1)}% below pace. A ${adjStr} daily adjustment will bring delivery back on track by month-end.`,
          impact: 'medium',
        });
        break;

      case 'over-pacing':
        recs.push({
          id: `${row.id}-rec`,
          client: row.client,
          platform: row.platform,
          status: row.status,
          action: `Reduce ${row.platform} daily budget to ${fmtCurrency(row.recommendedDailySpend, currency)}/day`,
          rationale: `${row.client} is ${row.diffPercentage.toFixed(1)}% above pace. Reducing the daily cap will prevent over-delivery and protect the monthly budget.`,
          impact: 'medium',
        });
        break;

      case 'critical-over':
        recs.push({
          id: `${row.id}-rec`,
          client: row.client,
          platform: row.platform,
          status: row.status,
          action: `Immediately cap ${row.platform} spend — reduce to ${fmtCurrency(row.recommendedDailySpend, currency)}/day`,
          rationale: `${row.client} is projecting ${fmtCurrency(row.projectedMonthEndSpend, currency)} by month-end — ${fmtCurrency(row.projectedMonthEndSpend - row.monthBudget, currency)} over budget. Immediate action required to prevent budget overrun.`,
          impact: 'high',
        });
        break;

      case 'on-track':
        recs.push({
          id: `${row.id}-rec`,
          client: row.client,
          platform: row.platform,
          status: row.status,
          action: `No action required — monitor ${row.platform} daily`,
          rationale: `${row.client} is within ±7% of the expected pace. Current daily spend of ${fmtCurrency(row.dailyAverageSoFar, currency)} is healthy.`,
          impact: 'low',
        });
        break;

      default:
        break;
    }
  }

  // Sort: high impact first
  return recs.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.impact] - order[b.impact];
  });
}
