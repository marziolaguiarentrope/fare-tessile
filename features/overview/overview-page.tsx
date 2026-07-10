'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarRange, ChevronRight, Users } from 'lucide-react';
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useClientGroups } from '@/hooks/use-client-groups';
import { ClientGroupsModal } from './components/client-groups-modal';

// ── Platform registry ─────────────────────────────────────────────────────────

interface PlatformConfig {
  dsId: string;
  label: string;
  color: string;
  textClass: string;
  badge: string;
  badgeClass: string;
  metricLabel: string;
  metricCandidates: string[];
  metricDisallow: string[];
  /** True = ad spend platform → shown in daily chart and gets full metrics columns */
  adPlatform: boolean;
}

const PLATFORMS: PlatformConfig[] = [
  {
    dsId: 'FA',
    label: 'Meta Ads',
    color: '#1877F2',
    textClass: 'text-blue-700',
    badge: 'META',
    badgeClass: 'bg-blue-100 text-blue-700',
    metricLabel: 'Spend',
    metricCandidates: ['spend', 'cost'],
    metricDisallow: ['social', 'per ', 'per_', 'roas', 'return', 'rate', 'cpc', 'cpm', 'cpa', 'ctr', 'video', 'mobile', 'canvas', 'desktop'],
    adPlatform: true,
  },
  {
    dsId: 'AW',
    label: 'Google Ads',
    color: '#EA4335',
    textClass: 'text-red-600',
    badge: 'GOOG',
    badgeClass: 'bg-red-100 text-red-700',
    metricLabel: 'Spend',
    metricCandidates: ['spend', 'cost'],
    metricDisallow: ['social', 'per ', 'per_', 'roas', 'return', 'rate', 'cpc', 'cpm', 'cpa', 'ctr', 'video', 'mobile', 'canvas', 'desktop'],
    adPlatform: true,
  },
  {
    dsId: 'SHP',
    label: 'Shopify',
    color: '#96BF48',
    textClass: 'text-green-700',
    badge: 'SHOP',
    badgeClass: 'bg-green-100 text-green-700',
    metricLabel: 'Revenue',
    metricCandidates: ['total sales', 'net sales', 'gross sales', 'gross revenue', 'net revenue', 'gross_revenue', 'net_revenue', 'total_sales', 'revenue', 'sales'],
    metricDisallow: ['per ', 'per_', 'rate', 'cpc', 'cpm', 'refund', 'return', 'shipping', 'tax', 'fees'],
    adPlatform: false,
  },
  {
    dsId: 'HS',
    label: 'HubSpot',
    color: '#FF7A59',
    textClass: 'text-orange-600',
    badge: 'HS',
    badgeClass: 'bg-orange-100 text-orange-700',
    metricLabel: 'Revenue',
    metricCandidates: ['amount', 'revenue', 'deal_amount', 'hs_acv', 'total_revenue', 'total'],
    metricDisallow: ['per_', 'per ', 'rate', 'count'],
    adPlatform: false,
  },
];

const PLATFORM_BY_ID = Object.fromEntries(PLATFORMS.map((p) => [p.dsId, p]));

// Fare Tessile-branded palette for client-view chart lines
const CLIENT_PALETTE = [
  '#071428', // Navy
  '#020617', // Black
  '#0B1F3A', // Deep blue
  '#1E3A8A', // Royal blue
  '#2563EB', // Blue
  '#38BDF8', // Sky
  '#60A5FA', // Cornflower
  '#334155', // Slate
  '#0F172A', // Navy light
  '#93C5FD', // Blue light
  '#67E8F9', // Cyan light
  '#22C55E', // Green
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface Account { id: string; name: string; platform: string; dsUser: string; }
interface SpendRow {
  date: string | null;
  accountName: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  orders: number;
  sessions: number;
  platform: string;
}
type DatePreset = 'today' | 'yesterday' | 'last_7' | 'last_30' | 'this_month' | 'last_month' | 'custom';
type ChartView = 'platform' | 'client';

// ── Date helpers ──────────────────────────────────────────────────────────────

function toYMD(d: Date) { return d.toISOString().slice(0, 10); }

function normalizeDate(raw: string): string {
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const mdY = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mdY) return `${mdY[3]}-${mdY[1].padStart(2, '0')}-${mdY[2].padStart(2, '0')}`;
  const ymd = s.match(/^(\d{4})\/(\d{2})\/(\d{2})/);
  if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
  return s.slice(0, 10);
}

function resolveRange(preset: DatePreset, customStart: string, customEnd: string): { start: string; end: string } {
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

const PRESET_LABELS: Record<DatePreset, string> = {
  today: 'Today', yesterday: 'Yesterday', last_7: 'Last 7 days',
  last_30: 'Last 30 days', this_month: 'This month', last_month: 'Last month', custom: 'Custom…',
};

// ── Formatting ────────────────────────────────────────────────────────────────

const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

/** Full value: $336,271 — only abbreviates at ≥ $1M */
const moneyFull = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  return money(n);
};

/** Compact: used in tooltips / tight spaces */
const moneyCompact = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}k`;
  return money(n);
};

/** Number compact: 450000 → 450k, 1200000 → 1.2M */
const numCompact = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}k`;
  return n.toLocaleString();
};

// ── Small components ──────────────────────────────────────────────────────────

function KpiBlock({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <article className="card">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color ?? 'text-slate-900'}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </article>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function OverviewPage() {
  // ── Account & spend data ────────────────────────────────────────────────

  const [accounts, setAccounts]       = useState<Account[]>([]);
  const [acctLoading, setAcctLoading] = useState(true);
  const [acctErrors, setAcctErrors]   = useState<Record<string, string>>({});

  const [rows, setRows]                 = useState<SpendRow[]>([]);
  const [spendLoading, setSpendLoading] = useState(false);
  const [spendErrors, setSpendErrors]   = useState<Record<string, string>>({});
  const [lastUpdated, setLastUpdated]   = useState<string | null>(null);
  const [spendBatches, setSpendBatches] = useState<Record<string, number>>({});
  const [resolvedFields, setResolvedFields] = useState<Record<string, { date?: string; metric?: string }>>({});

  // ── Client groups (persisted in localStorage) ───────────────────────────

  const { groups, addGroup, removeGroup, renameGroup, assignAccount } = useClientGroups();
  const [showClientsModal, setShowClientsModal] = useState(false);

  // ── UI state ────────────────────────────────────────────────────────────

  const [chartView, setChartView]             = useState<ChartView>('platform');
  const [selectedClients, setSelectedClients] = useState<Set<string> | null>(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string> | null>(null);

  const [preset, setPreset]           = useState<DatePreset>('last_7');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd]     = useState('');

  /** Maps original dsId (e.g. "SP") → user-configured override (e.g. "SHO") */
  const [platformDsIdOverrides, setPlatformDsIdOverrides] = useState<Record<string, string>>({});
  const [overrideInputs, setOverrideInputs]               = useState<Record<string, string>>({});
  const [acctLoadTrigger, setAcctLoadTrigger]             = useState(0);

  const range = useMemo(() => resolveRange(preset, customStart, customEnd), [preset, customStart, customEnd]);

  // Load saved ds_id overrides from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('Fare Tessile-platform-dsids');
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, string>;
        if (Object.keys(parsed).length > 0) {
          setPlatformDsIdOverrides(parsed);
          setAcctLoadTrigger((t) => t + 1); // re-fetch accounts with overrides applied
        }
      }
    } catch {}
  }, []);

  // ── Load all accounts for all platforms ───────────────────────────────────

  useEffect(() => {
    async function loadAccounts() {
      setAcctLoading(true);
      setAcctErrors({});

      const results = await Promise.allSettled(
        PLATFORMS.map(async (p) => {
          const effectiveDsId = platformDsIdOverrides[p.dsId] ?? p.dsId;
          const r = await fetch(`/api/integrations/supermetrics/accounts?dsId=${effectiveDsId}`);
          const j = await r.json() as { data?: Array<{ ds_user: string; accounts: Array<{ account_id: string; account_name: string }> }> };
          if (!r.ok) throw new Error((j as { message?: string }).message ?? `Failed to load ${p.label} accounts`);
          return { dsId: p.dsId, data: j };
        })
      );

      const newAccounts: Account[] = [];
      const errors: Record<string, string> = {};

      for (let i = 0; i < PLATFORMS.length; i++) {
        const p = PLATFORMS[i];
        const result = results[i];
        if (result.status === 'fulfilled') {
          (result.value.data.data ?? []).forEach((g) => {
            (g.accounts ?? []).forEach((a) => {
              newAccounts.push({ id: a.account_id, name: a.account_name, platform: p.dsId, dsUser: g.ds_user });
            });
          });
        } else {
          errors[p.dsId] = result.reason instanceof Error ? result.reason.message : `Error loading ${p.label}`;
        }
      }

      setAccounts(newAccounts);
      setAcctErrors(errors);
      setAcctLoading(false);
    }
    loadAccounts();
  }, [acctLoadTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load spend ────────────────────────────────────────────────────────────

  const loadSpend = useCallback(async () => {
    const byPlatform: Record<string, Map<string, string[]>> = {};
    for (const a of accounts) {
      if (!byPlatform[a.platform]) byPlatform[a.platform] = new Map();
      const userMap = byPlatform[a.platform];
      if (!userMap.has(a.dsUser)) userMap.set(a.dsUser, []);
      userMap.get(a.dsUser)!.push(a.id);
    }
    if (Object.keys(byPlatform).length === 0) return;

    setSpendLoading(true);
    setSpendErrors({});

    type SpendResponse = {
      data?: { date: string | null; accountName: string | null; spend: number; impressions?: number; clicks?: number; orders?: number; sessions?: number }[];
      meta?: { queries?: number; resolvedFields?: { date?: { name: string }; spend?: { name: string } } };
    };

    const platformEntries = Object.entries(byPlatform);

    const results = await Promise.allSettled(
      platformEntries.map(async ([dsId, userMap]) => {
        const p = PLATFORM_BY_ID[dsId];
        const effectiveDsId = platformDsIdOverrides[dsId] ?? dsId;
        const loginGroups = Array.from(userMap.entries()).map(([dsUser, accountIds]) => ({ dsUser, accountIds }));
        const res = await fetch('/api/integrations/supermetrics/spend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dsId: effectiveDsId, loginGroups, startDate: range.start, endDate: range.end,
            metricCandidates: p?.metricCandidates,
            metricDisallow:   p?.metricDisallow,
          }),
        });
        const json = await res.json() as SpendResponse;
        if (!res.ok) throw new Error((json as { message?: string }).message ?? `Failed to fetch ${p?.label ?? dsId} data`);
        return { dsId, json };
      })
    );

    setSpendLoading(false);

    const newRows: SpendRow[] = [];
    const errors: Record<string, string> = {};
    const batches: Record<string, number> = {};
    const fields: Record<string, { date?: string; metric?: string }> = {};

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const dsId = platformEntries[i][0];
      if (result.status === 'fulfilled') {
        const { json } = result.value;
        (json.data ?? []).forEach((r) => {
          newRows.push({
            date: r.date ? normalizeDate(r.date) : null,
            accountName: r.accountName,
            spend: r.spend,
            impressions: r.impressions ?? 0,
            clicks:      r.clicks      ?? 0,
            orders:      r.orders      ?? 0,
            sessions:    r.sessions    ?? 0,
            platform: dsId,
          });
        });
        batches[dsId] = json.meta?.queries ?? 0;
        fields[dsId] = { date: json.meta?.resolvedFields?.date?.name, metric: json.meta?.resolvedFields?.spend?.name };
      } else {
        errors[dsId] = result.reason instanceof Error ? result.reason.message : 'Failed';
      }
    }

    setRows(newRows);
    setSpendErrors(errors);
    setSpendBatches(batches);
    setResolvedFields(fields);
    setLastUpdated(new Date().toLocaleTimeString());
  }, [accounts, range, platformDsIdOverrides]);

  useEffect(() => { if (accounts.length > 0) loadSpend(); }, [loadSpend]);

  // Reset selections when data reloads
  useEffect(() => { setSelectedClients(null); setSelectedGroupIds(null); }, [rows]);

  // ── Lookup maps ───────────────────────────────────────────────────────────

  /** "platform::accountName" → account ID */
  const accountKeyToId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const a of accounts) map[`${a.platform}::${a.name}`] = a.id;
    return map;
  }, [accounts]);

  /** accountId → groupId */
  const accountIdToGroupId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const g of groups) for (const id of g.accountIds) map[id] = g.id;
    return map;
  }, [groups]);

  // ── Per-account breakdown (platform view) ────────────────────────────────

  const accountBreakdown = useMemo(() => {
    // Key = "platform::name" so same-named accounts on different platforms stay separate
    const map: Record<string, { name: string; spend: number; impressions: number; clicks: number; orders: number; sessions: number; platform: string }> = {};
    for (const row of rows) {
      const name = row.accountName ?? '(unknown)';
      const key  = `${row.platform}::${name}`;
      if (!map[key]) map[key] = { name, spend: 0, impressions: 0, clicks: 0, orders: 0, sessions: 0, platform: row.platform };
      map[key].spend       += row.spend;
      map[key].impressions += row.impressions;
      map[key].clicks      += row.clicks;
      map[key].orders      += row.orders;
      map[key].sessions    += row.sessions;
    }
    return Object.values(map).sort((a, b) => b.spend - a.spend);
  }, [rows]);

  // Compound keys "platform::name" so same store name on multiple platforms stays independent
  const allAccountKeys = useMemo(() => new Set(accountBreakdown.map((c) => `${c.platform}::${c.name}`)), [accountBreakdown]);
  const activeAccounts: Set<string> = selectedClients ?? allAccountKeys;

  // ── Per-client breakdown (client view) ───────────────────────────────────

  const groupedBreakdown = useMemo(() => {
    if (groups.length === 0) return null;

    const byGroup: Record<string, { name: string; spend: number; byPlatform: Record<string, number> }> = {};
    for (const g of groups) byGroup[g.id] = { name: g.name, spend: 0, byPlatform: {} };

    const unassigned: Record<string, { accountName: string; platform: string; spend: number }> = {};

    for (const row of rows) {
      const accountId = accountKeyToId[`${row.platform}::${row.accountName}`];
      const groupId   = accountId ? accountIdToGroupId[accountId] : undefined;

      if (groupId && byGroup[groupId]) {
        byGroup[groupId].spend += row.spend;
        byGroup[groupId].byPlatform[row.platform] = (byGroup[groupId].byPlatform[row.platform] ?? 0) + row.spend;
      } else {
        const key = `${row.platform}::${row.accountName}`;
        if (!unassigned[key]) unassigned[key] = { accountName: row.accountName ?? '(unknown)', platform: row.platform, spend: 0 };
        unassigned[key].spend += row.spend;
      }
    }

    const allGroupIds = new Set(groups.map((g) => g.id));
    const activeGroups: Set<string> = selectedGroupIds ?? allGroupIds;

    return {
      clients: Object.entries(byGroup)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => b.spend - a.spend),
      unassigned: Object.values(unassigned).sort((a, b) => b.spend - a.spend),
      allGroupIds,
      activeGroups,
    };
  }, [groups, rows, accountKeyToId, accountIdToGroupId, selectedGroupIds]);

  // ── Platform-view totals ──────────────────────────────────────────────────

  const platformTotals = useMemo(() => {
    const byPlatform: Record<string, number> = {};
    const byDay: Record<string, Record<string, number>> = {};

    for (const row of rows) {
      const name = row.accountName ?? '(unknown)';
      if (!activeAccounts.has(`${row.platform}::${name}`)) continue;
      byPlatform[row.platform] = (byPlatform[row.platform] ?? 0) + row.spend;
      if (row.date) {
        if (!byDay[row.date]) byDay[row.date] = {};
        byDay[row.date][row.platform] = (byDay[row.date][row.platform] ?? 0) + row.spend;
      }
    }

    // All platforms with data (for KPI cards + breakdown)
    const activePlatforms = PLATFORMS.filter((p) => rows.some((r) => r.platform === p.dsId));
    // Only ad-spend platforms for the daily chart
    const chartPlatforms  = activePlatforms.filter((p) => p.adPlatform);

    const chartData = Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, byPlat]) => {
        const point: Record<string, number | string> = { date: date.slice(5) };
        let total = 0;
        for (const p of chartPlatforms) {
          const v = Math.round(byPlat[p.dsId] ?? 0);
          point[p.label] = v;
          total += v;
        }
        point['Total'] = total;
        return point;
      });

    const total = Object.values(byPlatform).reduce((s, v) => s + v, 0);
    return { byPlatform, total, chartData, activePlatforms, chartPlatforms };
  }, [rows, activeAccounts]);

  // ── Client-view chart data ────────────────────────────────────────────────

  const clientChartData = useMemo(() => {
    if (!groupedBreakdown) return null;

    const byDay: Record<string, Record<string, number>> = {};

    for (const row of rows) {
      if (!row.date) continue;
      const accountId = accountKeyToId[`${row.platform}::${row.accountName}`];
      const groupId   = accountId ? accountIdToGroupId[accountId] : null;
      const label     = groupId ? (groups.find((g) => g.id === groupId)?.name ?? 'Unassigned') : 'Unassigned';

      if (!byDay[row.date]) byDay[row.date] = {};
      byDay[row.date][label] = (byDay[row.date][label] ?? 0) + row.spend;
    }

    const clientNames = [
      ...groups.map((g) => g.name),
      ...Object.values(byDay).some((d) => d['Unassigned']) ? ['Unassigned'] : [],
    ];

    return {
      data: Object.entries(byDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, byClient]) => {
          const point: Record<string, number | string> = { date: date.slice(5) };
          for (const name of clientNames) point[name] = Math.round(byClient[name] ?? 0);
          return point;
        }),
      clientNames,
    };
  }, [groupedBreakdown, groups, rows, accountKeyToId, accountIdToGroupId]);

  const isAggregated = rows.length > 0 && new Set(rows.map((r) => r.date).filter(Boolean)).size <= 1;

  function toggleAccount(key: string) {
    setSelectedClients((prev) => {
      const base = prev ?? allAccountKeys;
      const next = new Set(base);
      next.has(key) ? next.delete(key) : next.add(key);
      return next.size === allAccountKeys.size ? null : next;
    });
  }

  function toggleGroup(id: string) {
    setSelectedGroupIds((prev) => {
      const base = prev ?? (groupedBreakdown?.allGroupIds ?? new Set());
      const next = new Set(base);
      next.has(id) ? next.delete(id) : next.add(id);
      return next.size === (groupedBreakdown?.allGroupIds.size ?? 0) ? null : next;
    });
  }

  const fatalErrors    = Object.entries(acctErrors).map(([dsId, msg]) => ({ dsId, label: PLATFORM_BY_ID[dsId]?.label ?? dsId, msg }));
  const spendErrorList = Object.entries(spendErrors).map(([dsId, msg]) => ({ label: PLATFORM_BY_ID[dsId]?.label ?? dsId, msg }));

  const hasGroups = groups.length > 0;

  // Effective grand total from either view
  const grandTotal = chartView === 'client' && groupedBreakdown
    ? groupedBreakdown.clients.reduce((s, c) => s + c.spend, 0) + groupedBreakdown.unassigned.reduce((s, u) => s + u.spend, 0)
    : platformTotals.total;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {showClientsModal && (
        <ClientGroupsModal
          accounts={accounts}
          groups={groups}
          platforms={PLATFORMS}
          onAddGroup={addGroup}
          onRemoveGroup={removeGroup}
          onRenameGroup={renameGroup}
          onAssignAccount={assignAccount}
          onClose={() => setShowClientsModal(false)}
        />
      )}

      {/* Header */}
      <section className="flex flex-wrap items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Overview</h2>
          <p className="text-sm text-slate-500">
            Activity across {platformTotals.activePlatforms.map((p) => p.label).join(', ') || 'all platforms'}.
          </p>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {/* Manage clients button */}
          <button
            onClick={() => setShowClientsModal(true)}
            className="flex items-center gap-1.5 rounded-lg border border-brand-gray/70 bg-white px-3 py-1.5 text-sm text-slate-600 shadow-sm hover:bg-slate-50"
          >
            <Users className="w-4 h-4" />
            Manage Clients
            {hasGroups && (
              <span className="ml-1 rounded-full bg-brand-gold/20 text-brand-navy text-xs font-bold px-1.5 py-0.5">
                {groups.length}
              </span>
            )}
          </button>

          {/* Date range */}
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-sm text-sm">
            <CalendarRange className="w-4 h-4 text-slate-400" />
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value as DatePreset)}
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
            onClick={loadSpend}
            disabled={spendLoading || acctLoading || accounts.length === 0}
            className="rounded-md bg-brand-navy px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-navy/85 disabled:opacity-50"
          >
            {spendLoading ? 'Loading…' : '↺ Refresh'}
          </button>
          {lastUpdated && <span className="text-xs text-slate-400">Updated {lastUpdated}</span>}
        </div>
      </section>

      {/* Errors */}
      {fatalErrors.length > 0 && (
        <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800 space-y-2">
          {fatalErrors.map((e) => {
            const isInvalidDsId = e.msg.toLowerCase().includes('not a valid data source id');
            const currentOverride = platformDsIdOverrides[e.dsId];
            return (
              <div key={e.label} className="flex flex-wrap items-center gap-2">
                <span><strong>{e.label}:</strong> {e.msg}</span>
                {isInvalidDsId && (
                  <span className="flex items-center gap-1 flex-shrink-0">
                    <input
                      type="text"
                      value={overrideInputs[e.dsId] ?? currentOverride ?? ''}
                      onChange={(ev) => setOverrideInputs((prev) => ({ ...prev, [e.dsId]: ev.target.value }))}
                      onKeyDown={(ev) => {
                        if (ev.key === 'Enter') {
                          const val = (overrideInputs[e.dsId] ?? '').trim().toUpperCase();
                          if (!val) return;
                          const next = { ...platformDsIdOverrides, [e.dsId]: val };
                          setPlatformDsIdOverrides(next);
                          try { localStorage.setItem('Fare Tessile-platform-dsids', JSON.stringify(next)); } catch {}
                          setAcctLoadTrigger((t) => t + 1);
                        }
                      }}
                      placeholder="Try another ds_id…"
                      className="rounded border border-amber-300 bg-white px-2 py-0.5 text-xs w-36 text-slate-800"
                    />
                    <button
                      onClick={() => {
                        const val = (overrideInputs[e.dsId] ?? '').trim().toUpperCase();
                        if (!val) return;
                        const next = { ...platformDsIdOverrides, [e.dsId]: val };
                        setPlatformDsIdOverrides(next);
                        try { localStorage.setItem('Fare Tessile-platform-dsids', JSON.stringify(next)); } catch {}
                        setAcctLoadTrigger((t) => t + 1);
                      }}
                      className="rounded bg-amber-600 px-2 py-0.5 text-white text-xs hover:bg-amber-700"
                    >
                      Try
                    </button>
                    {currentOverride && (
                      <span className="text-[10px] text-amber-600">current: <strong>{currentOverride}</strong></span>
                    )}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
      {spendErrorList.length > 0 && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {spendErrorList.map((e) => `${e.label}: ${e.msg}`).join(' · ')}
        </p>
      )}
      {isAggregated && (
        <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
          <strong>No daily breakdown detected.</strong> Spend data arrived as a single aggregated row — daily chart will not be accurate.
        </div>
      )}

      {/* KPI cards */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {spendLoading || acctLoading ? (
          Array.from({ length: Math.max(platformTotals.activePlatforms.length + 1, 3) }).map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-3 w-24 rounded bg-slate-200 mb-3" />
              <div className="h-7 w-32 rounded bg-slate-200" />
            </div>
          ))
        ) : (
          <>
            <KpiBlock label="Total" value={moneyFull(grandTotal)} sub={`${range.start} → ${range.end}`} />
            {platformTotals.activePlatforms.map((p) => {
              const v = platformTotals.byPlatform[p.dsId] ?? 0;
              return (
                <KpiBlock
                  key={p.dsId}
                  label={`${p.label} ${p.metricLabel}`}
                  value={moneyFull(v)}
                  sub={platformTotals.total > 0 ? `${((v / platformTotals.total) * 100).toFixed(1)}%` : undefined}
                  color={p.textClass}
                />
              );
            })}
          </>
        )}
      </section>

      {/* Daily chart */}
      <section className="card">
        <div className="flex items-center gap-3 mb-4">
          <p className="text-sm font-semibold text-slate-700">Daily Activity</p>
          {/* View toggle */}
          {hasGroups && (
            <div className="ml-auto flex rounded-lg border border-slate-200 overflow-hidden text-xs font-medium">
              <button
                onClick={() => setChartView('platform')}
                className={`px-3 py-1.5 transition-colors ${chartView === 'platform' ? 'bg-brand-navy text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                By Platform
              </button>
              <button
                onClick={() => setChartView('client')}
                className={`px-3 py-1.5 border-l border-slate-200 transition-colors ${chartView === 'client' ? 'bg-brand-navy text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                By Client
              </button>
            </div>
          )}
        </div>

        {spendLoading ? (
          <div className="flex h-64 items-center justify-center text-sm text-slate-400 animate-pulse">Loading…</div>
        ) : chartView === 'client' && clientChartData ? (
          clientChartData.data.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-400">No data for this period.</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={clientChartData.data} margin={{ top: 4, right: 40, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tickFormatter={(v: number) => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={56} />
                <Tooltip formatter={(v: number, name: string) => [money(v), name]} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {clientChartData.clientNames.map((name, i) => (
                  <Line key={name} type="monotone" dataKey={name} stroke={CLIENT_PALETTE[i % CLIENT_PALETTE.length]} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          )
        ) : platformTotals.chartData.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-slate-400">
            {accounts.length === 0 ? 'No accounts connected.' : 'No data for this period.'}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={platformTotals.chartData} margin={{ top: 4, right: 40, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tickFormatter={(v: number) => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={56} />
              <Tooltip formatter={(v: number, name: string) => [money(v), name]} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {platformTotals.chartPlatforms.map((p) => (
                <Line key={p.dsId} type="monotone" dataKey={p.label} stroke={p.color} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
              ))}
              {platformTotals.chartPlatforms.length > 1 && (
                <Line type="monotone" dataKey="Total" stroke="#6366f1" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* ── Breakdown section ─────────────────────────────────────────────── */}

      {/* ── Client groups view ──────────────────────────────────────────────── */}
      {hasGroups && groupedBreakdown && groupedBreakdown.clients.length > 0 && (
        <section className="card p-0 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-700">By Client</p>
            {selectedGroupIds !== null && (
              <span className="rounded-full bg-brand-gold/20 text-brand-navy text-xs font-bold px-2 py-0.5">
                {groupedBreakdown.activeGroups.size} of {groupedBreakdown.allGroupIds.size} selected
              </span>
            )}
            <div className="ml-auto flex gap-2">
              {selectedGroupIds !== null && <button onClick={() => setSelectedGroupIds(null)} className="text-xs text-brand-navy hover:text-brand-navy/70 font-medium">Select all</button>}
              {selectedGroupIds !== null && <span className="text-slate-200">|</span>}
              <button onClick={() => setSelectedGroupIds(new Set())} className="text-xs text-slate-400 hover:text-slate-600">Clear all</button>
            </div>
          </div>
          <div className="divide-y divide-slate-50">
            {groupedBreakdown.clients.map((client, idx) => {
              const isActive = groupedBreakdown.activeGroups.has(client.id);
              const totalAll = groupedBreakdown.clients.reduce((s, c) => s + c.spend, 0);
              const pct = totalAll > 0 ? (client.spend / totalAll) * 100 : 0;
              const color = CLIENT_PALETTE[idx % CLIENT_PALETTE.length];
              return (
                <div key={client.id} onClick={() => toggleGroup(client.id)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer select-none transition-colors ${isActive ? 'hover:bg-slate-50' : 'opacity-40 hover:opacity-60 hover:bg-slate-50'}`}>
                  <div className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center ${isActive ? 'border-brand-navy bg-brand-navy' : 'border-slate-300 bg-white'}`}>
                    {isActive && <svg viewBox="0 0 10 8" fill="none" className="w-2.5 h-2.5"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  <span className={`flex-1 text-sm font-semibold truncate ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>{client.name}</span>
                  <div className="hidden sm:flex gap-2 flex-shrink-0">
                    {Object.entries(client.byPlatform).sort(([,a],[,b]) => b-a).map(([dsId, v]) => {
                      const plat = PLATFORM_BY_ID[dsId];
                      return <span key={dsId} className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${plat?.badgeClass ?? 'bg-slate-100 text-slate-600'}`}>{plat?.badge ?? dsId}: {moneyFull(v)}</span>;
                    })}
                  </div>
                  <div className="hidden sm:block w-20 flex-shrink-0">
                    <div className="h-1.5 w-full rounded-full bg-slate-100">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
                    </div>
                  </div>
                  <span className={`text-sm font-bold tabular-nums w-24 text-right flex-shrink-0 ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>{moneyFull(client.spend)}</span>
                  <span className="text-xs text-slate-400 w-10 text-right tabular-nums flex-shrink-0">{pct.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
          {groupedBreakdown.unassigned.length > 0 && (
            <div className="border-t border-slate-200">
              <div className="px-4 py-2 bg-slate-50">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Unassigned ({groupedBreakdown.unassigned.length})</p>
              </div>
              {groupedBreakdown.unassigned.map((u) => {
                const plat = PLATFORM_BY_ID[u.platform];
                return (
                  <div key={`${u.platform}::${u.accountName}`} className="flex items-center gap-3 px-4 py-2 opacity-60">
                    <span className={`flex-shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${plat?.badgeClass ?? 'bg-slate-100 text-slate-600'}`}>{plat?.badge ?? u.platform}</span>
                    <span className="flex-1 text-sm text-slate-600 truncate">{u.accountName}</span>
                    <span className="text-sm tabular-nums text-slate-500 w-24 text-right">{moneyFull(u.spend)}</span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-2.5 flex items-center justify-between text-xs text-slate-500">
            <span>{groups.length} clients · {groupedBreakdown.unassigned.length} unassigned</span>
            <span className="font-semibold text-slate-700">{moneyFull(grandTotal)} total</span>
          </div>
        </section>
      )}

      {/* ── Account breakdown — separated by platform with metrics ─────────── */}
      {accountBreakdown.length > 0 && (() => {
        const totalAll = accountBreakdown.reduce((s, c) => s + c.spend, 0);
        return (
          <section className="card p-0 overflow-hidden">
            {/* Section header + selection controls */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-700">{hasGroups ? 'All Accounts' : 'Account Breakdown'}</p>
              {selectedClients !== null && (
                <span className="rounded-full bg-brand-gold/20 text-brand-navy text-xs font-bold px-2 py-0.5">
                  {activeAccounts.size} of {allAccountKeys.size} selected
                </span>
              )}
              <div className="ml-auto flex gap-2">
                {selectedClients !== null && <button onClick={() => setSelectedClients(null)} className="text-xs text-brand-navy hover:text-brand-navy/70 font-medium">Select all</button>}
                {selectedClients !== null && <span className="text-slate-200">|</span>}
                <button onClick={() => setSelectedClients(new Set())} className="text-xs text-slate-400 hover:text-slate-600">Clear all</button>
              </div>
            </div>

            {/* Per-platform sections */}
            {platformTotals.activePlatforms.map((plat) => {
              const platAccounts = accountBreakdown.filter((a) => a.platform === plat.dsId);
              if (platAccounts.length === 0) return null;
              const isAdPlatform = plat.adPlatform;
              const platTotal    = platAccounts.reduce((s, a) => s + a.spend, 0);
              const hasOrd       = !isAdPlatform && platAccounts.some((a) => a.orders > 0);
              const hasSes       = !isAdPlatform && platAccounts.some((a) => a.sessions > 0);

              return (
                <div key={plat.dsId}>
                  {/* Platform sub-header with column labels */}
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-y border-slate-100">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${plat.badgeClass}`}>{plat.badge}</span>
                    <span className="text-xs font-semibold text-slate-600">{plat.label}</span>
                    <span className="text-xs text-slate-400 ml-1">— {moneyFull(platTotal)}</span>
                    {isAdPlatform && (
                      <div className="ml-auto hidden sm:flex items-center gap-0 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                        <span className="w-24 text-right">Spend</span>
                        <span className="w-16 text-right">Impr</span>
                        <span className="w-14 text-right">Clicks</span>
                        <span className="w-10 text-right">CTR</span>
                        <span className="w-14 text-right">CPC</span>
                        <span className="w-10 text-right">%</span>
                      </div>
                    )}
                    {!isAdPlatform && (
                      <div className="ml-auto hidden sm:flex items-center gap-0 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                        <span className="w-24 text-right">{plat.metricLabel}</span>
                        {hasOrd && <span className="w-16 text-right">Orders</span>}
                        {hasOrd && <span className="w-16 text-right">AOV</span>}
                        {hasSes && <span className="w-16 text-right">Sessions</span>}
                        {hasOrd && hasSes && <span className="w-14 text-right">Conv%</span>}
                        <span className="w-10 text-right">%</span>
                      </div>
                    )}
                  </div>

                  {/* Account rows */}
                  <div className="divide-y divide-slate-50">
                    {platAccounts.map((acct) => {
                      const acctKey = `${acct.platform}::${acct.name}`;
                      const isActive = activeAccounts.has(acctKey);
                      const pct = totalAll > 0 ? (acct.spend / totalAll) * 100 : 0;
                      const ctr = acct.impressions > 0 ? (acct.clicks / acct.impressions) * 100 : 0;
                      const cpc = acct.clicks > 0 ? acct.spend / acct.clicks : 0;

                      return (
                        <div
                          key={acctKey}
                          onClick={() => toggleAccount(acctKey)}
                          className={`flex items-center gap-2 px-4 py-2 cursor-pointer select-none transition-colors ${isActive ? 'hover:bg-slate-50' : 'opacity-40 hover:opacity-60 hover:bg-slate-50'}`}
                        >
                          {/* Checkbox */}
                          <div className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center ${isActive ? 'bg-brand-navy border-brand-navy' : 'border-slate-300 bg-white'}`}>
                            {isActive && <svg viewBox="0 0 10 8" fill="none" className="w-2.5 h-2.5"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                          </div>

                          {/* Account name */}
                          <span className={`flex-1 text-sm truncate ${isActive ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>{acct.name}</span>

                          {/* Ad platform metrics */}
                          {isAdPlatform ? (
                            <>
                              {/* Mobile: just spend */}
                              <span className={`sm:hidden text-sm font-semibold tabular-nums ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>{moneyFull(acct.spend)}</span>
                              {/* Desktop: full metrics row */}
                              <div className={`hidden sm:flex items-center gap-0 tabular-nums text-xs ${isActive ? 'text-slate-700' : 'text-slate-400'}`}>
                                <span className={`w-24 text-right font-bold ${isActive ? 'text-slate-900' : ''}`}>{moneyFull(acct.spend)}</span>
                                <span className="w-16 text-right">{acct.impressions > 0 ? numCompact(acct.impressions) : '—'}</span>
                                <span className="w-14 text-right">{acct.clicks > 0 ? numCompact(acct.clicks) : '—'}</span>
                                <span className="w-10 text-right">{acct.impressions > 0 ? `${ctr.toFixed(2)}%` : '—'}</span>
                                <span className="w-14 text-right">{acct.clicks > 0 ? `$${cpc.toFixed(2)}` : '—'}</span>
                                <span className="w-10 text-right text-slate-400">{pct.toFixed(1)}%</span>
                              </div>
                            </>
                          ) : (
                            /* Non-ad platform: revenue + e-commerce metrics */
                            <div className={`hidden sm:flex items-center gap-0 tabular-nums text-xs ${isActive ? 'text-slate-700' : 'text-slate-400'}`}>
                              <span className={`w-24 text-right font-bold ${isActive ? 'text-slate-900' : ''}`}>{moneyFull(acct.spend)}</span>
                              {hasOrd && <span className="w-16 text-right">{acct.orders > 0 ? acct.orders.toLocaleString() : '—'}</span>}
                              {hasOrd && <span className="w-16 text-right">{acct.orders > 0 ? moneyCompact(acct.spend / acct.orders) : '—'}</span>}
                              {hasSes && <span className="w-16 text-right">{acct.sessions > 0 ? numCompact(acct.sessions) : '—'}</span>}
                              {hasOrd && hasSes && <span className="w-14 text-right">{acct.sessions > 0 && acct.orders > 0 ? `${((acct.orders / acct.sessions) * 100).toFixed(1)}%` : '—'}</span>}
                              <span className="w-10 text-right text-slate-400">{pct.toFixed(1)}%</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-2.5 flex items-center justify-between text-xs text-slate-500">
              <span>{accountBreakdown.length} accounts · {platformTotals.activePlatforms.map((p) => `${accountBreakdown.filter((a) => a.platform === p.dsId).length} ${p.badge}`).join(' · ')}</span>
              <span className="font-semibold text-slate-700">{moneyFull(totalAll)} total</span>
            </div>
          </section>
        );
      })()}

      {/* Debug panel */}
      {(rows.length > 0 || accounts.length > 0) && (
        <details className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          <summary className="cursor-pointer font-medium text-slate-600 select-none">Debug info</summary>
          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1">
            <span>Date range:</span><strong>{range.start} → {range.end}</strong>
            <span>Client groups saved:</span><strong>{groups.length}</strong>
            {PLATFORMS.map((p) => {
              const accts = accounts.filter((a) => a.platform === p.dsId).length;
              const platRows = rows.filter((r) => r.platform === p.dsId);
              const zero = platRows.filter((r) => r.spend === 0).length;
              const rf = resolvedFields[p.dsId];
              const err = acctErrors[p.dsId] ?? spendErrors[p.dsId];
              return (
                <div key={p.dsId} className="contents">
                  <span className="col-span-2 mt-2 font-semibold text-slate-600">{p.label}</span>
                  {err && <><span>Error:</span><strong className="text-rose-600">{err}</strong></>}
                  <span>Accounts:</span><strong>{accts}</strong>
                  <span>Rows:</span><strong>{platRows.length} ({zero} zero) — {spendBatches[p.dsId] ?? 0} batch{spendBatches[p.dsId] !== 1 ? 'es' : ''}</strong>
                  <span>Date field:</span><strong className="text-rose-600">{rf?.date ?? '—'}</strong>
                  <span>Metric field:</span><strong className="text-rose-600">{rf?.metric ?? '—'}</strong>
                  <span className="col-span-2 break-all text-slate-400">Accounts with data: {[...new Set(platRows.map((r) => r.accountName).filter(Boolean))].join(', ') || '—'}</span>
                  {accts > 0 && (
                    <span className="col-span-2 break-all text-amber-600">
                      Account IDs (sample): {accounts.filter((a) => a.platform === p.dsId).slice(0, 4).map((a) => `"${a.id || '(empty)'}" [user: ${a.dsUser || '(empty)'}]`).join(' · ')}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </details>
      )}
    </>
  );
}
