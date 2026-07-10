'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

type ColType = 'text' | 'money' | 'number' | 'status';

type ColDef = {
  id: string;
  label: string;
  type: ColType;
};

type ClientRow = {
  id: string;
  [colId: string]: string;
};

type ClientsData = {
  version: 1;
  columns: ColDef[];
  rows: ClientRow[];
};

// ── Storage key ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'Fare Tessile_clients_v2';

const DEFAULT_COLUMNS: ColDef[] = [
  { id: 'name',           label: 'Client',           type: 'text'   },
  { id: 'status',         label: 'Status',            type: 'status' },
  { id: 'plan',           label: 'Plan',              type: 'text'   },
  { id: 'accountManager', label: 'Account Manager',   type: 'text'   },
  { id: 'analyst',        label: 'Analyst',           type: 'text'   },
  { id: 'platforms',      label: 'Platforms',         type: 'text'   },
  { id: 'budget',         label: 'Budget ($)',         type: 'money'  },
  { id: 'spend',          label: 'Spend ($)',          type: 'money'  },
  { id: 'objective',      label: 'Goal',              type: 'text'   },
  { id: 'healthScore',    label: 'Health (0–100)',     type: 'number' },
];

const DEFAULT_ROWS: ClientRow[] = [
  { id: 'cl_1', name: 'Northstar Fintech', status: 'Active',   plan: 'Enterprise', accountManager: 'Olivia Mendes', analyst: 'Noah Clark', platforms: 'Meta Ads, Google Ads, LinkedIn Ads',     budget: '240000', spend: '164300', objective: 'Registrations', healthScore: '92' },
  { id: 'cl_2', name: 'Lumen E-commerce',  status: 'Active',   plan: 'Scale',      accountManager: 'Lucas Reed',    analyst: 'Ana Costa',  platforms: 'Meta Ads, Google Ads, TikTok Ads',       budget: '150000', spend: '112800', objective: 'Purchases',      healthScore: '84' },
  { id: 'cl_3', name: 'Nova EdTech',       status: 'At Risk',  plan: 'Growth',     accountManager: 'Olivia Mendes', analyst: 'Kai Wong',   platforms: 'Google Ads, LinkedIn Ads, Pinterest Ads', budget: '98000',  spend: '81000',  objective: 'Leads',          healthScore: '69' },
];

const DEFAULT_DATA: ClientsData = { version: 1, columns: DEFAULT_COLUMNS, rows: DEFAULT_ROWS };

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function formatValue(value: string, type: ColType): string {
  if (!value) return '';
  if (type === 'money') {
    const n = Number(value.replace(/[^0-9.-]/g, ''));
    if (isNaN(n)) return value;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
  }
  return value;
}

const STATUS_COLORS: Record<string, string> = {
  active:   'bg-emerald-100 text-emerald-700',
  'at risk':'bg-amber-100 text-amber-700',
  inactive: 'bg-slate-100 text-slate-500',
  paused:   'bg-blue-100 text-blue-700',
};

function StatusBadge({ value }: { value: string }) {
  const key = value.toLowerCase();
  const cls = STATUS_COLORS[key] ?? 'bg-slate-100 text-slate-600';
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{value}</span>;
}

// ── Editable cell ─────────────────────────────────────────────────────────────

function EditableCell({ value, type, onChange }: { value: string; type: ColType; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);
  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);

  const commit = useCallback(() => {
    onChange(draft);
    setEditing(false);
  }, [draft, onChange]);

  if (editing) {
    return (
      <input
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { setDraft(value); setEditing(false); }
        }}
        className="w-full min-w-[80px] rounded border border-blue-400 bg-white px-2 py-1 text-sm outline-none ring-2 ring-blue-200"
      />
    );
  }

  return (
    <span
      onClick={() => { setDraft(value); setEditing(true); }}
      title="Click to edit"
      className="block min-h-[24px] cursor-pointer rounded px-2 py-0.5 text-sm text-slate-700 hover:bg-blue-50"
    >
      {type === 'status' && value
        ? <StatusBadge value={value} />
        : formatValue(value, type) || <span className="text-slate-300 italic">—</span>}
    </span>
  );
}

// ── Editable header ───────────────────────────────────────────────────────────

function EditableHeader({ label, onChange }: { label: string; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) ref.current?.select(); }, [editing]);

  const commit = useCallback(() => {
    if (draft.trim()) onChange(draft.trim());
    setEditing(false);
  }, [draft, onChange]);

  if (editing) {
    return (
      <input
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
        className="w-full rounded border border-blue-400 bg-white px-1 py-0.5 text-xs font-medium outline-none"
      />
    );
  }

  return (
    <span onDoubleClick={() => { setDraft(label); setEditing(true); }} title="Double-click to rename" className="cursor-pointer">
      {label}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ClientsWorkbench() {
  const [data, setData] = useState<ClientsData>(DEFAULT_DATA);
  const [loaded, setLoaded] = useState(false);
  const [showAddCol, setShowAddCol] = useState(false);
  const [newColLabel, setNewColLabel] = useState('');
  const [newColType, setNewColType] = useState<ColType>('text');
  const [colToDelete, setColToDelete] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ClientsData;
        if (parsed.version === 1) setData(parsed);
      }
    } catch { /* ignore corrupt data */ }
    setLoaded(true);
  }, []);

  // Auto-save on every change
  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, loaded]);

  // ── Mutations ─────────────────────────────────────────────────────────────

  function addRow() {
    const row: ClientRow = { id: uid() };
    data.columns.forEach((col) => { row[col.id] = ''; });
    setData((d) => ({ ...d, rows: [...d.rows, row] }));
  }

  function deleteRow(rowId: string) {
    setData((d) => ({ ...d, rows: d.rows.filter((r) => r.id !== rowId) }));
  }

  function updateCell(rowId: string, colId: string, value: string) {
    setData((d) => ({
      ...d,
      rows: d.rows.map((r) => r.id === rowId ? { ...r, [colId]: value } : r)
    }));
  }

  function renameColumn(colId: string, label: string) {
    setData((d) => ({
      ...d,
      columns: d.columns.map((c) => c.id === colId ? { ...c, label } : c)
    }));
  }

  function addColumn() {
    if (!newColLabel.trim()) return;
    const id = uid();
    const newCol: ColDef = { id, label: newColLabel.trim(), type: newColType };
    setData((d) => ({
      columns: [...d.columns, newCol],
      rows: d.rows.map((r) => ({ ...r, [id]: '' })),
      version: 1,
    }));
    setNewColLabel('');
    setShowAddCol(false);
  }

  function deleteColumn(colId: string) {
    setData((d) => ({
      ...d,
      columns: d.columns.filter((c) => c.id !== colId),
      rows: d.rows.map((r) => { const { [colId]: _, ...rest } = r; return rest as ClientRow; })
    }));
    setColToDelete(null);
  }

  function resetToDefault() {
    if (!confirm('This will clear all saved client data and restore default columns. Continue?')) return;
    const fresh = { ...DEFAULT_DATA, rows: [] };
    setData(fresh);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (!loaded) return <div className="p-6 text-sm text-slate-400">Loading…</div>;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-semibold">Clients</h2>
        <span className="text-xs text-slate-400">Saved locally in browser · {data.rows.length} client{data.rows.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={addRow} className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">
          + Add client
        </button>
        <button onClick={() => setShowAddCol((v) => !v)} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
          + Add column
        </button>
        <span className="ml-auto text-xs text-slate-400">Double-click a column header to rename · Click a cell to edit</span>
        <button onClick={resetToDefault} className="text-xs text-slate-400 underline hover:text-slate-600">
          Reset
        </button>
      </div>

      {/* Add column form */}
      {showAddCol && (
        <div className="flex flex-wrap items-end gap-3 rounded-md border border-indigo-200 bg-indigo-50 p-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Column name</label>
            <input
              autoFocus
              value={newColLabel}
              onChange={(e) => setNewColLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addColumn(); if (e.key === 'Escape') setShowAddCol(false); }}
              placeholder="e.g. Secondary Analyst"
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-indigo-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Type</label>
            <select value={newColType} onChange={(e) => setNewColType(e.target.value as ColType)} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm">
              <option value="text">Text</option>
              <option value="money">Money ($)</option>
              <option value="number">Number</option>
              <option value="status">Status badge</option>
            </select>
          </div>
          <button onClick={addColumn} disabled={!newColLabel.trim()} className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
            Add
          </button>
          <button onClick={() => setShowAddCol(false)} className="text-sm text-slate-500 hover:text-slate-700">
            Cancel
          </button>
        </div>
      )}

      {/* Delete column confirmation */}
      {colToDelete && (
        <div className="flex items-center gap-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <span>Delete column "{data.columns.find((c) => c.id === colToDelete)?.label}"? All data in this column will be lost.</span>
          <button onClick={() => deleteColumn(colToDelete)} className="rounded bg-rose-600 px-2 py-1 text-xs font-medium text-white">Delete</button>
          <button onClick={() => setColToDelete(null)} className="text-xs text-rose-500 hover:text-rose-700">Cancel</button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {data.columns.map((col) => (
                <th key={col.id} className="group relative whitespace-nowrap px-3 py-2 text-left text-xs font-medium text-slate-500">
                  <div className="flex items-center gap-1">
                    <EditableHeader label={col.label} onChange={(v) => renameColumn(col.id, v)} />
                    <button
                      onClick={() => setColToDelete(col.id)}
                      title="Remove column"
                      className="ml-1 hidden rounded p-0.5 text-slate-300 hover:bg-rose-100 hover:text-rose-500 group-hover:inline-flex"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    </button>
                  </div>
                </th>
              ))}
              <th className="w-10 px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.rows.length === 0 && (
              <tr>
                <td colSpan={data.columns.length + 1} className="py-12 text-center text-sm text-slate-400">
                  No clients yet. Click <strong>+ Add client</strong> to start.
                </td>
              </tr>
            )}
            {data.rows.map((row) => (
              <tr key={row.id} className="group hover:bg-slate-50">
                {data.columns.map((col) => (
                  <td key={col.id} className="px-1 py-1">
                    <EditableCell
                      value={row[col.id] ?? ''}
                      type={col.type}
                      onChange={(v) => updateCell(row.id, col.id, v)}
                    />
                  </td>
                ))}
                <td className="px-2 py-1 text-right">
                  <button
                    onClick={() => deleteRow(row.id)}
                    title="Delete client"
                    className="hidden rounded p-1 text-slate-300 hover:bg-rose-100 hover:text-rose-500 group-hover:inline-flex"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 3h10M5 3V2h4v1M6 6v4M8 6v4M3 3l.8 8.2A1 1 0 004.8 12h4.4a1 1 0 001-.8L11 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.rows.length > 0 && (
        <button onClick={addRow} className="text-sm text-indigo-600 hover:text-indigo-800">
          + Add another client
        </button>
      )}

      <p className="text-xs text-slate-400">
        Data is saved automatically in this browser via localStorage. To share between devices or users, a backend integration would be needed.
      </p>
    </section>
  );
}
