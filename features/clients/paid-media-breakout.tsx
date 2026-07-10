'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

type ServiceType = 'SEO' | 'PPC' | 'SEO + PPC';

interface BreakoutRow {
  id: string;
  client: string;
  service: ServiceType;
  ppcAm1: string;
  ppcAm2: string;
  analyst1: string;
  analyst2: string;
  hours: Record<string, number | ''>;
}

interface BreakoutData {
  version: 2;
  hourColumns: string[];
  rows: BreakoutRow[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'Fare Tessile_breakout_v2';

const serviceOptions: ServiceType[] = ['SEO', 'PPC', 'SEO + PPC'];
const ppcAmOptions   = ['', 'Eve', 'Caio', 'Isaiah', 'Taylor'];
const analystOptions = ['', 'Juan', 'Caio', 'Will', 'Marzio', 'Anastasia', 'Vlad'];

const DEFAULT_HOUR_COLUMNS = ['Isaiah', 'Eve', 'Caio', 'Taylor', 'Juan', 'Will', 'Marzio', 'Anastasia', 'Vlad'];

function emptyHours(cols: string[]): Record<string, number | ''> {
  return Object.fromEntries(cols.map((c) => [c, '']));
}

const initialRows: BreakoutRow[] = (() => {
  const h = (overrides: Record<string, number>) =>
    ({ ...emptyHours(DEFAULT_HOUR_COLUMNS), ...overrides });
  return [
    { id: '1',  client: 'All Security Equipment',          service: 'SEO + PPC', ppcAm1: 'Eve',    ppcAm2: '',        analyst1: 'Juan',      analyst2: 'Vlad',      hours: h({ Eve: 5,    Juan: 16 }) },
    { id: '2',  client: 'Amputee Store - R',               service: 'PPC',       ppcAm1: 'Eve',    ppcAm2: '',        analyst1: 'Caio',      analyst2: '',          hours: h({ Eve: 2,    Caio: 4  }) },
    { id: '3',  client: 'Cokesbury - R',                   service: 'SEO + PPC', ppcAm1: 'Eve',    ppcAm2: '',        analyst1: 'Will',      analyst2: '',          hours: h({ Eve: 2,    Will: 4  }) },
    { id: '4',  client: 'CCD Care',                        service: 'PPC',       ppcAm1: 'Isaiah', ppcAm2: '',        analyst1: 'Will',      analyst2: '',          hours: h({ Isaiah: 2, Will: 2  }) },
    { id: '5',  client: 'Fonteva - R (+ Protech)',         service: 'PPC',       ppcAm1: 'Eve',    ppcAm2: '',        analyst1: 'Juan',      analyst2: '',          hours: h({ Eve: 1,    Juan: 2  }) },
    { id: '6',  client: 'FirstLight Home Care',            service: 'PPC',       ppcAm1: 'Eve',    ppcAm2: '',        analyst1: 'Caio',      analyst2: 'Will',      hours: h({ Eve: 10,   Caio: 8, Will: 8 }) },
    { id: '7',  client: 'Girard Veterinary Clinic',        service: 'PPC',       ppcAm1: 'Caio',   ppcAm2: 'Taylor',  analyst1: '',          analyst2: '',          hours: h({ Caio: 1.5 }) },
    { id: '8',  client: 'Hawthorne - Tax Relief Helpers',  service: 'SEO + PPC', ppcAm1: '',       ppcAm2: '',        analyst1: '',          analyst2: '',          hours: emptyHours(DEFAULT_HOUR_COLUMNS) },
    { id: '9',  client: 'ICE.edu',                         service: 'SEO + PPC', ppcAm1: 'Taylor', ppcAm2: 'Isaiah',  analyst1: 'Will',      analyst2: '',          hours: h({ Isaiah: 20, Will: 20 }) },
    { id: '10', client: 'Mobius MD',                       service: 'SEO + PPC', ppcAm1: 'Eve',    ppcAm2: '',        analyst1: 'Marzio',    analyst2: '',          hours: h({ Eve: 3,    Marzio: 3 }) },
    { id: '11', client: 'Mt. Airy Animal Hospital',        service: 'PPC',       ppcAm1: 'Caio',   ppcAm2: 'Taylor',  analyst1: '',          analyst2: '',          hours: h({ Caio: 1.25 }) },
    { id: '12', client: 'Nearly Natural - R',              service: 'SEO + PPC', ppcAm1: 'Taylor', ppcAm2: '',        analyst1: 'Juan',      analyst2: 'Vlad',      hours: h({ Juan: 16 }) },
    { id: '13', client: 'PrecisionMed - R',                service: 'PPC',       ppcAm1: 'Caio',   ppcAm2: '',        analyst1: 'Marzio',    analyst2: '',          hours: h({ Caio: 2.5 }) },
    { id: '14', client: 'Prequel',                         service: 'PPC',       ppcAm1: 'Taylor', ppcAm2: '',        analyst1: 'Marzio',    analyst2: 'Caio',      hours: h({ Caio: 2.5, Marzio: 5 }) },
    { id: '15', client: 'Strobes N More',                  service: 'SEO + PPC', ppcAm1: 'Isaiah', ppcAm2: '',        analyst1: 'Marzio',    analyst2: '',          hours: h({ Isaiah: 5, Marzio: 10 }) },
    { id: '16', client: 'Turfland Group',                  service: 'PPC',       ppcAm1: 'Isaiah', ppcAm2: '',        analyst1: 'Caio',      analyst2: '',          hours: h({ Caio: 1.5 }) },
    { id: '17', client: 'Unbound/Novatio',                 service: 'PPC',       ppcAm1: 'Taylor', ppcAm2: '',        analyst1: 'Marzio',    analyst2: 'Caio',      hours: h({ Caio: 2.5, Marzio: 10 }) },
    { id: '18', client: 'Upcall',                          service: 'PPC',       ppcAm1: 'Isaiah', ppcAm2: '',        analyst1: 'Anastasia', analyst2: '',          hours: h({ Isaiah: 2 }) },
    { id: '19', client: 'US Elite - R',                    service: 'PPC',       ppcAm1: 'Eve',    ppcAm2: '',        analyst1: 'Caio',      analyst2: '',          hours: h({ Eve: 2.5,  Caio: 2.5 }) },
    { id: '20', client: 'VAI',                             service: 'SEO + PPC', ppcAm1: 'Isaiah', ppcAm2: '',        analyst1: 'Caio',      analyst2: '',          hours: h({ Isaiah: 4, Caio: 3 }) },
    { id: '21', client: 'Wayfinder',                       service: 'PPC',       ppcAm1: 'Eve',    ppcAm2: '',        analyst1: 'Anastasia', analyst2: 'Will',      hours: h({ Eve: 3,    Will: 2 }) },
    { id: '22', client: 'Yon-Ka',                          service: 'PPC',       ppcAm1: 'Eve',    ppcAm2: '',        analyst1: 'Marzio',    analyst2: '',          hours: h({ Eve: 5,    Marzio: 8 }) },
  ];
})();

const DEFAULT_DATA: BreakoutData = { version: 2, hourColumns: DEFAULT_HOUR_COLUMNS, rows: initialRows };

// ── Color helpers ─────────────────────────────────────────────────────────────

function amColor(name: string) {
  if (name === 'Eve')    return 'bg-cyan-100 text-cyan-800';
  if (name === 'Isaiah') return 'bg-amber-100 text-amber-800';
  if (name === 'Taylor') return 'bg-violet-100 text-violet-800';
  if (name === 'Caio')   return 'bg-orange-100 text-orange-800';
  return 'bg-slate-50 text-slate-400';
}

function analystColor(name: string) {
  if (name === 'Juan')      return 'bg-emerald-100 text-emerald-800';
  if (name === 'Will')      return 'bg-sky-100 text-sky-800';
  if (name === 'Marzio')    return 'bg-pink-100 text-pink-800';
  if (name === 'Anastasia') return 'bg-teal-100 text-teal-800';
  if (name === 'Vlad')      return 'bg-indigo-100 text-indigo-800';
  if (name === 'Caio')      return 'bg-orange-100 text-orange-800';
  return 'bg-slate-50 text-slate-400';
}

function uid() { return Math.random().toString(36).slice(2, 10); }

// ── Component ─────────────────────────────────────────────────────────────────

export function PaidMediaBreakout() {
  const [data, setData] = useState<BreakoutData>(DEFAULT_DATA);
  const [loaded, setLoaded] = useState(false);
  const [addingCol, setAddingCol] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [colToDelete, setColToDelete] = useState<string | null>(null);
  const newColRef = useRef<HTMLInputElement>(null);

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as BreakoutData;
        if (parsed.version === 2) setData(parsed);
      }
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  // Auto-save
  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, loaded]);

  // Focus new-column input when it appears
  useEffect(() => {
    if (addingCol) newColRef.current?.focus();
  }, [addingCol]);

  // ── Totals ─────────────────────────────────────────────────────────────────

  const totals = useMemo(() => {
    const perPerson = Object.fromEntries(
      data.hourColumns.map((p) => [p, data.rows.reduce((sum, row) => sum + (Number(row.hours[p]) || 0), 0)])
    ) as Record<string, number>;
    const grandTotal = Object.values(perPerson).reduce((s, v) => s + v, 0);
    return { perPerson, grandTotal };
  }, [data]);

  // ── Mutations ──────────────────────────────────────────────────────────────

  function updateField(id: string, field: keyof Omit<BreakoutRow, 'hours' | 'id'>, value: string) {
    setData((d) => ({ ...d, rows: d.rows.map((r) => r.id === id ? { ...r, [field]: value } : r) }));
  }

  function updateHours(id: string, person: string, value: string) {
    const parsed = value === '' ? '' : Number(value);
    setData((d) => ({
      ...d,
      rows: d.rows.map((r) =>
        r.id === id ? { ...r, hours: { ...r.hours, [person]: Number.isNaN(parsed as number) ? '' : parsed } } : r
      ),
    }));
  }

  function addRow() {
    setData((d) => ({
      ...d,
      rows: [...d.rows, {
        id: uid(), client: '', service: 'PPC',
        ppcAm1: '', ppcAm2: '', analyst1: '', analyst2: '',
        hours: emptyHours(d.hourColumns),
      }],
    }));
  }

  function deleteRow(id: string) {
    setData((d) => ({ ...d, rows: d.rows.filter((r) => r.id !== id) }));
  }

  function addColumn() {
    const name = newColName.trim();
    if (!name || data.hourColumns.includes(name)) return;
    setData((d) => ({
      ...d,
      hourColumns: [...d.hourColumns, name],
      rows: d.rows.map((r) => ({ ...r, hours: { ...r.hours, [name]: '' } })),
    }));
    setNewColName('');
    setAddingCol(false);
  }

  function deleteColumn(col: string) {
    setData((d) => ({
      ...d,
      hourColumns: d.hourColumns.filter((c) => c !== col),
      rows: d.rows.map((r) => {
        const { [col]: _, ...rest } = r.hours;
        return { ...r, hours: rest };
      }),
    }));
    setColToDelete(null);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <article className="card overflow-x-auto">
      <div className="mb-3 flex items-center gap-3">
        <h3 className="text-lg font-semibold">Paid Media Breakout</h3>
        <button onClick={addRow} className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700">
          + Add client
        </button>
        <span className="ml-auto text-xs text-slate-400">Saved locally in browser</span>
      </div>

      {/* Delete column confirmation */}
      {colToDelete && (
        <div className="mb-3 flex items-center gap-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <span>Delete column <strong>{colToDelete}</strong>? All hours for this person will be lost.</span>
          <button onClick={() => deleteColumn(colToDelete)} className="rounded bg-rose-600 px-2 py-1 text-xs font-medium text-white">Delete</button>
          <button onClick={() => setColToDelete(null)} className="text-xs text-rose-500 hover:text-rose-700">Cancel</button>
        </div>
      )}

      <table className="min-w-max text-left text-sm">
        <thead>
          <tr className="border-b border-slate-300 bg-emerald-50 text-slate-700">
            <th className="px-2 py-2 font-semibold">Client</th>
            <th className="px-2 py-2 font-semibold">Services</th>
            <th className="px-2 py-2 font-semibold">Manager 1</th>
            <th className="px-2 py-2 font-semibold">Manager 2</th>
            <th className="px-2 py-2 font-semibold">Analyst 1</th>
            <th className="px-2 py-2 font-semibold">Analyst 2</th>
            <th
              className="px-2 py-2 text-center font-semibold"
              colSpan={data.hourColumns.length + (addingCol ? 1 : 2)}
            >
              HOURS PER WEEK
            </th>
          </tr>
          <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
            <th className="px-2 py-1" />
            <th className="px-2 py-1" />
            <th className="px-2 py-1" />
            <th className="px-2 py-1" />
            <th className="px-2 py-1" />
            <th className="px-2 py-1" />
            {/* Dynamic hour columns */}
            {data.hourColumns.map((col) => (
              <th key={col} className="group relative px-2 py-1 text-center">
                <span>{col}</span>
                <button
                  onClick={() => setColToDelete(col)}
                  title="Remove column"
                  className="absolute right-0.5 top-0.5 hidden rounded p-0.5 text-slate-300 hover:bg-rose-100 hover:text-rose-500 group-hover:inline-flex"
                >
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </th>
            ))}
            <th className="px-2 py-1 text-center">Total</th>
            {/* Add column UI */}
            <th className="px-1 py-1">
              {addingCol ? (
                <div className="flex items-center gap-1">
                  <input
                    ref={newColRef}
                    value={newColName}
                    onChange={(e) => setNewColName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') addColumn(); if (e.key === 'Escape') { setAddingCol(false); setNewColName(''); } }}
                    placeholder="Name…"
                    className="w-20 rounded border border-blue-400 px-1 py-0.5 text-xs outline-none"
                  />
                  <button onClick={addColumn} disabled={!newColName.trim()} className="rounded bg-indigo-600 px-1.5 py-0.5 text-xs text-white disabled:opacity-40">Add</button>
                  <button onClick={() => { setAddingCol(false); setNewColName(''); }} className="text-xs text-slate-400 hover:text-slate-600">✕</button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingCol(true)}
                  title="Add person column"
                  className="rounded border border-dashed border-slate-300 px-2 py-0.5 text-xs text-slate-400 hover:border-indigo-400 hover:text-indigo-600"
                >
                  + person
                </button>
              )}
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {data.rows.map((row) => {
            const rowTotal = data.hourColumns.reduce((s, p) => s + (Number(row.hours[p]) || 0), 0);
            return (
              <tr key={row.id} className="group hover:bg-slate-50">
                {/* Client name */}
                <td className="px-2 py-1.5">
                  <input
                    value={row.client}
                    onChange={(e) => updateField(row.id, 'client', e.target.value)}
                    className="w-44 rounded border border-transparent bg-transparent px-1 py-0.5 font-medium text-slate-800 hover:border-slate-300 focus:border-blue-400 focus:outline-none"
                    placeholder="Client name…"
                  />
                </td>

                {/* Service */}
                <td className="px-2 py-1.5">
                  <select
                    value={row.service}
                    onChange={(e) => updateField(row.id, 'service', e.target.value)}
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
                  >
                    {serviceOptions.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </td>

                {/* Manager 1 */}
                <td className="px-2 py-1.5">
                  <select
                    value={row.ppcAm1}
                    onChange={(e) => updateField(row.id, 'ppcAm1', e.target.value)}
                    className={`rounded-full border-0 px-2 py-1 text-xs font-medium ${amColor(row.ppcAm1)}`}
                  >
                    {ppcAmOptions.map((o) => <option key={o} value={o}>{o || '—'}</option>)}
                  </select>
                </td>

                {/* Manager 2 */}
                <td className="px-2 py-1.5">
                  <select
                    value={row.ppcAm2}
                    onChange={(e) => updateField(row.id, 'ppcAm2', e.target.value)}
                    className={`rounded-full border-0 px-2 py-1 text-xs font-medium ${amColor(row.ppcAm2)}`}
                  >
                    {ppcAmOptions.map((o) => <option key={o} value={o}>{o || '—'}</option>)}
                  </select>
                </td>

                {/* Analyst 1 */}
                <td className="px-2 py-1.5">
                  <select
                    value={row.analyst1}
                    onChange={(e) => updateField(row.id, 'analyst1', e.target.value)}
                    className={`rounded-full border-0 px-2 py-1 text-xs font-medium ${analystColor(row.analyst1)}`}
                  >
                    {analystOptions.map((o) => <option key={o} value={o}>{o || '—'}</option>)}
                  </select>
                </td>

                {/* Analyst 2 */}
                <td className="px-2 py-1.5">
                  <select
                    value={row.analyst2}
                    onChange={(e) => updateField(row.id, 'analyst2', e.target.value)}
                    className={`rounded-full border-0 px-2 py-1 text-xs font-medium ${analystColor(row.analyst2)}`}
                  >
                    {analystOptions.map((o) => <option key={o} value={o}>{o || '—'}</option>)}
                  </select>
                </td>

                {/* Hours per person */}
                {data.hourColumns.map((person) => (
                  <td key={person} className="px-1 py-1.5">
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      value={row.hours[person] ?? ''}
                      onChange={(e) => updateHours(row.id, person, e.target.value)}
                      className="w-14 rounded border border-slate-200 bg-white px-1 py-0.5 text-right text-xs focus:border-blue-400 focus:outline-none"
                    />
                  </td>
                ))}

                {/* Row total */}
                <td className="px-2 py-1.5 text-right font-semibold text-slate-800">
                  {rowTotal || ''}
                </td>

                {/* Spacer for + person column */}
                <td className="px-1 py-1.5" />

                {/* Delete row */}
                <td className="px-1 py-1.5">
                  <button
                    onClick={() => deleteRow(row.id)}
                    title="Delete client"
                    className="hidden rounded p-1 text-slate-300 hover:bg-rose-100 hover:text-rose-500 group-hover:inline-flex"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 3h10M5 3V2h4v1M6 6v4M8 6v4M3 3l.8 8.2A1 1 0 004.8 12h4.4a1 1 0 001-.8L11 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>

        <tfoot>
          <tr className="border-t-2 border-slate-300 bg-slate-100 text-xs font-semibold text-slate-700">
            <td className="px-2 py-2" colSpan={6}>TOTALS</td>
            {data.hourColumns.map((p) => (
              <td key={p} className="px-2 py-2 text-right">
                {totals.perPerson[p] ? totals.perPerson[p].toFixed(2).replace(/\.00$/, '') : ''}
              </td>
            ))}
            <td className="px-2 py-2 text-right">{totals.grandTotal.toFixed(2).replace(/\.00$/, '')}</td>
            <td colSpan={2} />
          </tr>
        </tfoot>
      </table>
    </article>
  );
}
