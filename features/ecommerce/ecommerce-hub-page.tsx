'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarRange, ChevronRight, ExternalLink, ShoppingBag } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import type {
  ShopifyTimeSeriesRow, ShopifyProductRow, ShopifyLocationRow,
  ShopifyFieldGap, ShopifyQueryMeta,
} from '@/types/shopify';

// ── Constants ─────────────────────────────────────────────────────────────────

const DS_ID = 'SHP';

const SHOPIFY_GREEN = '#96BF48';
const BAR_PALETTE   = ['#071428','#020617','#0B1F3A','#1E3A8A','#2563EB','#38BDF8','#60A5FA'];

// ── Types ─────────────────────────────────────────────────────────────────────

interface Account { id: string; name: string; dsUser: string; }

type DatePreset = 'today' | 'yesterday' | 'last_7' | 'last_30' | 'this_month' | 'last_month' | 'custom';

const PRESET_LABELS: Record<DatePreset, string> = {
  today: 'Today', yesterday: 'Yesterday', last_7: 'Last 7 days',
  last_30: 'Last 30 days', this_month: 'This month', last_month: 'Last month', custom: 'Custom…',
};

type SortDir = 'asc' | 'desc';

// ── Date helpers ──────────────────────────────────────────────────────────────

function toYMD(d: Date) { return d.toISOString().slice(0, 10); }

function resolveRange(preset: DatePreset, customStart: string, customEnd: string) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  if (preset === 'today')      return { start: toYMD(now), end: toYMD(now) };
  if (preset === 'yesterday') { const d = new Date(now); d.setDate(d.getDate() - 1); const s = toYMD(d); return { start: s, end: s }; }
  if (preset === 'last_7')    { const d = new Date(now); d.setDate(d.getDate() - 6); return { start: toYMD(d), end: toYMD(now) }; }
  if (preset === 'last_30')   { const d = new Date(now); d.setDate(d.getDate() - 29); return { start: toYMD(d), end: toYMD(now) }; }
  if (preset === 'this_month') return { start: toYMD(new Date(y, m, 1)), end: toYMD(now) };
  if (preset === 'last_month') return { start: toYMD(new Date(y, m - 1, 1)), end: toYMD(new Date(y, m, 0)) };
  return { start: customStart || toYMD(now), end: customEnd || toYMD(now) };
}

function normalizeDate(raw: string): string {
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const mdY = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mdY) return `${mdY[3]}-${mdY[1].padStart(2, '0')}-${mdY[2].padStart(2, '0')}`;
  return s.slice(0, 10);
}

// ── Formatting ────────────────────────────────────────────────────────────────

const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const moneyFull = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  return money(n);
};

const moneyCompact = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}k`;
  return money(n);
};

const pct = (n: number, decimals = 1) => `${(n * 100).toFixed(decimals)}%`;

// ── KPI block ─────────────────────────────────────────────────────────────────

function KpiBlock({
  label, value, sub, unavailable,
}: { label: string; value: string; sub?: string; unavailable?: boolean }) {
  return (
    <article className="card">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      {unavailable ? (
        <p className="mt-1 text-base font-semibold text-slate-300">N/A</p>
      ) : (
        <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      )}
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </article>
  );
}

// ── Gap notice ────────────────────────────────────────────────────────────────

function GapNotice({ gaps }: { gaps: ShopifyFieldGap[] }) {
  if (gaps.length === 0) return null;
  return (
    <details className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
      <summary className="cursor-pointer font-semibold select-none flex items-center gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5" />
        {gaps.length} field gap{gaps.length > 1 ? 's' : ''} — some metrics unavailable from SHP schema
      </summary>
      <ul className="mt-2 space-y-1.5 list-none">
        {gaps.map((g) => (
          <li key={g.field}>
            <strong className="font-semibold">{g.field}:</strong> {g.description}
            <br />
            <span className="text-amber-600">Suggestion: {g.suggestion}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────────────────

function SkeletonKpis({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card animate-pulse">
          <div className="h-3 w-20 rounded bg-slate-200 mb-3" />
          <div className="h-7 w-28 rounded bg-slate-200" />
        </div>
      ))}
    </>
  );
}

// ── Table sort helper ─────────────────────────────────────────────────────────

type TableSortKey = 'date' | 'storeName' | 'revenue' | 'orders' | 'aov' | 'sessions' | 'conversionRate';

// ── Main component ────────────────────────────────────────────────────────────

export function EcommerceHubPage() {
  // ── Accounts ──────────────────────────────────────────────────────────────

  const [accounts, setAccounts]       = useState<Account[]>([]);
  const [acctLoading, setAcctLoading] = useState(true);
  const [acctError, setAcctError]     = useState<string | null>(null);
  const [loginUrl, setLoginUrl]       = useState<string | null>(null);
  const [reconnectSteps, setReconnectSteps] = useState<string[]>([]);

  // ── Data ──────────────────────────────────────────────────────────────────

  const [timeseries, setTimeseries]         = useState<ShopifyTimeSeriesRow[]>([]);
  const [products, setProducts]             = useState<ShopifyProductRow[]>([]);
  const [locations, setLocations]           = useState<ShopifyLocationRow[]>([]);
  const [timeseriesMeta, setTimeseriesMeta] = useState<ShopifyQueryMeta | null>(null);

  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError]     = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // ── Filters ───────────────────────────────────────────────────────────────

  const [preset, setPreset]           = useState<DatePreset>('last_30');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd]     = useState('');
  const [storeFilter, setStoreFilter] = useState<string>('all');

  const range = useMemo(() => resolveRange(preset, customStart, customEnd), [preset, customStart, customEnd]);

  // ── ds_id override (same pattern as Overview) ─────────────────────────────

  const [dsId, setDsId]             = useState(DS_ID);
  const [dsIdInput, setDsIdInput]   = useState('');
  const [acctTrigger, setAcctTrigger] = useState(0);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('Fare Tessile-shopify-dsid');
      if (stored) { setDsId(stored); setDsIdInput(stored); }
    } catch {}
  }, []);

  // ── Table sort ────────────────────────────────────────────────────────────

  const [sortKey, setSortKey]   = useState<TableSortKey>('date');
  const [sortDir, setSortDir]   = useState<SortDir>('desc');
  const [tablePage, setTablePage] = useState(0);
  const TABLE_PAGE_SIZE = 25;

  // ── Load accounts ─────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      setAcctLoading(true);
      setAcctError(null);
      setLoginUrl(null);
      setReconnectSteps([]);

      try {
        const r = await fetch(`/api/integrations/supermetrics/accounts?dsId=${dsId}`);
        const j = await r.json() as {
          data?: Array<{ ds_user: string; accounts: Array<{ account_id: string; account_name: string }> }>;
          message?: string;
          reconnectSteps?: string[];
          loginUrl?: string | null;
        };
        if (!r.ok) {
          setAcctError(j.message ?? `Failed to load Shopify accounts`);
          setReconnectSteps(j.reconnectSteps ?? []);
          setLoginUrl(j.loginUrl ?? null);
          setAccounts([]);
        } else {
          const loaded: Account[] = [];
          for (const g of j.data ?? []) {
            for (const a of g.accounts ?? []) {
              loaded.push({ id: a.account_id, name: a.account_name, dsUser: g.ds_user });
            }
          }
          setAccounts(loaded);
        }
      } catch (e) {
        setAcctError(e instanceof Error ? e.message : 'Failed to load accounts');
        setAccounts([]);
      } finally {
        setAcctLoading(false);
      }
    }
    load();
  }, [dsId, acctTrigger]);

  // ── Load data (timeseries + products + locations) ─────────────────────────

  const loadData = useCallback(async () => {
    if (accounts.length === 0) return;

    setDataLoading(true);
    setDataError(null);

    // Build login groups (same pattern as Overview)
    const byUser = new Map<string, string[]>();
    for (const a of accounts) {
      if (!byUser.has(a.dsUser)) byUser.set(a.dsUser, []);
      byUser.get(a.dsUser)!.push(a.id);
    }
    const loginGroups = Array.from(byUser.entries()).map(([dsUser, accountIds]) => ({ dsUser, accountIds }));

    const body = (reportType: 'timeseries' | 'products' | 'locations') => ({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dsId, loginGroups, startDate: range.start, endDate: range.end, reportType }),
    });

    type ShopifyResponse = {
      data?: unknown[];
      meta?: ShopifyQueryMeta;
      message?: string;
      code?: string;
      reconnectSteps?: string[];
      loginUrl?: string | null;
    };

    const [tsRes, prodRes, locRes] = await Promise.all([
      fetch('/api/integrations/supermetrics/shopify', body('timeseries')),
      fetch('/api/integrations/supermetrics/shopify', body('products')),
      fetch('/api/integrations/supermetrics/shopify', body('locations')),
    ]);

    const [tsJson, prodJson, locJson] = await Promise.all([
      tsRes.json() as Promise<ShopifyResponse>,
      prodRes.json() as Promise<ShopifyResponse>,
      locRes.json() as Promise<ShopifyResponse>,
    ]);

    setDataLoading(false);

    // Primary error from timeseries (most likely to show auth issues)
    if (!tsRes.ok) {
      const j = tsJson;
      setDataError(j.message ?? 'Failed to fetch Shopify data.');
      if (j.reconnectSteps?.length) setReconnectSteps(j.reconnectSteps);
      if (j.loginUrl) setLoginUrl(j.loginUrl);
      return;
    }

    setTimeseries((tsJson.data ?? []) as ShopifyTimeSeriesRow[]);
    setTimeseriesMeta(tsJson.meta ?? null);

    // Products and locations: soft-fail (gap in schema is expected)
    if (prodRes.ok) {
      setProducts(
        ((prodJson.data ?? []) as ShopifyProductRow[])
          .filter((r) => r.product && r.revenue > 0)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 20)
      );
    }
    if (locRes.ok) {
      setLocations(
        ((locJson.data ?? []) as ShopifyLocationRow[])
          .filter((r) => r.country && r.revenue > 0)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 15)
      );
    }

    setLastUpdated(new Date().toLocaleTimeString());
    setTablePage(0);
  }, [accounts, range, dsId]);

  useEffect(() => { if (accounts.length > 0) loadData(); }, [loadData]);

  // ── Derived: available stores for filter ──────────────────────────────────

  const storeNames = useMemo(() => {
    const names = [...new Set(timeseries.map((r) => r.storeName).filter(Boolean) as string[])];
    return names.sort();
  }, [timeseries]);

  // ── Derived: filtered rows ────────────────────────────────────────────────

  const filteredTimeseries = useMemo(() => {
    if (storeFilter === 'all') return timeseries;
    return timeseries.filter((r) => r.storeName === storeFilter);
  }, [timeseries, storeFilter]);

  // ── Derived: KPI totals from timeseries ───────────────────────────────────

  const kpis = useMemo(() => {
    let revenue = 0, orders = 0, sessions = 0, convRateSum = 0, convCount = 0;
    for (const r of filteredTimeseries) {
      revenue  += r.revenue;
      orders   += r.orders;
      sessions += r.sessions;
      if (r.conversionRate > 0) { convRateSum += r.conversionRate; convCount++; }
    }
    const aov     = orders > 0 ? revenue / orders : 0;
    const convRate = convCount > 0 ? convRateSum / convCount : 0;
    const hasConvRate  = timeseriesMeta?.resolvedFields?.convRate != null;
    const hasSessions  = timeseriesMeta?.resolvedFields?.sessions != null;
    return { revenue, orders, aov, sessions, convRate, hasConvRate, hasSessions };
  }, [filteredTimeseries, timeseriesMeta]);

  // ── Derived: revenue chart (aggregated by date) ───────────────────────────

  const revenueChartData = useMemo(() => {
    const byDate: Record<string, { date: string; revenue: number; orders: number }> = {};
    for (const r of filteredTimeseries) {
      if (!r.date) continue;
      const d = normalizeDate(r.date);
      if (!byDate[d]) byDate[d] = { date: d.slice(5), revenue: 0, orders: 0 };
      byDate[d].revenue += r.revenue;
      byDate[d].orders  += r.orders;
    }
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredTimeseries]);

  // ── Derived: sorted table rows ────────────────────────────────────────────

  const sortedTable = useMemo(() => {
    const rows = [...filteredTimeseries].map((r) => ({
      ...r,
      date: r.date ? normalizeDate(r.date) : null,
      aov: r.orders > 0 ? r.revenue / r.orders : r.aov,
    }));

    rows.sort((a, b) => {
      let av: string | number = 0, bv: string | number = 0;
      if (sortKey === 'date')      { av = a.date ?? ''; bv = b.date ?? ''; }
      else if (sortKey === 'storeName') { av = a.storeName ?? ''; bv = b.storeName ?? ''; }
      else { av = a[sortKey] as number; bv = b[sortKey] as number; }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return rows;
  }, [filteredTimeseries, sortKey, sortDir]);

  const tablePageCount = Math.ceil(sortedTable.length / TABLE_PAGE_SIZE);
  const tableRows      = sortedTable.slice(tablePage * TABLE_PAGE_SIZE, (tablePage + 1) * TABLE_PAGE_SIZE);

  function toggleSort(key: TableSortKey) {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  const sortIcon = (key: TableSortKey) =>
    sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  // ── Gaps across all responses ─────────────────────────────────────────────

  const allGaps = useMemo(() => timeseriesMeta?.gaps ?? [], [timeseriesMeta]);

  const loading = acctLoading || dataLoading;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <section className="flex flex-wrap items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-green-600" />
            E-commerce Fare Tessile Hub
          </h2>
          <p className="text-sm text-slate-500">
            Shopify performance via Supermetrics
            {storeNames.length > 0 && ` · ${storeNames.length} store${storeNames.length > 1 ? 's' : ''}`}
          </p>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {/* Store filter */}
          {storeNames.length > 1 && (
            <select
              value={storeFilter}
              onChange={(e) => { setStoreFilter(e.target.value); setTablePage(0); }}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 shadow-sm focus:outline-none"
            >
              <option value="all">All stores</option>
              {storeNames.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}

          {/* Date range */}
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-sm text-sm">
            <CalendarRange className="w-4 h-4 text-slate-400" />
            <select
              value={preset}
              onChange={(e) => { setPreset(e.target.value as DatePreset); setTablePage(0); }}
              className="bg-transparent text-sm text-slate-700 focus:outline-none cursor-pointer"
            >
              {(Object.entries(PRESET_LABELS) as [DatePreset, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          {preset === 'custom' && (
            <>
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm" />
              <ChevronRight className="w-4 h-4 text-slate-400" />
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm" />
            </>
          )}

          <button
            onClick={loadData}
            disabled={loading || accounts.length === 0}
            className="rounded-md bg-brand-navy px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-navy/85 disabled:opacity-50"
          >
            {loading ? 'Loading…' : '↺ Refresh'}
          </button>
          {lastUpdated && <span className="text-xs text-slate-400">Updated {lastUpdated}</span>}
        </div>
      </section>

      {/* ── Account error ──────────────────────────────────────────────────── */}
      {acctError && (
        <div className="rounded-md bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-800 space-y-2">
          <p><strong>Shopify:</strong> {acctError}</p>
          {reconnectSteps.length > 0 && (
            <ol className="list-decimal pl-4 space-y-0.5 text-rose-700">
              {reconnectSteps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          )}
          {loginUrl && (
            <a href={loginUrl} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 text-rose-700 underline font-medium">
              Reconnect Shopify <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          {/* ds_id override */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-rose-600 text-xs">Try a different ds_id:</span>
            <input
              type="text"
              value={dsIdInput}
              onChange={(e) => setDsIdInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const v = dsIdInput.trim().toUpperCase();
                  if (!v) return;
                  setDsId(v);
                  try { localStorage.setItem('Fare Tessile-shopify-dsid', v); } catch {}
                  setAcctTrigger((t) => t + 1);
                }
              }}
              placeholder="e.g. SHP, SHOPIFY…"
              className="rounded border border-rose-300 bg-white px-2 py-0.5 text-xs w-32 text-slate-800"
            />
            <button
              onClick={() => {
                const v = dsIdInput.trim().toUpperCase();
                if (!v) return;
                setDsId(v);
                try { localStorage.setItem('Fare Tessile-shopify-dsid', v); } catch {}
                setAcctTrigger((t) => t + 1);
              }}
              className="rounded bg-rose-600 px-2 py-0.5 text-white text-xs hover:bg-rose-700"
            >
              Try
            </button>
            <span className="text-[10px] text-rose-500">current: <strong>{dsId}</strong></span>
          </div>
        </div>
      )}

      {/* ── Data error ─────────────────────────────────────────────────────── */}
      {dataError && !acctError && (
        <div className="rounded-md bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-800 space-y-2">
          <p>{dataError}</p>
          {reconnectSteps.length > 0 && (
            <ol className="list-decimal pl-4 space-y-0.5 text-rose-700">
              {reconnectSteps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          )}
          {loginUrl && (
            <a href={loginUrl} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 text-rose-700 underline font-medium">
              Reconnect <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      )}

      {/* ── No accounts state ──────────────────────────────────────────────── */}
      {!acctLoading && accounts.length === 0 && !acctError && (
        <div className="card flex flex-col items-center justify-center py-16 text-center gap-3">
          <ShoppingBag className="w-10 h-10 text-slate-200" />
          <p className="text-slate-500 font-medium">No Shopify accounts connected.</p>
          <p className="text-sm text-slate-400">Connect a Shopify login in Supermetrics Hub (data source id: <strong>{dsId}</strong>).</p>
        </div>
      )}

      {/* ── Field gaps notice ──────────────────────────────────────────────── */}
      {allGaps.length > 0 && <GapNotice gaps={allGaps} />}

      {/* ── KPI cards ──────────────────────────────────────────────────────── */}
      {(loading || accounts.length > 0) && (
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {loading ? (
            <SkeletonKpis count={5} />
          ) : timeseries.length === 0 ? (
            <div className="col-span-full rounded-md bg-slate-50 border border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
              No data for this period.
            </div>
          ) : (
            <>
              <KpiBlock label="Revenue"   value={moneyFull(kpis.revenue)} sub={`${range.start} → ${range.end}`} />
              <KpiBlock label="Orders"    value={kpis.orders.toLocaleString()} />
              <KpiBlock label="AOV"       value={moneyFull(kpis.aov)} sub="Revenue ÷ Orders" />
              <KpiBlock
                label="Sessions"
                value={kpis.hasSessions ? kpis.sessions.toLocaleString() : 'N/A'}
                unavailable={!kpis.hasSessions}
                sub={kpis.hasSessions ? undefined : 'Not in SHP schema'}
              />
              <KpiBlock
                label="Conv. Rate"
                value={kpis.hasConvRate ? pct(kpis.convRate, 2) : 'N/A'}
                unavailable={!kpis.hasConvRate}
                sub={kpis.hasConvRate ? undefined : 'Not in SHP schema'}
              />
            </>
          )}
        </section>
      )}

      {/* ── Revenue over time ──────────────────────────────────────────────── */}
      {(loading || timeseries.length > 0) && (
        <section className="card">
          <p className="text-sm font-semibold text-slate-700 mb-4">Revenue Over Time</p>
          {loading ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-400 animate-pulse">Loading…</div>
          ) : revenueChartData.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-400">No data for this period.</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenueChartData} margin={{ top: 4, right: 40, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={SHOPIFY_GREEN} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={SHOPIFY_GREEN} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis
                  tickFormatter={(v: number) => moneyCompact(v)}
                  tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={64}
                />
                <Tooltip
                  formatter={(v: number, name: string) => [moneyFull(v), name]}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone" dataKey="revenue" name="Revenue"
                  stroke={SHOPIFY_GREEN} strokeWidth={2.5}
                  fill="url(#revGradient)" dot={false} activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </section>
      )}

      {/* ── Products + Locations grid ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* Top Products */}
        <section className="card">
          <p className="text-sm font-semibold text-slate-700 mb-4">Top Products by Revenue</p>
          {loading ? (
            <div className="flex h-56 items-center justify-center text-sm text-slate-400 animate-pulse">Loading…</div>
          ) : products.length === 0 ? (
            <div className="flex h-56 flex-col items-center justify-center text-center gap-2">
              <p className="text-sm text-slate-400">No product data available.</p>
              <p className="text-xs text-slate-300">Requires a product_title dimension in the SHP schema.<br />Ensure your Supermetrics report includes product-level breakdown.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={products.length > 8 ? 320 : 240}>
              <BarChart
                layout="vertical"
                data={products.slice(0, 10)}
                margin={{ top: 0, right: 48, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(v: number) => moneyCompact(v)}
                  tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false}
                />
                <YAxis
                  type="category" dataKey="product"
                  width={120} tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false}
                  tickFormatter={(v: string) => v && v.length > 18 ? `${v.slice(0, 18)}…` : (v ?? '—')}
                />
                <Tooltip
                  formatter={(v: number, name: string) => [moneyFull(v), name]}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="revenue" name="Revenue" radius={[0, 4, 4, 0]}>
                  {products.slice(0, 10).map((_, i) => (
                    <Cell key={i} fill={BAR_PALETTE[i % BAR_PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>

        {/* Revenue by Location */}
        <section className="card">
          <p className="text-sm font-semibold text-slate-700 mb-4">Revenue by Country</p>
          {loading ? (
            <div className="flex h-56 items-center justify-center text-sm text-slate-400 animate-pulse">Loading…</div>
          ) : locations.length === 0 ? (
            <div className="flex h-56 flex-col items-center justify-center text-center gap-2">
              <p className="text-sm text-slate-400">No location data available.</p>
              <p className="text-xs text-slate-300">Requires billing_country_name or country in the SHP schema.<br />Ensure your Shopify plan includes geographic analytics.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={locations.length > 8 ? 320 : 240}>
              <BarChart
                layout="vertical"
                data={locations.slice(0, 12)}
                margin={{ top: 0, right: 48, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(v: number) => moneyCompact(v)}
                  tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false}
                />
                <YAxis
                  type="category" dataKey="country"
                  width={80} tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false}
                  tickFormatter={(v: string) => v ?? '—'}
                />
                <Tooltip
                  formatter={(v: number, name: string) => [moneyFull(v), name]}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="revenue" name="Revenue" radius={[0, 4, 4, 0]}>
                  {locations.slice(0, 12).map((_, i) => (
                    <Cell key={i} fill={BAR_PALETTE[i % BAR_PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>
      </div>

      {/* ── Detailed table ──────────────────────────────────────────────────── */}
      {(loading || timeseries.length > 0) && (
        <section className="card p-0 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-700">Detailed Breakdown</p>
            {!loading && (
              <span className="text-xs text-slate-400">
                {sortedTable.length.toLocaleString()} rows
                {storeFilter !== 'all' && ` · ${storeFilter}`}
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex h-32 items-center justify-center text-sm text-slate-400 animate-pulse">Loading…</div>
          ) : sortedTable.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-slate-400">No rows match the current filters.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      {([
                        ['date',      'Date'],
                        ['storeName', 'Store'],
                        ['revenue',   'Revenue'],
                        ['orders',    'Orders'],
                        ['aov',       'AOV'],
                        ...(kpis.hasSessions ? [['sessions', 'Sessions'] as [TableSortKey, string]] : []),
                        ...(kpis.hasConvRate ? [['conversionRate', 'Conv%'] as [TableSortKey, string]] : []),
                      ] as [TableSortKey, string][]).map(([key, label]) => (
                        <th
                          key={key}
                          onClick={() => toggleSort(key)}
                          className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer select-none hover:text-slate-700 whitespace-nowrap"
                        >
                          {label}{sortIcon(key)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {tableRows.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-2 text-slate-600 tabular-nums whitespace-nowrap">{row.date ?? '—'}</td>
                        <td className="px-4 py-2 text-slate-700 max-w-[160px] truncate" title={row.storeName ?? undefined}>{row.storeName ?? '—'}</td>
                        <td className="px-4 py-2 font-semibold tabular-nums text-slate-900 whitespace-nowrap">{moneyFull(row.revenue)}</td>
                        <td className="px-4 py-2 tabular-nums text-slate-700">{row.orders > 0 ? row.orders.toLocaleString() : '—'}</td>
                        <td className="px-4 py-2 tabular-nums text-slate-700 whitespace-nowrap">{row.orders > 0 ? moneyFull(row.aov) : '—'}</td>
                        {kpis.hasSessions && (
                          <td className="px-4 py-2 tabular-nums text-slate-700">{row.sessions > 0 ? row.sessions.toLocaleString() : '—'}</td>
                        )}
                        {kpis.hasConvRate && (
                          <td className="px-4 py-2 tabular-nums text-slate-700">{row.conversionRate > 0 ? pct(row.conversionRate, 2) : '—'}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {tablePageCount > 1 && (
                <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 bg-slate-50/70">
                  <span className="text-xs text-slate-500">
                    Page {tablePage + 1} of {tablePageCount} · {sortedTable.length} rows
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTablePage((p) => Math.max(0, p - 1))}
                      disabled={tablePage === 0}
                      className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                    >
                      ← Prev
                    </button>
                    <button
                      onClick={() => setTablePage((p) => Math.min(tablePageCount - 1, p + 1))}
                      disabled={tablePage >= tablePageCount - 1}
                      className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* ── Debug panel ────────────────────────────────────────────────────── */}
      {(timeseries.length > 0 || accounts.length > 0) && (
        <details className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          <summary className="cursor-pointer font-medium text-slate-600 select-none">Debug info</summary>
          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1">
            <span>ds_id:</span><strong>{dsId}</strong>
            <span>Accounts:</span><strong>{accounts.length}</strong>
            <span>Date range:</span><strong>{range.start} → {range.end}</strong>
            <span>Timeseries rows:</span><strong>{timeseries.length}</strong>
            <span>Products rows:</span><strong>{products.length}</strong>
            <span>Locations rows:</span><strong>{locations.length}</strong>
            {timeseriesMeta && Object.entries(timeseriesMeta.resolvedFields).map(([k, v]) => (
              <div key={k} className="contents">
                <span>Field [{k}]:</span>
                <strong className={v ? 'text-green-700' : 'text-rose-500'}>{v ? `${v.name} (${v.id})` : 'not found'}</strong>
              </div>
            ))}
          </div>
        </details>
      )}
    </>
  );
}
