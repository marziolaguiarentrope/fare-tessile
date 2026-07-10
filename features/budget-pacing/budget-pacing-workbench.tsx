'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, X, CalendarRange, ChevronRight } from 'lucide-react';
import {
  ComposedChart, BarChart, Bar, Cell,
  Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Account {
  id: string;
  name: string;
  platform: 'FA' | 'AW';
  dsUser: string;
}

interface SpendRow { date: string | null; accountName: string | null; spend: number; }

type PeriodPreset = 'this_month' | 'last_month' | 'custom';

/** Budget for a specific account: total $ amount for an explicit date window. */
interface BudgetEntry {
  amount: number;
  startDate: string; // YYYY-MM-DD — start of the budget window
  endDate: string;   // YYYY-MM-DD — end of the budget window
}

interface PacingRow {
  key: string;
  accountName: string;
  platform: 'FA' | 'AW';
  platformLabel: string;
  // Budget window
  budgetAmount: number;
  startDate: string;
  endDate: string;
  daysTotal: number;
  daysElapsed: number;
  daysRemaining: number;
  pctTimeElapsed: number;
  // Budget breakdown
  dailyBudget: number;
  weeklyBudget: number;
  // Pacing
  actualSpend: number;
  expectedSpend: number;
  variance: number;
  variancePct: number;
  projectedEOD: number;
  dailyNeeded: number;
  pctBudgetUsed: number;
  status: 'not-started' | 'on-track' | 'overpacing' | 'underpacing' | 'completed';
}

// ── Storage keys ──────────────────────────────────────────────────────────────

// v4 — new per-account date range format (incompatible with v3)
const BUDGETS_KEY  = 'Fare Tessile_budgets_v4';
const SELECTED_KEY = 'Fare Tessile_pacing_sel_v2';

// ── Date helpers ──────────────────────────────────────────────────────────────

function toYMD(d: Date) { return d.toISOString().slice(0, 10); }
function todayYMD()     { return toYMD(new Date()); }

/** Normalize any Supermetrics date string to YYYY-MM-DD.
 *  Handles: YYYY-MM-DD, MM/DD/YYYY, YYYY/MM/DD, and ISO timestamps. */
function normalizeDate(raw: string): string {
  const s = raw.trim();
  // Already YYYY-MM-DD (or ISO timestamp)
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // MM/DD/YYYY or M/D/YYYY
  const mdY = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mdY) return `${mdY[3]}-${mdY[1].padStart(2, '0')}-${mdY[2].padStart(2, '0')}`;
  // YYYY/MM/DD
  const ymd = s.match(/^(\d{4})\/(\d{2})\/(\d{2})/);
  if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
  return s.slice(0, 10);
}

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

function fmtDate(ymd: string) {
  return new Date(ymd + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function resolvePeriod(preset: PeriodPreset, customStart: string, customEnd: string) {
  const now = new Date();
  if (preset === 'custom')     return { start: customStart || toYMD(now), end: customEnd || toYMD(now) };
  if (preset === 'last_month') {
    const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const m = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    return { start: toYMD(new Date(y, m, 1)), end: toYMD(new Date(y, m + 1, 0)) };
  }
  return {
    start: toYMD(new Date(now.getFullYear(), now.getMonth(), 1)),
    end:   toYMD(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}

// ── Budget math ───────────────────────────────────────────────────────────────

function calcBudgets(entry: BudgetEntry) {
  const dt    = Math.max(1, daysBetween(entry.startDate, entry.endDate) + 1);
  const daily = entry.amount / dt;
  return { daily, weekly: daily * 7, daysTotal: dt };
}

function computePacing(
  account: Account,
  entry: BudgetEntry,
  byDate: Record<string, number>, // date string → spend that day
): PacingRow {
  const today         = todayYMD();
  const { startDate, endDate, amount } = entry;
  const daysTotal     = Math.max(1, daysBetween(startDate, endDate) + 1);
  const daysElapsed   = Math.max(0, Math.min(daysBetween(startDate, today) + 1, daysTotal));
  const daysRemaining = Math.max(0, daysTotal - daysElapsed);
  const pctTime       = daysElapsed / daysTotal;

  // Actual spend = sum of daily rows within [startDate, endDate]
  let actualSpend = 0;
  for (const [date, spend] of Object.entries(byDate)) {
    if (date >= startDate && date <= endDate) actualSpend += spend;
  }

  const daily         = amount / daysTotal;
  const expectedSpend = daily * daysElapsed;
  const variance      = actualSpend - expectedSpend;
  const variancePct   = expectedSpend > 0 ? (variance / expectedSpend) * 100
                      : actualSpend > 0   ? 100
                      : 0;
  const projectedEOD  = daysElapsed > 0 ? (actualSpend / daysElapsed) * daysTotal : 0;
  const dailyNeeded   = daysRemaining > 0 ? (amount - actualSpend) / daysRemaining : 0;
  const pctBudgetUsed = amount > 0 ? (actualSpend / amount) * 100 : 0;

  const status: PacingRow['status'] =
    daysElapsed <= 0           ? 'not-started'
    : daysElapsed >= daysTotal ? 'completed'
    : variancePct > 10         ? 'overpacing'
    : variancePct < -10        ? 'underpacing'
    :                            'on-track';

  return {
    key: `${account.platform}:${account.id}`,
    accountName: account.name,
    platform: account.platform,
    platformLabel: account.platform === 'FA' ? 'Meta' : 'Google',
    budgetAmount: amount,
    startDate,
    endDate,
    daysTotal,
    daysElapsed,
    daysRemaining,
    pctTimeElapsed: pctTime,
    dailyBudget: daily,
    weeklyBudget: daily * 7,
    actualSpend,
    expectedSpend,
    variance,
    variancePct,
    projectedEOD,
    dailyNeeded,
    pctBudgetUsed,
    status,
  };
}

// ── Formatting ────────────────────────────────────────────────────────────────

const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const pct = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;

// ── Sub-components ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<PacingRow['status'], [string, string]> = {
  'on-track':    ['bg-emerald-100 text-emerald-700', 'On Track'],
  overpacing:    ['bg-amber-100 text-amber-700',     'Overpacing'],
  underpacing:   ['bg-rose-100 text-rose-700',       'Underpacing'],
  'not-started': ['bg-slate-100 text-slate-500',     'Not Started'],
  completed:     ['bg-blue-100 text-blue-700',       'Completed'],
};

function StatusBadge({ status }: { status: PacingRow['status'] }) {
  const [cls, label] = STATUS_CFG[status];
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}

function PacingBar({ pctUsed, pctExpected }: { pctUsed: number; pctExpected: number }) {
  const color = pctUsed > pctExpected + 10 ? 'bg-amber-400'
              : pctUsed < pctExpected - 10 ? 'bg-rose-300'
              : 'bg-emerald-400';
  return (
    <div className="relative h-2 w-full min-w-[100px] rounded-full bg-slate-100">
      <div className="absolute top-0 h-full w-0.5 rounded-full bg-slate-400"
        style={{ left: `${Math.min(pctExpected, 99)}%` }} />
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(pctUsed, 100)}%` }} />
    </div>
  );
}

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <article className="card">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color ?? 'text-slate-900'}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </article>
  );
}

function PlatformBadge({ platform }: { platform: 'FA' | 'AW' }) {
  return platform === 'FA'
    ? <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold bg-blue-100 text-blue-700">Meta</span>
    : <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold bg-red-100 text-red-700">Google</span>;
}

// ── Main component ────────────────────────────────────────────────────────────

type PlatformTab = 'all' | 'FA' | 'AW';

export function BudgetPacingWorkbench() {
  // Accounts
  const [accounts, setAccounts]               = useState<Account[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError, setAccountsError]     = useState<string | null>(null);

  // Selections & budgets
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [budgets, setBudgets]   = useState<Record<string, BudgetEntry>>({});

  // Default period (used as default for new budget entries)
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('this_month');
  const [customStart, setCustomStart]   = useState('');
  const [customEnd, setCustomEnd]       = useState('');

  // Spend data
  const [rawRows, setRawRows]           = useState<SpendRow[]>([]);
  const [spendLoading, setSpendLoading] = useState(false);
  const [spendError, setSpendError]     = useState<string | null>(null);
  const [lastUpdated, setLastUpdated]   = useState<string | null>(null);
  const [spendMeta, setSpendMeta]       = useState<{ date?: { name: string } } | null>(null);

  // UI state
  const [search, setSearch]           = useState('');
  const [platformTab, setPlatformTab] = useState<PlatformTab>('all');
  const [showChart, setShowChart]         = useState(false);
  const [showDailyChart, setShowDailyChart] = useState(true);
  const [sortKey, setSortKey]         = useState<keyof PacingRow>('accountName');
  const [sortDir, setSortDir]         = useState<1 | -1>(1);
  const [savedFlash, setSavedFlash]   = useState(false);

  const defaultPeriod = useMemo(
    () => resolvePeriod(periodPreset, customStart, customEnd),
    [periodPreset, customStart, customEnd],
  );

  // ── Load on mount ─────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      setAccountsLoading(true);
      setAccountsError(null);
      try {
        const [rMeta, rGoogle] = await Promise.all([
          fetch('/api/integrations/supermetrics/accounts?dsId=FA'),
          fetch('/api/integrations/supermetrics/accounts?dsId=AW'),
        ]);
        const [jMeta, jGoogle] = await Promise.all([rMeta.json(), rGoogle.json()]);

        const parse = (
          json: { data?: Array<{ ds_user: string; accounts: Array<{ account_id: string; account_name: string }> }> },
          plat: 'FA' | 'AW',
        ): Account[] =>
          (json.data ?? []).flatMap((g) =>
            (g.accounts ?? []).map((a) => ({ id: a.account_id, name: a.account_name, platform: plat, dsUser: g.ds_user }))
          );

        const all = [...parse(jMeta, 'FA'), ...parse(jGoogle, 'AW')];
        setAccounts(all);
        if (all.length === 0) setAccountsError('No accounts found. Check your Supermetrics connection.');
      } catch (e) {
        setAccountsError(e instanceof Error ? e.message : 'Failed to load accounts.');
      } finally {
        setAccountsLoading(false);
      }
    }

    try {
      const b = localStorage.getItem(BUDGETS_KEY);
      if (b) setBudgets(JSON.parse(b));
      const s = localStorage.getItem(SELECTED_KEY);
      if (s) setSelected(new Set(JSON.parse(s)));
    } catch { /* ignore */ }

    load();
  }, []);

  useEffect(() => { localStorage.setItem(BUDGETS_KEY,  JSON.stringify(budgets)); }, [budgets]);
  useEffect(() => { localStorage.setItem(SELECTED_KEY, JSON.stringify([...selected])); }, [selected]);

  // ── Load spend ────────────────────────────────────────────────────────────
  // Fetch the broadest date range covering all account budget windows.

  const loadSpend = useCallback(async () => {
    const trackedEntries = accounts
      .map((a) => ({ account: a, entry: budgets[`${a.platform}:${a.id}`] }))
      .filter(({ entry }) => entry && entry.amount > 0 && selected.has(`${entry ? 'x' : ''}`));

    // Rebuild correctly:
    const tracked = accounts.filter(
      (a) => selected.has(`${a.platform}:${a.id}`) && (budgets[`${a.platform}:${a.id}`]?.amount ?? 0) > 0,
    );
    if (tracked.length === 0) return;

    // Compute the union date range across all selected accounts' budget windows
    const allEntries = tracked.map((a) => budgets[`${a.platform}:${a.id}`]);
    const fetchStart = allEntries.reduce((min, e) => e.startDate < min ? e.startDate : min, allEntries[0].startDate);
    const fetchEnd   = allEntries.reduce((max, e) => e.endDate   > max ? e.endDate   : max, allEntries[0].endDate);

    setSpendLoading(true);
    setSpendError(null);

    // Group by platform → ds_user so each Supermetrics login gets its own query
    const byPlatform: Record<string, Map<string, string[]>> = {};
    for (const a of tracked) {
      if (!byPlatform[a.platform]) byPlatform[a.platform] = new Map();
      const m = byPlatform[a.platform];
      if (!m.has(a.dsUser)) m.set(a.dsUser, []);
      m.get(a.dsUser)!.push(a.id);
    }

    try {
      const responses = await Promise.all(
        Object.entries(byPlatform).map(async ([plat, userMap]) => {
          const loginGroups = Array.from(userMap.entries()).map(([dsUser, accountIds]) => ({ dsUser, accountIds }));
          const res = await fetch('/api/integrations/supermetrics/spend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dsId: plat, loginGroups, startDate: fetchStart, endDate: fetchEnd }),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.message ?? 'Failed to fetch spend.');
          return json as { data: SpendRow[]; meta?: { resolvedFields?: { date?: { name: string } } } };
        }),
      );
      const allRows = responses.flatMap((r) =>
        (r.data ?? []).map((row) => ({
          ...row,
          date: row.date ? normalizeDate(row.date) : null,
        }))
      );
      setRawRows(allRows);
      setSpendMeta(responses[0]?.meta?.resolvedFields ?? null);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (e) {
      setSpendError(e instanceof Error ? e.message : 'Failed to load spend data.');
    } finally {
      setSpendLoading(false);
    }
  }, [accounts, selected, budgets]);

  // ── Derived data ──────────────────────────────────────────────────────────

  // Build per-account daily spend maps from raw rows
  const accountByDate = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const row of rawRows) {
      const name = row.accountName ?? '';
      if (!map[name]) map[name] = {};
      if (row.date) {
        const d = row.date.slice(0, 10);
        map[name][d] = (map[name][d] ?? 0) + row.spend;
      }
    }
    return map;
  }, [rawRows]);

  // Platform counts for tabs
  const platformCounts = useMemo(() => ({
    all: accounts.length,
    FA:  accounts.filter((a) => a.platform === 'FA').length,
    AW:  accounts.filter((a) => a.platform === 'AW').length,
  }), [accounts]);

  // Filtered list for selection panel
  const filteredAccounts = useMemo(() =>
    accounts.filter((a) => {
      if (platformTab !== 'all' && a.platform !== platformTab) return false;
      if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }),
  [accounts, platformTab, search]);

  // Pacing rows (only selected accounts with budget set)
  const pacingRows = useMemo(() =>
    accounts
      .filter((a) => selected.has(`${a.platform}:${a.id}`) && (budgets[`${a.platform}:${a.id}`]?.amount ?? 0) > 0)
      .map((a) => computePacing(
        a,
        budgets[`${a.platform}:${a.id}`],
        accountByDate[a.name] ?? {},
      )),
  [accounts, selected, budgets, accountByDate]);

  const sortedRows = useMemo(() =>
    [...pacingRows].sort((a, b) => {
      const av = a[sortKey] as number | string;
      const bv = b[sortKey] as number | string;
      return (av < bv ? -1 : av > bv ? 1 : 0) * sortDir;
    }),
  [pacingRows, sortKey, sortDir]);

  function toggleSort(key: keyof PacingRow) {
    if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1));
    else { setSortKey(key); setSortDir(1); }
  }

  const totals = useMemo(() => {
    if (pacingRows.length === 0) return null;
    const totalBudget    = pacingRows.reduce((s, r) => s + r.budgetAmount, 0);
    const totalSpend     = pacingRows.reduce((s, r) => s + r.actualSpend, 0);
    const totalExpected  = pacingRows.reduce((s, r) => s + r.expectedSpend, 0);
    const totalVariance  = totalSpend - totalExpected;
    const variancePct    = totalExpected > 0 ? (totalVariance / totalExpected) * 100 : 0;
    const totalProjected = pacingRows.reduce((s, r) => s + r.projectedEOD, 0);
    const pctUsed        = totalBudget > 0 ? (totalSpend / totalBudget) * 100 : 0;
    const totalDaily     = pacingRows.reduce((s, r) => s + r.dailyBudget, 0);
    const totalWeekly    = pacingRows.reduce((s, r) => s + r.weeklyBudget, 0);
    const r0 = pacingRows[0];
    return {
      totalBudget, totalSpend, totalExpected, totalVariance, variancePct,
      totalProjected, pctUsed, totalDaily, totalWeekly,
      daysElapsed: r0.daysElapsed, daysTotal: r0.daysTotal,
    };
  }, [pacingRows]);

  const chartData = useMemo(() => {
    if (!showChart || pacingRows.length === 0) return [];

    // Use the first pacing row's window for the chart x-axis
    const chartStart = pacingRows.reduce((min, r) => r.startDate < min ? r.startDate : min, pacingRows[0].startDate);
    const chartEnd   = pacingRows.reduce((max, r) => r.endDate   > max ? r.endDate   : max, pacingRows[0].endDate);
    const today      = todayYMD();
    const maxDate    = today < chartEnd ? today : chartEnd;
    const numDays    = daysBetween(chartStart, maxDate) + 1;
    if (numDays <= 0) return [];

    const totalBudget = pacingRows.reduce((s, r) => s + r.budgetAmount, 0);
    const daysInChart = daysBetween(chartStart, chartEnd) + 1;
    const dailyBudget = totalBudget / daysInChart;

    // Aggregate daily spend across all tracked accounts
    const dailyTotals: Record<string, number> = {};
    for (const row of rawRows) {
      if (!row.date) continue;
      const d = row.date.slice(0, 10);
      dailyTotals[d] = (dailyTotals[d] ?? 0) + row.spend;
    }

    let cumulative = 0;
    return Array.from({ length: numDays }, (_, i) => {
      const d = new Date(chartStart);
      d.setDate(d.getDate() + i);
      const dateStr = toYMD(d);
      cumulative += dailyTotals[dateStr] ?? 0;
      return {
        date: dateStr.slice(5),
        'Actual Spend':  Math.round(cumulative),
        'Expected Pace': Math.round(dailyBudget * (i + 1)),
      };
    });
  }, [showChart, pacingRows, rawRows]);

  // Daily time-series: actual spend per day vs daily budget target
  const dailySpendData = useMemo(() => {
    if (pacingRows.length === 0 || rawRows.length === 0) return [];

    const chartStart = pacingRows.reduce((min, r) => r.startDate < min ? r.startDate : min, pacingRows[0].startDate);
    const chartEnd   = pacingRows.reduce((max, r) => r.endDate   > max ? r.endDate   : max, pacingRows[0].endDate);
    const today      = todayYMD();
    const maxDate    = today < chartEnd ? today : chartEnd;
    const numDays    = daysBetween(chartStart, maxDate) + 1;
    if (numDays <= 0) return [];

    // Aggregate all accounts' spend per calendar day
    const dailyTotals: Record<string, number> = {};
    for (const row of rawRows) {
      if (!row.date) continue;
      const d = row.date.slice(0, 10);
      dailyTotals[d] = (dailyTotals[d] ?? 0) + row.spend;
    }

    return Array.from({ length: numDays }, (_, i) => {
      const d = new Date(chartStart + 'T12:00:00');
      d.setDate(d.getDate() + i);
      const dateStr = toYMD(d);
      return {
        date:     dateStr.slice(5), // MM-DD label
        fullDate: dateStr,
        spend:    Math.round(dailyTotals[dateStr] ?? 0),
      };
    });
  }, [pacingRows, rawRows]);

  // ── Account actions ───────────────────────────────────────────────────────

  function toggleAccount(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function selectAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      filteredAccounts.forEach((a) => next.add(`${a.platform}:${a.id}`));
      return next;
    });
  }

  function clearAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      filteredAccounts.forEach((a) => next.delete(`${a.platform}:${a.id}`));
      return next;
    });
  }

  const allFilteredSelected =
    filteredAccounts.length > 0 &&
    filteredAccounts.every((a) => selected.has(`${a.platform}:${a.id}`));

  function flash() {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  }

  function setAmount(key: string, value: string) {
    const n = Number(value);
    if (!value || isNaN(n) || n <= 0) {
      setBudgets((b) => { const next = { ...b }; delete next[key]; return next; });
    } else {
      setBudgets((b) => ({
        ...b,
        [key]: {
          amount: n,
          startDate: b[key]?.startDate ?? defaultPeriod.start,
          endDate:   b[key]?.endDate   ?? defaultPeriod.end,
        },
      }));
      flash();
    }
  }

  function setDateRange(key: string, field: 'startDate' | 'endDate', value: string) {
    setBudgets((b) => {
      if (!b[key]) return b; // only update if budget already exists
      return { ...b, [key]: { ...b[key], [field]: value } };
    });
    flash();
  }

  /** Apply the default period dates to all selected accounts that have a budget set. */
  function applyDefaultPeriodToAll() {
    setBudgets((b) => {
      const next = { ...b };
      for (const key of Object.keys(next)) {
        next[key] = { ...next[key], startDate: defaultPeriod.start, endDate: defaultPeriod.end };
      }
      return next;
    });
    flash();
  }

  const selectedAccounts = useMemo(
    () => accounts.filter((a) => selected.has(`${a.platform}:${a.id}`)),
    [accounts, selected],
  );

  const hasTracked = pacingRows.length > 0;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <section className="space-y-6">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4">
        <h2 className="text-2xl font-semibold">Budget Pacing</h2>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {/* Default period quick-selector */}
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-sm text-sm">
            <CalendarRange className="w-4 h-4 text-slate-400" />
            <select
              value={periodPreset}
              onChange={(e) => setPeriodPreset(e.target.value as PeriodPreset)}
              className="bg-transparent text-sm text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="custom">Custom…</option>
            </select>
          </div>
          {periodPreset === 'custom' && (
            <>
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm" />
              <span className="text-slate-400">→</span>
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm" />
            </>
          )}
          <button
            onClick={loadSpend}
            disabled={spendLoading || !hasTracked}
            className="rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {spendLoading ? 'Loading…' : rawRows.length > 0 ? '↺ Refresh Spend' : 'Load Actual Spend'}
          </button>
          {lastUpdated && <span className="text-xs text-slate-400">Updated {lastUpdated}</span>}
        </div>
      </div>

      {spendError && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{spendError}</p>
      )}

      {/* Warn if spend data has no daily breakdown */}
      {rawRows.length > 0 && (() => {
        const uniqueDates = new Set(rawRows.map((r) => r.date).filter(Boolean));
        const isAggregated = uniqueDates.size <= 1;
        if (!isAggregated) return null;
        return (
          <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
            <strong>No daily breakdown detected.</strong> Spend data came back as a single aggregated row
            {spendMeta?.date ? ` (date field: "${spendMeta.date.name}")` : ' (date field could not be resolved)'}.
            Daily charts will not show accurate per-day data.
            {!spendMeta?.date && (
              <span> Check the browser console or open the API route to debug field resolution.</span>
            )}
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════════════════
          STEP 1 — Select Accounts
      ══════════════════════════════════════════════════════════════════ */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-bold">1</span>
            <span className="text-sm font-semibold text-slate-800">Select Accounts</span>
            {selected.size > 0 && (
              <span className="rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5">
                {selected.size} selected
              </span>
            )}
          </div>
          {accountsLoading && <span className="text-xs text-slate-400">Loading from Supermetrics…</span>}
          {accountsError  && <span className="text-xs text-rose-600">{accountsError}</span>}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 px-5 py-3 bg-slate-50/70 border-b border-slate-100">
          <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
            {([['all', 'All', platformCounts.all], ['FA', 'Meta', platformCounts.FA], ['AW', 'Google', platformCounts.AW]] as [PlatformTab, string, number][]).map(([val, label, count]) => (
              <button key={val} onClick={() => setPlatformTab(val)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${platformTab === val ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                {label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${platformTab === val ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {count}
                </span>
              </button>
            ))}
          </div>

          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search accounts…"
              className="w-full pl-8 pr-7 py-1.5 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 ml-auto">
            <button onClick={allFilteredSelected ? clearAll : selectAll} disabled={filteredAccounts.length === 0}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-800 hover:border-slate-300 disabled:opacity-40 transition-colors">
              {allFilteredSelected ? 'Deselect all' : 'Select all'}{platformTab !== 'all' ? ` ${platformTab === 'FA' ? 'Meta' : 'Google'}` : ''}
            </button>
            {selected.size > 0 && (
              <button onClick={() => setSelected(new Set())} className="px-3 py-1.5 text-xs font-medium rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* Account list */}
        {accountsLoading ? (
          <div className="py-12 text-center text-sm text-slate-400">Loading accounts…</div>
        ) : filteredAccounts.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            {accounts.length === 0 ? 'Could not connect to Supermetrics.' : 'No accounts match the filter.'}
          </div>
        ) : (
          <ul className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
            {filteredAccounts.map((acc) => {
              const key    = `${acc.platform}:${acc.id}`;
              const active = selected.has(key);
              const entry  = budgets[key];
              return (
                <li key={key} onClick={() => toggleAccount(key)}
                  className={`flex items-center gap-3 px-5 py-2.5 cursor-pointer select-none transition-colors ${active ? 'bg-indigo-50 hover:bg-indigo-100/70' : 'hover:bg-slate-50'}`}>
                  <div className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${active ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'}`}>
                    {active && (
                      <svg viewBox="0 0 10 8" fill="none" className="w-2.5 h-2.5">
                        <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className={`flex-1 text-sm truncate ${active ? 'font-semibold text-indigo-900' : 'font-medium text-slate-700'}`}>
                    {acc.name}
                  </span>
                  <PlatformBadge platform={acc.platform} />
                  {entry?.amount > 0 ? (
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 rounded px-2 py-0.5 border border-emerald-100">
                      {money(entry.amount)} · {fmtDate(entry.startDate)} – {fmtDate(entry.endDate)}
                    </span>
                  ) : active ? (
                    <span className="text-[11px] text-amber-500 italic">no budget set</span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          STEP 2 — Configure Budgets with explicit date ranges
      ══════════════════════════════════════════════════════════════════ */}
      {selectedAccounts.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-bold">2</span>
              <span className="text-sm font-semibold text-slate-800">Budget & Date Range</span>
              <span className="text-xs text-slate-400">{selectedAccounts.length} account{selectedAccounts.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-3">
              {/* Quick: apply default period to all */}
              <button
                onClick={applyDefaultPeriodToAll}
                title={`Apply ${fmtDate(defaultPeriod.start)} – ${fmtDate(defaultPeriod.end)} to all accounts`}
                className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 px-2 py-1 rounded-md hover:bg-indigo-50 transition-colors"
              >
                <CalendarRange className="w-3.5 h-3.5" />
                Apply "{periodPreset === 'this_month' ? 'This Month' : periodPreset === 'last_month' ? 'Last Month' : 'Custom'}" to all
              </button>
              {savedFlash ? (
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Saved
                </span>
              ) : (
                <span className="text-xs text-slate-400">Saved in browser</span>
              )}
            </div>
          </div>

          {/* Column labels */}
          <div className="grid items-center gap-x-3 px-5 py-2 bg-slate-50/70 border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-400"
            style={{ gridTemplateColumns: '1fr auto auto auto auto' }}>
            <span>Account</span>
            <span>Budget Period</span>
            <span className="text-right">Total Budget</span>
            <span className="text-right">Daily Rate</span>
            <span className="text-right">In Period</span>
          </div>

          {/* Budget rows */}
          <ul className="divide-y divide-slate-100">
            {selectedAccounts.map((acc) => {
              const key    = `${acc.platform}:${acc.id}`;
              const entry  = budgets[key];
              const calc   = entry ? calcBudgets(entry) : null;
              const daysInRange = entry ? daysBetween(entry.startDate, entry.endDate) + 1 : 0;
              const today = todayYMD();
              const daysElapsed = entry
                ? Math.max(0, Math.min(daysBetween(entry.startDate, today) + 1, daysInRange))
                : 0;

              return (
                <li key={key} className="px-5 py-4 space-y-3">
                  {/* Row 1: account + date range + amount + computed */}
                  <div className="grid items-center gap-x-3 gap-y-2" style={{ gridTemplateColumns: '1fr auto auto auto auto' }}>
                    {/* Account name */}
                    <div className="flex items-center gap-2 min-w-0">
                      <PlatformBadge platform={acc.platform} />
                      <span className="text-sm font-semibold text-slate-800 truncate">{acc.name}</span>
                    </div>

                    {/* Date range pickers */}
                    <div className="flex items-center gap-1.5">
                      <input
                        type="date"
                        value={entry?.startDate ?? defaultPeriod.start}
                        onChange={(e) => {
                          if (!entry) return;
                          setDateRange(key, 'startDate', e.target.value);
                        }}
                        onFocus={() => {
                          // Ensure entry exists with defaults before editing dates
                          if (!entry) {
                            setBudgets((b) => ({
                              ...b,
                              [key]: { amount: 0, startDate: defaultPeriod.start, endDate: defaultPeriod.end },
                            }));
                          }
                        }}
                        className="rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/30 bg-white"
                      />
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                      <input
                        type="date"
                        value={entry?.endDate ?? defaultPeriod.end}
                        onChange={(e) => {
                          if (!entry) return;
                          setDateRange(key, 'endDate', e.target.value);
                        }}
                        onFocus={() => {
                          if (!entry) {
                            setBudgets((b) => ({
                              ...b,
                              [key]: { amount: 0, startDate: defaultPeriod.start, endDate: defaultPeriod.end },
                            }));
                          }
                        }}
                        className="rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/30 bg-white"
                      />
                      {daysInRange > 0 && (
                        <span className="text-[11px] text-slate-400 whitespace-nowrap">({daysInRange}d)</span>
                      )}
                    </div>

                    {/* Total budget amount */}
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">$</span>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={entry?.amount && entry.amount > 0 ? entry.amount : ''}
                        onChange={(e) => setAmount(key, e.target.value)}
                        onFocus={() => {
                          if (!entry) {
                            setBudgets((b) => ({
                              ...b,
                              [key]: { amount: 0, startDate: defaultPeriod.start, endDate: defaultPeriod.end },
                            }));
                          }
                        }}
                        placeholder="Total budget"
                        className={`w-36 rounded-lg border pl-7 pr-3 py-1.5 text-sm font-semibold text-right focus:outline-none focus:ring-2 ${
                          entry?.amount > 0
                            ? 'border-indigo-300 focus:ring-indigo-400/30 focus:border-indigo-500 text-indigo-900'
                            : 'border-slate-200 focus:ring-slate-300/30 focus:border-slate-400 text-slate-700'
                        }`}
                      />
                    </div>

                    {/* Daily rate */}
                    <div className="text-right">
                      {calc && entry?.amount > 0 ? (
                        <span className="text-sm font-semibold text-slate-700">{money(calc.daily)}<span className="text-xs font-normal text-slate-400">/day</span></span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </div>

                    {/* Period total (= total budget, but useful to confirm) */}
                    <div className="text-right">
                      {entry?.amount > 0 ? (
                        <span className="text-sm font-bold text-indigo-600">{money(entry.amount)}</span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </div>
                  </div>

                  {/* Row 2: progress context (only when budget is set) */}
                  {entry?.amount > 0 && daysInRange > 0 && (
                    <div className="flex items-center gap-3 pl-0 text-[11px] text-slate-400">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                        {fmtDate(entry.startDate)}
                        <ChevronRight className="w-3 h-3 text-slate-400" />
                        {fmtDate(entry.endDate)}
                      </span>
                      <span>·</span>
                      <span>Day <strong className="text-slate-600">{daysElapsed}</strong> of <strong className="text-slate-600">{daysInRange}</strong></span>
                      <span>·</span>
                      <span>Expected to date: <strong className="text-slate-600">{calc ? money(calc.daily * daysElapsed) : '—'}</strong></span>
                      {rawRows.length > 0 && (
                        <>
                          <span>·</span>
                          <span>Actual spend: <strong className="text-slate-600">
                            {money(
                              Object.entries(accountByDate[acc.name] ?? {})
                                .filter(([d]) => d >= entry.startDate && d <= entry.endDate)
                                .reduce((s, [, v]) => s + v, 0)
                            )}
                          </strong></span>
                        </>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Footer totals */}
          {(() => {
            const withBudget = selectedAccounts.filter((a) => budgets[`${a.platform}:${a.id}`]?.amount > 0);
            if (withBudget.length < 2) return null;
            const totalBudget = withBudget.reduce((s, a) => s + budgets[`${a.platform}:${a.id}`].amount, 0);
            const totalDaily  = withBudget.reduce((s, a) => s + calcBudgets(budgets[`${a.platform}:${a.id}`]).daily, 0);
            return (
              <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-3 flex items-center gap-4 text-xs text-slate-500">
                <span className="font-semibold text-slate-700 uppercase tracking-wide">Total</span>
                <span className="text-slate-300">·</span>
                <span>{withBudget.length} accounts</span>
                <span className="text-slate-300">·</span>
                <span><span className="font-semibold text-slate-700">{money(totalDaily)}</span>/day (avg)</span>
                <span className="text-slate-300">·</span>
                <span className="font-semibold text-indigo-600">{money(totalBudget)} total</span>
              </div>
            );
          })()}
        </div>
      )}

      {/* Empty state */}
      {!accountsLoading && accounts.length > 0 && selected.size === 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
          Select one or more accounts above to configure budgets and load spend data.
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          KPI cards
      ══════════════════════════════════════════════════════════════════ */}
      {totals && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
            <KpiCard label="Total Budget"     value={money(totals.totalBudget)}   sub="Sum of all budget windows" />
            <KpiCard label="Daily Budget"     value={money(totals.totalDaily)}    sub="Sum across all accounts" />
            <KpiCard label="Weekly Budget"    value={money(totals.totalWeekly)}   sub="Sum across all accounts" />
            <KpiCard label="Actual Spend"     value={money(totals.totalSpend)}    sub={`${totals.pctUsed.toFixed(1)}% of budget`} />
            <KpiCard label="Expected to Date" value={money(totals.totalExpected)} sub={`Day ${totals.daysElapsed} of ${totals.daysTotal}`} />
            <KpiCard
              label="Variance"
              value={money(totals.totalVariance)}
              sub={pct(totals.variancePct)}
              color={totals.variancePct > 10 ? 'text-amber-600' : totals.variancePct < -10 ? 'text-rose-600' : 'text-emerald-600'}
            />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <KpiCard
              label="End of Period Projection"
              value={money(totals.totalProjected)}
              sub={totals.totalProjected > totals.totalBudget ? '⚠ Over budget' : `${((totals.totalProjected / totals.totalBudget) * 100).toFixed(1)}% of budget`}
              color={totals.totalProjected > totals.totalBudget ? 'text-rose-600' : 'text-slate-900'}
            />
            <KpiCard
              label="Remaining Budget"
              value={money(Math.max(0, totals.totalBudget - totals.totalSpend))}
              sub={`${Math.max(0, totals.daysTotal - totals.daysElapsed)} days remaining`}
            />
            <KpiCard
              label="Tracked Accounts"
              value={String(pacingRows.length)}
              sub={`${pacingRows.filter((r) => r.status === 'on-track').length} on track · ${pacingRows.filter((r) => r.status === 'overpacing').length} overpacing`}
            />
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          Trend chart
      ══════════════════════════════════════════════════════════════════ */}
      {totals && (
        <div className="card">
          <div className="mb-3 flex items-center gap-3">
            <p className="text-sm font-semibold text-slate-700">Cumulative Spend vs Expected Pace</p>
            <button onClick={() => setShowChart((v) => !v)}
              className="ml-auto rounded border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50">
              {showChart ? 'Hide chart' : 'Show chart'}
            </button>
          </div>
          {showChart && chartData.length > 0 && (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chartData} margin={{ top: 4, right: 40, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={56} />
                <Tooltip formatter={(v: number, name: string) => [money(v), name]} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="Actual Spend"  stroke="#6366f1" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="Expected Pace" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="6 3" dot={false} />
                <ReferenceLine y={totals.totalBudget} stroke="#f43f5e" strokeDasharray="4 4"
                  label={{ value: 'Budget', position: 'insideTopRight', fontSize: 10, fill: '#f43f5e' }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
          {showChart && chartData.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">
              Click <strong>Load Actual Spend</strong> to see the trend chart.
            </p>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          Daily spend chart: actual spend per day vs daily target
      ══════════════════════════════════════════════════════════════════ */}
      {totals && rawRows.length > 0 && (
        <div className="card">
          <div className="mb-3 flex items-center gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-700">Daily Spend vs Target</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Actual spend per day across all accounts · dashed line = daily budget target
              </p>
            </div>
            <button
              onClick={() => setShowDailyChart((v) => !v)}
              className="ml-auto rounded border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
              {showDailyChart ? 'Hide' : 'Show'}
            </button>
          </div>
          {showDailyChart && (
            dailySpendData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={dailySpendData} margin={{ top: 8, right: 40, left: 8, bottom: 0 }} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tickFormatter={(v: number) => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickLine={false}
                      axisLine={false}
                      width={56}
                    />
                    <Tooltip
                      formatter={(v: number) => [money(v), 'Spend']}
                      labelFormatter={(label: string, payload) => {
                        const full = (payload?.[0]?.payload as { fullDate?: string })?.fullDate ?? label;
                        return full;
                      }}
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                    />
                    <Bar dataKey="spend" name="Daily Spend" radius={[4, 4, 0, 0]} maxBarSize={40}>
                      {dailySpendData.map((entry, i) => {
                        const target = totals.totalDaily;
                        const ratio  = target > 0 ? entry.spend / target : 0;
                        const fill   = entry.spend === 0 ? '#e2e8f0'
                                     : ratio > 1.1         ? '#f59e0b'
                                     : ratio < 0.9         ? '#f43f5e'
                                     :                       '#6366f1';
                        return <Cell key={i} fill={fill} />;
                      })}
                    </Bar>
                    <ReferenceLine
                      y={totals.totalDaily}
                      stroke="#94a3b8"
                      strokeDasharray="6 3"
                      label={{ value: `Target ${money(totals.totalDaily)}/day`, position: 'insideTopRight', fontSize: 10, fill: '#94a3b8' }}
                    />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-2 flex flex-wrap gap-4 px-1 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-indigo-500" />On track (±10%)</span>
                  <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-400" />Over target</span>
                  <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-rose-400" />Under target</span>
                  <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-slate-200" />No data</span>
                </div>
              </>
            ) : (
              <p className="py-8 text-center text-sm text-slate-400">
                Click <strong>Load Actual Spend</strong> to see the daily breakdown.
              </p>
            )
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          Pacing table
      ══════════════════════════════════════════════════════════════════ */}
      {pacingRows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {([
                  ['accountName',   'Account'],
                  ['platformLabel', 'Platform'],
                  ['startDate',     'Period'],
                  [null,            'Progress'],
                  ['budgetAmount',  'Budget'],
                  ['dailyBudget',   'Daily Budget'],
                  ['actualSpend',   'Actual Spend'],
                  ['expectedSpend', 'Expected Today'],
                  ['variance',      'Variance $'],
                  ['variancePct',   'Variance %'],
                  ['projectedEOD',  'Projection'],
                  ['dailyNeeded',   'Daily Needed'],
                  [null,            'Status'],
                ] as [keyof PacingRow | null, string][]).map(([key, label]) => (
                  <th key={label}
                    onClick={key ? () => toggleSort(key) : undefined}
                    className={`whitespace-nowrap px-3 py-2.5 text-left text-xs font-medium text-slate-500 ${key ? 'cursor-pointer select-none hover:text-slate-800' : ''}`}>
                    {label}{key && sortKey === key ? (sortDir === 1 ? ' ↑' : ' ↓') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedRows.map((row) => (
                <tr key={row.key} className="hover:bg-slate-50">
                  <td className="max-w-[180px] truncate px-3 py-2.5 font-medium text-slate-800">{row.accountName}</td>
                  <td className="px-3 py-2.5"><PlatformBadge platform={row.platform} /></td>
                  {/* Period range */}
                  <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                    {fmtDate(row.startDate)}<br />
                    <span className="text-slate-300">→</span> {fmtDate(row.endDate)}
                    <span className="ml-1 text-slate-300">({row.daysTotal}d)</span>
                  </td>
                  <td className="min-w-[140px] px-3 py-2.5">
                    <PacingBar pctUsed={row.pctBudgetUsed} pctExpected={row.pctTimeElapsed * 100} />
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      {row.pctBudgetUsed.toFixed(1)}% spent · day {row.daysElapsed}/{row.daysTotal}
                    </p>
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold">{money(row.budgetAmount)}</td>
                  <td className="px-3 py-2.5 text-right text-slate-600">{money(row.dailyBudget)}</td>
                  <td className="px-3 py-2.5 text-right font-semibold">
                    {row.actualSpend > 0 ? money(row.actualSpend) : <span className="text-xs italic text-slate-300">No data</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-600">{money(row.expectedSpend)}</td>
                  <td className={`px-3 py-2.5 text-right font-medium ${row.variance > 0 ? 'text-amber-600' : row.variance < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                    {row.actualSpend > 0 ? money(row.variance) : '—'}
                  </td>
                  <td className={`px-3 py-2.5 text-right font-medium ${row.variancePct > 10 ? 'text-amber-600' : row.variancePct < -10 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {row.actualSpend > 0 ? pct(row.variancePct) : '—'}
                  </td>
                  <td className={`px-3 py-2.5 text-right font-medium ${row.projectedEOD > row.budgetAmount * 1.05 ? 'text-rose-600' : row.projectedEOD < row.budgetAmount * 0.9 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {row.actualSpend > 0 ? money(row.projectedEOD) : '—'}
                  </td>
                  <td className={`px-3 py-2.5 text-right font-medium ${row.dailyNeeded > row.dailyBudget * 1.2 ? 'text-rose-600' : 'text-slate-700'}`}>
                    {row.daysRemaining > 0 ? `${money(row.dailyNeeded)}/day` : '—'}
                  </td>
                  <td className="px-3 py-2.5"><StatusBadge status={row.status} /></td>
                </tr>
              ))}
            </tbody>
            {totals && (
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50 text-sm font-semibold">
                  <td className="px-3 py-2.5" colSpan={4}>TOTAL — {pacingRows.length} account{pacingRows.length !== 1 ? 's' : ''}</td>
                  <td className="px-3 py-2.5 text-right">{money(totals.totalBudget)}</td>
                  <td className="px-3 py-2.5 text-right">{money(totals.totalDaily)}</td>
                  <td className="px-3 py-2.5 text-right">{money(totals.totalSpend)}</td>
                  <td className="px-3 py-2.5 text-right">{money(totals.totalExpected)}</td>
                  <td className={`px-3 py-2.5 text-right ${totals.totalVariance > 0 ? 'text-amber-600' : 'text-rose-600'}`}>{money(totals.totalVariance)}</td>
                  <td className={`px-3 py-2.5 text-right ${totals.variancePct > 10 ? 'text-amber-600' : totals.variancePct < -10 ? 'text-rose-600' : 'text-emerald-600'}`}>{pct(totals.variancePct)}</td>
                  <td className="px-3 py-2.5 text-right">{money(totals.totalProjected)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

    </section>
  );
}
