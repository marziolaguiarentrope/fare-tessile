'use client';

import { useMemo, useState } from 'react';
import { SupermetricsCampaignRow } from '@/types/supermetrics';
import { TrendChart } from '@/features/campaigns/components/trend-chart';
import { CampaignBarChart } from '@/features/campaigns/components/campaign-bar-chart';
import {
  aggregateKpis,
  applyCascadedFilters,
  detectResultType,
  formatMetric,
  getCascadedOptions,
  getResultCount,
  MetricKey,
  METRIC_OPTIONS,
  RESULT_TYPE_LABELS,
  rollupRows,
} from '@/features/campaigns/lib/campaign-utils';
import { money } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

type AccountOption = { id: string; name: string; source: 'supermetrics' | 'local' };
type DateRangeType = 'last_x_days' | 'last_x_days_inc' | 'this_month' | 'this_month_inc' | 'last_month' | 'yesterday' | 'custom';
type Breakdown = 'none' | 'day' | 'week' | 'month';
type ApiErrorPayload = { message?: string; reconnectSteps?: string[]; requestId?: string; loginUrl?: string | null };
type SortDir = 'asc' | 'desc';

const TABLE_COLS: { key: keyof SupermetricsCampaignRow; label: string }[] = [
  { key: 'campaignName',     label: 'Campaign' },
  { key: 'adGroupName',      label: 'Ad Group' },
  { key: 'adName',           label: 'Ad' },
  { key: 'impressions',      label: 'Impressions' },
  { key: 'reach',            label: 'Reach' },
  { key: 'clicks',           label: 'Clicks' },
  { key: 'spend',            label: 'Spend' },
  { key: 'results',          label: 'Results' },
  { key: 'ctr',              label: 'CTR' },
  { key: 'cpc',              label: 'CPC' },
  { key: 'cpm',              label: 'CPM' },
  { key: 'cpr',              label: 'CPR' },
  { key: 'frequency',        label: 'Freq.' },
  { key: 'videoViews',       label: 'Video Views' },
  { key: 'landingPageViews', label: 'LPV' },
  { key: 'roas',             label: 'ROAS' },
];

function formatCell(key: keyof SupermetricsCampaignRow, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (key === 'ctr') return `${(Number(value) * 100).toFixed(2)}%`;
  if (['spend', 'cpc', 'cpm', 'cpr'].includes(key)) return money(Number(value));
  if (key === 'roas')      return `${Number(value).toFixed(2)}x`;
  if (key === 'frequency') return Number(value).toFixed(2);
  if (typeof value === 'number') return value.toLocaleString('en-US');
  return String(value);
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CampaignsWorkbench() {
  // Data source + date controls
  const [dsId, setDsId]                     = useState<'FA' | 'AW'>('FA');
  const [dateRangeType, setDateRangeType]   = useState<DateRangeType>('last_x_days');
  const [dateRangeValue, setDateRangeValue] = useState(30);
  const [startDate, setStartDate]           = useState('');
  const [endDate, setEndDate]               = useState('');
  const [breakdown, setBreakdown]           = useState<Breakdown>('day');

  // Remote data
  const [supermetricsOptions, setSupermetricsOptions] = useState<AccountOption[]>([]);
  const [selectedAccounts, setSelectedAccounts]       = useState<string[]>([]);
  const [rawRows, setRawRows]                         = useState<SupermetricsCampaignRow[]>([]);
  const [apiBreakdown, setApiBreakdown]               = useState<Breakdown>('none');

  // Loading / error
  const [loading, setLoading]           = useState(false);
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [errorSteps, setErrorSteps]     = useState<string[]>([]);
  const [requestId, setRequestId]       = useState<string | null>(null);
  const [loginUrl, setLoginUrl]         = useState<string | null>(null);

  // Cascaded dimension filters
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [selectedAdGroups, setSelectedAdGroups]   = useState<string[]>([]);
  const [selectedAds, setSelectedAds]             = useState<string[]>([]);

  // Chart / metric selection
  const [primaryMetric, setPrimaryMetric]     = useState<MetricKey>('spend');
  const [secondaryMetric, setSecondaryMetric] = useState<MetricKey | 'none'>('results');

  // Table sort
  const [sortKey, setSortKey] = useState<keyof SupermetricsCampaignRow>('spend');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // ── Derived state ─────────────────────────────────────────────────────────

  const resultType = useMemo(() => detectResultType(rawRows), [rawRows]);
  const resultLabel = RESULT_TYPE_LABELS[resultType];

  const rolledRows = useMemo(() => {
    if (apiBreakdown === 'day' && (breakdown === 'week' || breakdown === 'month')) {
      return rollupRows(rawRows, breakdown);
    }
    return rawRows;
  }, [rawRows, apiBreakdown, breakdown]);

  const { allCampaigns, allAdGroups, allAds } = useMemo(
    () => getCascadedOptions(rolledRows, selectedCampaigns, selectedAdGroups),
    [rolledRows, selectedCampaigns, selectedAdGroups]
  );

  const filteredRows = useMemo(
    () => applyCascadedFilters(rolledRows, selectedCampaigns, selectedAdGroups, selectedAds),
    [rolledRows, selectedCampaigns, selectedAdGroups, selectedAds]
  );

  const kpis = useMemo(() => aggregateKpis(filteredRows, resultType), [filteredRows, resultType]);

  const trendData = useMemo(() => {
    if (apiBreakdown === 'none') return [];
    const byDate = new Map<string, { spend: number; impressions: number; clicks: number; results: number; reach: number; videoViews: number; landingPageViews: number }>();
    for (const r of filteredRows) {
      if (!r.date) continue;
      if (!byDate.has(r.date)) byDate.set(r.date, { spend: 0, impressions: 0, clicks: 0, results: 0, reach: 0, videoViews: 0, landingPageViews: 0 });
      const e = byDate.get(r.date)!;
      e.spend            += r.spend;
      e.impressions      += r.impressions;
      e.clicks           += r.clicks;
      e.results          += getResultCount(r, resultType);
      e.reach            += r.reach;
      e.videoViews       += r.videoViews;
      e.landingPageViews += r.landingPageViews;
    }
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, e]) => ({
        date,
        spend:            e.spend,
        impressions:      e.impressions,
        reach:            e.reach,
        clicks:           e.clicks,
        results:          e.results,
        videoViews:       e.videoViews,
        landingPageViews: e.landingPageViews,
        ctr:  e.impressions > 0 ? (e.clicks / e.impressions) * 100 : 0,
        cpc:  e.clicks > 0      ? e.spend / e.clicks : 0,
        cpm:  e.impressions > 0 ? (e.spend / e.impressions) * 1000 : 0,
        cpr:  e.results > 0     ? e.spend / e.results : 0,
        roas: 0,
        frequency: 0,
      }));
  }, [filteredRows, apiBreakdown, resultType]);

  const barData = useMemo(() => {
    const byCampaign = new Map<string, number>();
    for (const r of filteredRows) {
      const name = r.campaignName ?? '(unknown)';
      const val = primaryMetric === 'ctr'
        ? (r.ctr * 100)
        : (r[primaryMetric as keyof SupermetricsCampaignRow] as number) ?? 0;
      byCampaign.set(name, (byCampaign.get(name) ?? 0) + val);
    }
    return Array.from(byCampaign.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);
  }, [filteredRows, primaryMetric]);

  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredRows, sortKey, sortDir]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const loadAccounts = async () => {
    setLoading(true);
    setError(null); setErrorSteps([]); setRequestId(null); setLoginUrl(null);
    try {
      const res = await fetch(`/api/integrations/supermetrics/accounts?dsId=${encodeURIComponent(dsId)}`);
      const payload = await res.json() as { data?: Array<{ accounts: Array<{ account_id: string; account_name: string }> }> } & ApiErrorPayload;
      if (!res.ok) {
        setErrorSteps(payload.reconnectSteps ?? []); setRequestId(payload.requestId ?? null); setLoginUrl(payload.loginUrl ?? null);
        throw new Error(payload.message || 'Could not load accounts');
      }
      setSupermetricsOptions(
        (payload.data ?? []).flatMap((row) => row.accounts).map((a) => ({
          id: `sm:${a.account_id}`, name: a.account_name, source: 'supermetrics' as const
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const loadCampaignData = async () => {
    setCampaignLoading(true);
    setError(null); setErrorSteps([]); setRequestId(null); setLoginUrl(null);
    try {
      const accountIds = supermetricsOptions
        .filter((o) => selectedAccounts.includes(o.name))
        .map((o) => o.id.replace('sm:', ''));
      if (!accountIds.length) { setCampaignLoading(false); return; }

      const res = await fetch('/api/integrations/supermetrics/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dsId, accountIds, dateRangeType, dateRangeValue, startDate: startDate || undefined, endDate: endDate || undefined, breakdown })
      });
      const payload = await res.json() as { data?: SupermetricsCampaignRow[]; breakdown?: Breakdown } & ApiErrorPayload;
      if (!res.ok) {
        setErrorSteps(payload.reconnectSteps ?? []); setRequestId(payload.requestId ?? null); setLoginUrl(payload.loginUrl ?? null);
        throw new Error(payload.message || 'Could not load campaign metrics');
      }
      setRawRows(payload.data ?? []);
      setApiBreakdown(payload.breakdown ?? 'none');
      setSelectedCampaigns([]); setSelectedAdGroups([]); setSelectedAds([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setCampaignLoading(false);
    }
  };

  function handleSort(key: keyof SupermetricsCampaignRow) {
    if (key === sortKey) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  function handleCampaignChange(values: string[]) {
    setSelectedCampaigns(values); setSelectedAdGroups([]); setSelectedAds([]);
  }
  function handleAdGroupChange(values: string[]) {
    setSelectedAdGroups(values); setSelectedAds([]);
  }

  const hasData = rawRows.length > 0;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Campaigns</h2>

      {/* ── Controls ── */}
      <article className="card space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          {/* Data source */}
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Data source</label>
            <select value={dsId} onChange={(e) => setDsId(e.target.value as 'FA' | 'AW')} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
              <option value="FA">Meta Ads (FA)</option>
              <option value="AW">Google Ads (AW)</option>
            </select>
          </div>

          {/* Date range type */}
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Date range</label>
            <select value={dateRangeType} onChange={(e) => setDateRangeType(e.target.value as DateRangeType)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
              <option value="last_x_days">Last X days (excl. today)</option>
              <option value="last_x_days_inc">Last X days (incl. today)</option>
              <option value="this_month">This month</option>
              <option value="this_month_inc">This month incl. today</option>
              <option value="last_month">Last month</option>
              <option value="yesterday">Yesterday</option>
              <option value="custom">Custom range</option>
            </select>
          </div>

          {dateRangeType.startsWith('last_x_') && (
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Days</label>
              <input type="number" min={1} value={dateRangeValue} onChange={(e) => setDateRangeValue(Number(e.target.value) || 30)} className="w-20 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" />
            </div>
          )}
          {dateRangeType === 'custom' && (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Start date</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">End date</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" />
              </div>
            </>
          )}

          {/* Breakdown */}
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Breakdown</label>
            <select value={breakdown} onChange={(e) => setBreakdown(e.target.value as Breakdown)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
              <option value="none">None (totals)</option>
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
            </select>
          </div>

          <button onClick={loadAccounts} disabled={loading} className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60">
            {loading ? 'Loading…' : 'Load Accounts'}
          </button>
        </div>

        {/* Account multi-select */}
        {supermetricsOptions.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Account filter</p>
            <div className="grid max-h-40 grid-cols-2 gap-2 overflow-auto rounded-md border border-slate-200 p-3">
              {supermetricsOptions.map((opt) => (
                <label key={opt.id} className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={selectedAccounts.includes(opt.name)} onChange={() => setSelectedAccounts((prev) => prev.includes(opt.name) ? prev.filter((n) => n !== opt.name) : [...prev, opt.name])} className="h-4 w-4 rounded border-slate-300" />
                  <span>{opt.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <button onClick={loadCampaignData} disabled={campaignLoading || selectedAccounts.length === 0} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-60">
          {campaignLoading ? 'Loading campaign metrics…' : 'Load Campaign Metrics'}
        </button>

        {/* Error panel */}
        {error && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <p>{error}</p>
            {errorSteps.length > 0 && <ol className="mt-2 list-decimal space-y-1 pl-5">{errorSteps.map((s) => <li key={s}>{s}</li>)}</ol>}
            {requestId && <p className="mt-2 text-xs text-rose-500">Request ID: {requestId}</p>}
            {loginUrl && <a href={loginUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-md bg-rose-700 px-3 py-2 text-xs font-semibold text-white">Abrir link de autenticação</a>}
          </div>
        )}
      </article>

      {/* ── Dimension filters ── */}
      {hasData && (
        <article className="card space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-slate-700">Dimension filters</p>
            {resultType !== 'unknown' && (
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                Result type: {resultLabel}
              </span>
            )}
            {(selectedCampaigns.length > 0 || selectedAdGroups.length > 0 || selectedAds.length > 0) && (
              <button onClick={() => { setSelectedCampaigns([]); setSelectedAdGroups([]); setSelectedAds([]); }} className="ml-auto text-xs text-slate-500 underline hover:text-slate-700">
                Clear all filters
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <FilterSelect
              label="Campaign"
              options={allCampaigns}
              selected={selectedCampaigns}
              onChange={handleCampaignChange}
            />
            <FilterSelect
              label="Ad Group"
              options={allAdGroups}
              selected={selectedAdGroups}
              onChange={handleAdGroupChange}
            />
            <FilterSelect
              label="Ad"
              options={allAds}
              selected={selectedAds}
              onChange={setSelectedAds}
            />
          </div>
        </article>
      )}

      {/* ── KPI cards ── */}
      {hasData && (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <KpiCard label="Spend"       value={money(kpis.spend)} />
          <KpiCard label="Impressions" value={kpis.impressions.toLocaleString('en-US')} />
          <KpiCard label="Reach"       value={kpis.reach > 0 ? kpis.reach.toLocaleString('en-US') : '—'} />
          <KpiCard label="Clicks"      value={kpis.clicks.toLocaleString('en-US')} />
          <KpiCard label="CTR"         value={`${kpis.ctr.toFixed(2)}%`} />
          <KpiCard label="CPC"         value={money(kpis.cpc)} />
          <KpiCard label={`Results (${resultLabel})`} value={kpis.results.toLocaleString('en-US')} />
          <KpiCard label="CPR"         value={kpis.cpr > 0 ? money(kpis.cpr) : '—'} />
        </div>
      )}

      {/* ── Charts ── */}
      {hasData && (
        <article className="card space-y-4">
          {/* Metric selector */}
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Primary metric</label>
              <select value={primaryMetric} onChange={(e) => setPrimaryMetric(e.target.value as MetricKey)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
                {METRIC_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Secondary metric</label>
              <select value={secondaryMetric} onChange={(e) => setSecondaryMetric(e.target.value as MetricKey | 'none')} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="none">— none —</option>
                {METRIC_OPTIONS.filter((m) => m.value !== primaryMetric).map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            {apiBreakdown === 'day' && (breakdown === 'week' || breakdown === 'month') && (
              <p className="text-xs text-slate-400">Showing {breakdown}ly rollup from daily data</p>
            )}
            {apiBreakdown !== 'none' && (
              <p className="ml-auto text-xs text-slate-400">{trendData.length} {apiBreakdown === 'day' ? 'days' : 'periods'} · {filteredRows.length} rows</p>
            )}
          </div>

          {/* Trend chart */}
          {trendData.length > 0 && (
            <TrendChart
              data={trendData}
              primaryMetric={primaryMetric}
              secondaryMetric={secondaryMetric}
            />
          )}

          {/* Campaign comparison */}
          <CampaignBarChart data={barData} metric={primaryMetric} />
        </article>
      )}

      {/* ── Data table ── */}
      {hasData && (
        <article className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {TABLE_COLS.map(({ key, label }) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    className="cursor-pointer select-none whitespace-nowrap px-3 py-2 text-left text-xs font-medium text-slate-500 hover:text-slate-800"
                  >
                    {key === 'results' ? `${label} (${resultLabel})` : label}
                    {sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedRows.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  {TABLE_COLS.map(({ key }) => (
                    <td key={key} className="max-w-[200px] truncate whitespace-nowrap px-3 py-2 text-slate-700" title={String(row[key] ?? '')}>
                      {formatCell(key, row[key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {sortedRows.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">No rows match the current filters.</p>
          )}
        </article>
      )}
    </section>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="card">
      <p className="text-xs text-slateate-500 truncate">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </article>
  );
}

function FilterSelect({
  label, options, selected, onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  if (options.length === 0) return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-xs text-slate-400">No options available</p>
    </div>
  );
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        {selected.length > 0 && (
          <button onClick={() => onChange([])} className="text-xs text-slate-400 hover:text-slate-600">Clear</button>
        )}
      </div>
      <select
        multiple
        size={Math.min(6, options.length)}
        value={selected}
        onChange={(e) => onChange(Array.from(e.target.selectedOptions, (o) => o.value))}
        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      {selected.length > 0 && (
        <p className="mt-1 text-xs text-indigo-600">{selected.length} selected</p>
      )}
    </div>
  );
}
