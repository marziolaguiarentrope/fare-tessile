import { SupermetricsCampaignRow } from '@/types/supermetrics';
import { money } from '@/lib/utils';

// ── Result type ───────────────────────────────────────────────────────────────

export type ResultType = 'leads' | 'purchases' | 'landingPageViews' | 'videoViews' | 'results' | 'unknown';

export const RESULT_TYPE_LABELS: Record<ResultType, string> = {
  leads: 'Leads',
  purchases: 'Purchases',
  landingPageViews: 'Landing Page Views',
  videoViews: 'Video Views',
  results: 'Results',
  unknown: 'Results',
};

const OBJECTIVE_KEYWORDS: Record<ResultType, string[]> = {
  leads:            ['lead', 'lead_generation'],
  purchases:        ['purchase', 'conversions', 'ecommerce', 'sales', 'outcome_sales'],
  landingPageViews: ['traffic', 'landing_page_views', 'lpv', 'link_clicks'],
  videoViews:       ['video_views', 'thruplay', 'video views'],
  results:          ['awareness', 'reach', 'engagement', 'messages', 'brand'],
  unknown:          [],
};

export function detectResultType(rows: SupermetricsCampaignRow[]): ResultType {
  const objectives = rows.map((r) => r.objective?.toLowerCase() ?? '').filter(Boolean);
  const objScore: Record<ResultType, number> = {
    leads: 0, purchases: 0, landingPageViews: 0, videoViews: 0, results: 0, unknown: 0,
  };
  for (const obj of objectives) {
    for (const [type, keywords] of Object.entries(OBJECTIVE_KEYWORDS) as [ResultType, string[]][]) {
      if (keywords.some((kw) => obj.includes(kw))) objScore[type]++;
    }
  }
  const topObj = (Object.entries(objScore) as [ResultType, number][])
    .filter(([k, v]) => v > 0 && k !== 'unknown')
    .sort(([, a], [, b]) => b - a)[0]?.[0];
  if (topObj) return topObj;

  const totals: Record<ResultType, number> = {
    leads:            rows.reduce((s, r) => s + r.leads, 0),
    purchases:        rows.reduce((s, r) => s + r.purchases, 0),
    landingPageViews: rows.reduce((s, r) => s + r.landingPageViews, 0),
    videoViews:       rows.reduce((s, r) => s + r.videoViews, 0),
    results:          rows.reduce((s, r) => s + r.results, 0),
    unknown:          0,
  };
  const topField = (Object.entries(totals) as [ResultType, number][])
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)[0]?.[0];
  return topField ?? 'unknown';
}

export function getResultCount(row: SupermetricsCampaignRow, type: ResultType): number {
  if (type === 'leads')            return row.leads || row.results;
  if (type === 'purchases')        return row.purchases || row.results;
  if (type === 'landingPageViews') return row.landingPageViews || row.results;
  if (type === 'videoViews')       return row.videoViews || row.results;
  return row.results;
}

// ── Date rollup ───────────────────────────────────────────────────────────────

function periodKey(dateStr: string, period: 'week' | 'month'): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  if (period === 'month') {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  }
  const day = d.getUTCDay() || 7;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - (day - 1));
  return monday.toISOString().slice(0, 10);
}

export function rollupRows(
  rows: SupermetricsCampaignRow[],
  period: 'week' | 'month'
): SupermetricsCampaignRow[] {
  const buckets = new Map<string, SupermetricsCampaignRow[]>();
  for (const row of rows) {
    if (!row.date) continue;
    const pk = periodKey(row.date, period);
    const key = [pk, row.accountName, row.campaignName, row.adGroupName, row.adName].join('\x00');
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(row);
  }
  return Array.from(buckets.values()).map((group) => {
    const first = group[0];
    const pk = periodKey(first.date!, period);
    const impressions      = group.reduce((s, r) => s + r.impressions, 0);
    const clicks           = group.reduce((s, r) => s + r.clicks, 0);
    const spend            = group.reduce((s, r) => s + r.spend, 0);
    const results          = group.reduce((s, r) => s + r.results, 0);
    const leads            = group.reduce((s, r) => s + r.leads, 0);
    const purchases        = group.reduce((s, r) => s + r.purchases, 0);
    const landingPageViews = group.reduce((s, r) => s + r.landingPageViews, 0);
    const videoViews       = group.reduce((s, r) => s + r.videoViews, 0);
    // Note: reach sums overstate unique reach across days (users counted multiple times)
    const reach            = group.reduce((s, r) => s + r.reach, 0);
    return {
      ...first,
      date: pk,
      impressions,
      clicks,
      spend,
      results,
      leads,
      purchases,
      landingPageViews,
      videoViews,
      reach,
      cpc:       clicks > 0      ? spend / clicks : 0,
      ctr:       impressions > 0 ? clicks / impressions : 0,
      cpm:       impressions > 0 ? (spend / impressions) * 1000 : 0,
      frequency: reach > 0       ? impressions / reach : 0,
      roas:      spend > 0       ? purchases / spend : 0,
      cpr:       results > 0     ? spend / results : 0,
    } satisfies SupermetricsCampaignRow;
  }).sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
}

// ── Cascaded filters ──────────────────────────────────────────────────────────

export function applyCascadedFilters(
  rows: SupermetricsCampaignRow[],
  campaigns: string[],
  adGroups: string[],
  ads: string[]
): SupermetricsCampaignRow[] {
  return rows.filter((r) => {
    if (campaigns.length && !campaigns.includes(r.campaignName ?? '')) return false;
    if (adGroups.length  && !adGroups.includes(r.adGroupName ?? ''))   return false;
    if (ads.length       && !ads.includes(r.adName ?? ''))             return false;
    return true;
  });
}

export function getCascadedOptions(
  rows: SupermetricsCampaignRow[],
  selectedCampaigns: string[],
  selectedAdGroups: string[]
) {
  const allCampaigns = [...new Set(rows.map((r) => r.campaignName).filter(Boolean))] as string[];
  const afterCampaign = selectedCampaigns.length
    ? rows.filter((r) => selectedCampaigns.includes(r.campaignName ?? ''))
    : rows;
  const allAdGroups = [...new Set(afterCampaign.map((r) => r.adGroupName).filter(Boolean))] as string[];
  const afterAdGroup = selectedAdGroups.length
    ? afterCampaign.filter((r) => selectedAdGroups.includes(r.adGroupName ?? ''))
    : afterCampaign;
  const allAds = [...new Set(afterAdGroup.map((r) => r.adName).filter(Boolean))] as string[];
  return { allCampaigns, allAdGroups, allAds };
}

// ── KPI aggregation ───────────────────────────────────────────────────────────

export function aggregateKpis(rows: SupermetricsCampaignRow[], resultType: ResultType) {
  const spend       = rows.reduce((s, r) => s + r.spend, 0);
  const impressions = rows.reduce((s, r) => s + r.impressions, 0);
  const reach       = rows.reduce((s, r) => s + r.reach, 0);
  const clicks      = rows.reduce((s, r) => s + r.clicks, 0);
  const results     = rows.reduce((s, r) => s + getResultCount(r, resultType), 0);
  return {
    spend,
    impressions,
    reach,
    clicks,
    ctr:    impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpc:    clicks > 0      ? spend / clicks : 0,
    results,
    cpr:    results > 0     ? spend / results : 0,
  };
}

// ── Metric catalogue ──────────────────────────────────────────────────────────

export type MetricKey =
  | 'spend' | 'impressions' | 'reach' | 'clicks'
  | 'ctr' | 'cpc' | 'results' | 'cpr' | 'roas'
  | 'videoViews' | 'landingPageViews' | 'frequency' | 'cpm';

export const METRIC_OPTIONS: { value: MetricKey; label: string; color: string }[] = [
  { value: 'spend',            label: 'Spend',               color: '#6366f1' },
  { value: 'impressions',      label: 'Impressions',          color: '#8b5cf6' },
  { value: 'reach',            label: 'Reach',                color: '#a78bfa' },
  { value: 'clicks',           label: 'Clicks',               color: '#3b82f6' },
  { value: 'landingPageViews', label: 'Landing Page Views',   color: '#06b6d4' },
  { value: 'results',          label: 'Results',              color: '#10b981' },
  { value: 'videoViews',       label: 'Video Views',          color: '#f59e0b' },
  { value: 'ctr',              label: 'CTR (%)',              color: '#ef4444' },
  { value: 'cpc',              label: 'CPC ($)',              color: '#ec4899' },
  { value: 'cpm',              label: 'CPM ($)',              color: '#f97316' },
  { value: 'cpr',              label: 'CPR ($)',              color: '#14b8a6' },
  { value: 'roas',             label: 'ROAS',                 color: '#84cc16' },
  { value: 'frequency',        label: 'Frequency',            color: '#64748b' },
];

export const BAR_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function formatMetric(key: MetricKey | string, value: number): string {
  if (['spend', 'cpc', 'cpr', 'cpm'].includes(key)) return money(value);
  if (key === 'ctr')       return `${value.toFixed(2)}%`;
  if (key === 'roas')      return `${value.toFixed(2)}x`;
  if (key === 'frequency') return value.toFixed(2);
  return value.toLocaleString('en-US');
}
