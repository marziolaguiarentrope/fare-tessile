'use client';

import { ChangeEvent, ReactNode, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Play, Upload, Workflow } from 'lucide-react';
import { cn } from '@/lib/utils';
import { autoDetectColumns, emptyMapping, selectedColumns } from './utils/columns';
import { downloadCsv, parseCsvFile } from './utils/csv';
import { buildCrmRecords, matchGoogleAdsCallsToCrmCustomers } from './utils/matching';
import type { CrmMapping, CrmRecord, CsvRow, GoogleAdsMapping, MatchResult, ParsedCsv } from './utils/types';

type CsvKind = 'crm' | 'googleAds';
type CrmFilter = 'all' | 'matched' | 'unmatched' | 'ambiguous';

const crmFields: Array<{ key: keyof CrmMapping; label: string; required?: boolean }> = [
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone Number', required: true },
  { key: 'createdDate', label: 'Customer Created Date / Record Date' },
];

const googleAdsFields: Array<{ key: keyof GoogleAdsMapping; label: string; required?: boolean }> = [
  { key: 'callerPhone', label: 'Caller Phone Number', required: true },
  { key: 'callDateTime', label: 'Call Date / Time' },
  { key: 'campaign', label: 'Campaign' },
  { key: 'adGroup', label: 'Ad Group' },
  { key: 'callStatus', label: 'Call Status' },
  { key: 'callDuration', label: 'Call Duration' },
];

export function MountAiryCallMatchWorkbench() {
  const [crmCsv, setCrmCsv] = useState<ParsedCsv | null>(null);
  const [googleAdsCsv, setGoogleAdsCsv] = useState<ParsedCsv | null>(null);
  const [crmMapping, setCrmMapping] = useState<CrmMapping>(() => emptyMapping('crm'));
  const [googleAdsMapping, setGoogleAdsMapping] = useState<GoogleAdsMapping>(() => emptyMapping('googleAds'));
  const [errors, setErrors] = useState<Partial<Record<CsvKind | 'comparison', string>>>({});
  const [results, setResults] = useState<MatchResult[]>([]);
  const [crmFilter, setCrmFilter] = useState<CrmFilter>('all');

  const crmSelectedColumns = useMemo(() => selectedColumns(crmMapping), [crmMapping]);
  const googleAdsSelectedColumns = useMemo(() => selectedColumns(googleAdsMapping), [googleAdsMapping]);
  const canRun = Boolean(crmCsv && googleAdsCsv && crmMapping.phone && googleAdsMapping.callerPhone);

  const summary = useMemo(() => {
    const confirmed = results.filter((result) => result.status === 'matched');
    const uniqueGooglePhones = new Set(results.map((result) => result.googleAdsPhoneParts.last10 || result.googleAdsPhoneParts.normalized).filter(Boolean));

    return {
      totalCalls: results.length,
      uniqueGooglePhones: uniqueGooglePhones.size,
      crmCustomers: crmCsv?.rows.length ?? 0,
      confirmedMatches: confirmed.length,
      exact: results.filter((result) => result.confidence === 'exact').length,
      strong: results.filter((result) => result.confidence === 'strong').length,
      last4Unique: results.filter((result) => result.confidence === 'last4_unique').length,
      ambiguous: results.filter((result) => result.status === 'ambiguous').length,
      noMatch: results.filter((result) => result.status === 'no_match').length,
      conversionRate: results.length > 0 ? (confirmed.length / results.length) * 100 : 0,
    };
  }, [crmCsv?.rows.length, results]);

  const matchedCrmRows = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const result of results) {
      if (!result.matchedCrmRecord) continue;
      const callers = map.get(result.matchedCrmRecord.rowIndex) ?? [];
      callers.push(result.googleAdsPhoneParts.raw || result.googleAdsPhoneParts.normalized);
      map.set(result.matchedCrmRecord.rowIndex, callers);
    }
    return map;
  }, [results]);

  const ambiguousCrmRows = useMemo(() => {
    const set = new Set<number>();
    for (const result of results) {
      if (result.status !== 'ambiguous') continue;
      result.candidates.forEach((candidate) => set.add(candidate.rowIndex));
    }
    return set;
  }, [results]);

  const crmRecords = useMemo(() => {
    if (!crmCsv || !crmMapping.phone) return [];
    return buildCrmRecords(crmCsv.rows, crmMapping);
  }, [crmCsv, crmMapping]);

  const filteredCrmRecords = useMemo(() => {
    return crmRecords.filter((record) => {
      const matched = matchedCrmRows.has(record.rowIndex);
      const ambiguous = ambiguousCrmRows.has(record.rowIndex);
      if (crmFilter === 'matched') return matched;
      if (crmFilter === 'unmatched') return !matched && !ambiguous;
      if (crmFilter === 'ambiguous') return ambiguous;
      return true;
    });
  }, [ambiguousCrmRows, crmFilter, crmRecords, matchedCrmRows]);

  async function handleUpload(kind: CsvKind, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setErrors((current) => ({ ...current, [kind]: undefined, comparison: undefined }));
    setResults([]);

    try {
      const parsed = await parseCsvFile(file);
      if (kind === 'crm') {
        setCrmCsv(parsed);
        setCrmMapping(autoDetectColumns(parsed.headers, 'crm'));
      } else {
        setGoogleAdsCsv(parsed);
        setGoogleAdsMapping(autoDetectColumns(parsed.headers, 'googleAds'));
      }
    } catch (error) {
      setErrors((current) => ({
        ...current,
        [kind]: error instanceof Error ? error.message : 'Invalid CSV.',
      }));
    }
  }

  function runComparison() {
    if (!crmCsv || !googleAdsCsv) {
      setErrors((current) => ({ ...current, comparison: 'Upload both CSV files before running the comparison.' }));
      return;
    }

    if (!crmMapping.phone || !googleAdsMapping.callerPhone) {
      setErrors((current) => ({ ...current, comparison: 'Select both phone number columns before running the comparison.' }));
      return;
    }

    try {
      setErrors((current) => ({ ...current, comparison: undefined }));
      setResults(matchGoogleAdsCallsToCrmCustomers(googleAdsCsv.rows, crmCsv.rows, { crm: crmMapping, googleAds: googleAdsMapping }));
    } catch (error) {
      setErrors((current) => ({
        ...current,
        comparison: error instanceof Error ? error.message : 'Could not compare the files.',
      }));
    }
  }

  function exportResults(type: 'confirmed' | 'ambiguous' | 'no_match' | 'all') {
    const filtered = results.filter((result) => {
      if (type === 'confirmed') return result.status === 'matched';
      if (type === 'ambiguous') return result.status === 'ambiguous';
      if (type === 'no_match') return result.status === 'no_match';
      return true;
    });

    downloadCsv(`mount-airy-${type}-call-crm-results.csv`, filtered.map(resultToExportRow));
  }

  return (
    <section className="space-y-4">
      <article className="card space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="section-title">Mount Airy</p>
            <h2 className="mt-1 text-2xl font-semibold">Google Ads Call to CRM Match</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Upload monthly exports, map the phone columns, compare normalized phone numbers, and export confirmed or unresolved call matches.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-gold/40 bg-brand-gold/15 px-3 py-1 text-xs font-semibold text-brand-navy">
            <Workflow size={14} />
            Client-side automation
          </span>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <UploadPanel
            title="CRM Customer CSV"
            description="Customer export from the Mount Airy CRM."
            parsed={crmCsv}
            error={errors.crm}
            onUpload={(event) => handleUpload('crm', event)}
          />
          <UploadPanel
            title="Google Ads Call CSV"
            description="Phone call export from Google Ads or Fare Tessile."
            parsed={googleAdsCsv}
            error={errors.googleAds}
            onUpload={(event) => handleUpload('googleAds', event)}
          />
        </div>
      </article>

      {(crmCsv || googleAdsCsv) && (
        <div className="grid gap-4 xl:grid-cols-2">
          <MappingPanel
            title="CRM column mapping"
            fields={crmFields}
            headers={crmCsv?.headers ?? []}
            mapping={crmMapping}
            onChange={(key, value) => setCrmMapping((current) => ({ ...current, [key]: value }))}
          />
          <MappingPanel
            title="Google Ads column mapping"
            fields={googleAdsFields}
            headers={googleAdsCsv?.headers ?? []}
            mapping={googleAdsMapping}
            onChange={(key, value) => setGoogleAdsMapping((current) => ({ ...current, [key]: value }))}
          />
        </div>
      )}

      {(crmCsv || googleAdsCsv) && (
        <div className="grid gap-4 xl:grid-cols-2">
          <CsvPreview title="CRM preview" parsed={crmCsv} selectedColumns={crmSelectedColumns} phoneColumn={crmMapping.phone} />
          <CsvPreview title="Google Ads preview" parsed={googleAdsCsv} selectedColumns={googleAdsSelectedColumns} phoneColumn={googleAdsMapping.callerPhone} />
        </div>
      )}

      {(crmCsv || googleAdsCsv) && (
        <article className="card flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-800">Preview selected columns, then run the comparison.</p>
            <p className="mt-1 text-xs text-slate-500">Both phone number mappings are required.</p>
          </div>
          <button
            onClick={runComparison}
            disabled={!canRun}
            className="inline-flex items-center gap-2 rounded-md bg-brand-navy px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play size={15} />
            Run comparison
          </button>
          {errors.comparison && <p className="basis-full rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{errors.comparison}</p>}
        </article>
      )}

      {results.length > 0 && (
        <>
          <ResultsDashboard summary={summary} />

          {summary.confirmedMatches === 0 && (
            <Notice tone="warning" title="No confirmed matches found">
              The comparison completed, but no Google Ads calls matched CRM records with exact, strong, or unique last-4 confidence.
            </Notice>
          )}

          {summary.ambiguous > 0 && (
            <Notice tone="warning" title="Ambiguous matches found">
              Some calls share the same last 4 digits with multiple CRM records. Review the candidates before treating them as matches.
            </Notice>
          )}

          <ExportPanel onExport={exportResults} />
          <ResultsTable results={results} crmMapping={crmMapping} googleAdsMapping={googleAdsMapping} />
          <CrmTableView
            records={filteredCrmRecords}
            headers={crmCsv?.headers ?? []}
            selectedColumns={crmSelectedColumns}
            phoneColumn={crmMapping.phone}
            matchedCrmRows={matchedCrmRows}
            ambiguousCrmRows={ambiguousCrmRows}
            filter={crmFilter}
            onFilterChange={setCrmFilter}
          />
        </>
      )}
    </section>
  );
}

function UploadPanel({
  title,
  description,
  parsed,
  error,
  onUpload,
}: {
  title: string;
  description: string;
  parsed: ParsedCsv | null;
  error?: string;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-white p-2 text-brand-navy shadow-sm">
          <FileSpreadsheet size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
          <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <Upload size={15} />
            Upload CSV
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={onUpload} />
          </label>
          {parsed && (
            <p className="mt-3 flex items-center gap-2 text-sm text-emerald-700">
              <CheckCircle2 size={15} />
              {parsed.fileName}: {parsed.rows.length.toLocaleString('en-US')} rows, {parsed.headers.length} columns
            </p>
          )}
          {error && (
            <p className="mt-3 flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <AlertTriangle size={15} />
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function MappingPanel<T extends CrmMapping | GoogleAdsMapping>({
  title,
  fields,
  headers,
  mapping,
  onChange,
}: {
  title: string;
  fields: Array<{ key: keyof T; label: string; required?: boolean }>;
  headers: string[];
  mapping: T;
  onChange: (key: keyof T, value: string) => void;
}) {
  return (
    <article className="card space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <span className="text-xs text-slate-400">{headers.length ? `${headers.length} headers` : 'Upload required'}</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {fields.map((field) => (
          <label key={String(field.key)} className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
              {field.label}{field.required ? ' *' : ''}
            </span>
            <select
              value={String(mapping[field.key] ?? '')}
              disabled={headers.length === 0}
              onChange={(event) => onChange(field.key, event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">Not mapped</option>
              {headers.map((header) => (
                <option key={header} value={header}>{header}</option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </article>
  );
}

function CsvPreview({
  title,
  parsed,
  selectedColumns,
  phoneColumn,
}: {
  title: string;
  parsed: ParsedCsv | null;
  selectedColumns: Set<string>;
  phoneColumn: string;
}) {
  if (!parsed) {
    return (
      <article className="card">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <p className="mt-4 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-8 text-center text-sm text-slate-400">
          Upload a CSV to preview the first rows.
        </p>
      </article>
    );
  }

  return (
    <article className="card space-y-3 overflow-hidden">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-400">Showing first 8 rows</p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {parsed.headers.map((header) => (
                <th
                  key={header}
                  className={cn(
                    'whitespace-nowrap px-3 py-2 font-semibold text-slate-500',
                    selectedColumns.has(header) && 'bg-brand-gold/20 text-brand-navy',
                    phoneColumn === header && 'ring-2 ring-inset ring-brand-gold',
                  )}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {parsed.rows.slice(0, 8).map((row, rowIndex) => (
              <tr key={rowIndex}>
                {parsed.headers.map((header) => (
                  <td
                    key={header}
                    className={cn(
                      'max-w-[220px] truncate whitespace-nowrap px-3 py-2 text-slate-700',
                      selectedColumns.has(header) && 'bg-brand-gold/10',
                      phoneColumn === header && 'font-semibold text-brand-navy',
                    )}
                    title={row[header]}
                  >
                    {row[header] || '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function ResultsDashboard({ summary }: { summary: ReturnType<typeof createSummaryShape> }) {
  const cards = [
    ['Total Google Ads calls', summary.totalCalls.toLocaleString('en-US')],
    ['Unique Google Ads phones', summary.uniqueGooglePhones.toLocaleString('en-US')],
    ['CRM customers', summary.crmCustomers.toLocaleString('en-US')],
    ['Confirmed matches', summary.confirmedMatches.toLocaleString('en-US')],
    ['Exact matches', summary.exact.toLocaleString('en-US')],
    ['Strong matches', summary.strong.toLocaleString('en-US')],
    ['Last-4 unique matches', summary.last4Unique.toLocaleString('en-US')],
    ['Ambiguous matches', summary.ambiguous.toLocaleString('en-US')],
    ['No matches', summary.noMatch.toLocaleString('en-US')],
    ['Conversion rate', `${summary.conversionRate.toFixed(1)}%`],
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map(([label, value]) => (
        <article key={label} className="card">
          <p className="truncate text-xs text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
        </article>
      ))}
    </section>
  );
}

function createSummaryShape() {
  return {
    totalCalls: 0,
    uniqueGooglePhones: 0,
    crmCustomers: 0,
    confirmedMatches: 0,
    exact: 0,
    strong: 0,
    last4Unique: 0,
    ambiguous: 0,
    noMatch: 0,
    conversionRate: 0,
  };
}

function Notice({ tone, title, children }: { tone: 'warning'; title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <p className="font-semibold">{title}</p>
      <p className="mt-1">{children}</p>
    </div>
  );
}

function ExportPanel({ onExport }: { onExport: (type: 'confirmed' | 'ambiguous' | 'no_match' | 'all') => void }) {
  return (
    <article className="card flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 className="font-semibold text-slate-900">Export results</h3>
        <p className="mt-1 text-sm text-slate-500">Download confirmed matches, unresolved calls, or the full comparison table.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <ExportButton onClick={() => onExport('confirmed')}>Confirmed matches</ExportButton>
        <ExportButton onClick={() => onExport('ambiguous')}>Ambiguous</ExportButton>
        <ExportButton onClick={() => onExport('no_match')}>No matches</ExportButton>
        <ExportButton onClick={() => onExport('all')}>Combined CSV</ExportButton>
      </div>
    </article>
  );
}

function ExportButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
      <Download size={14} />
      {children}
    </button>
  );
}

function ResultsTable({
  results,
  crmMapping,
  googleAdsMapping,
}: {
  results: MatchResult[];
  crmMapping: CrmMapping;
  googleAdsMapping: GoogleAdsMapping;
}) {
  return (
    <article className="card space-y-3 overflow-hidden">
      <h3 className="font-semibold text-slate-900">Google Ads call results</h3>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[1280px] text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
              {[
                'Caller phone',
                'Normalized',
                'Call date/time',
                'Campaign',
                'Ad group',
                'Call status',
                'Duration',
                'Match status',
                'Confidence',
                'CRM first name',
                'CRM last name',
                'CRM email',
                'CRM phone',
                'Possible CRM candidates',
              ].map((header) => (
                <th key={header} className="whitespace-nowrap px-3 py-2 font-semibold">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {results.map((result) => {
              const matchedRow = result.matchedCrmRecord?.row;
              return (
                <tr key={result.googleAdsRowIndex} className="hover:bg-slate-50">
                  <td className="px-3 py-2">{valueFor(result.googleAdsRow, googleAdsMapping.callerPhone)}</td>
                  <td className="px-3 py-2 font-mono text-slate-700">{result.googleAdsPhoneParts.normalized || '-'}</td>
                  <td className="px-3 py-2">{valueFor(result.googleAdsRow, googleAdsMapping.callDateTime)}</td>
                  <td className="max-w-[220px] truncate px-3 py-2" title={valueFor(result.googleAdsRow, googleAdsMapping.campaign)}>{valueFor(result.googleAdsRow, googleAdsMapping.campaign)}</td>
                  <td className="max-w-[180px] truncate px-3 py-2" title={valueFor(result.googleAdsRow, googleAdsMapping.adGroup)}>{valueFor(result.googleAdsRow, googleAdsMapping.adGroup)}</td>
                  <td className="px-3 py-2">{valueFor(result.googleAdsRow, googleAdsMapping.callStatus)}</td>
                  <td className="px-3 py-2">{valueFor(result.googleAdsRow, googleAdsMapping.callDuration)}</td>
                  <td className="px-3 py-2"><MatchBadge result={result} /></td>
                  <td className="px-3 py-2">{result.confidence ?? '-'}</td>
                  <td className="px-3 py-2">{matchedRow ? valueFor(matchedRow, crmMapping.firstName) : '-'}</td>
                  <td className="px-3 py-2">{matchedRow ? valueFor(matchedRow, crmMapping.lastName) : '-'}</td>
                  <td className="px-3 py-2">{matchedRow ? valueFor(matchedRow, crmMapping.email) : '-'}</td>
                  <td className="px-3 py-2">{matchedRow ? valueFor(matchedRow, crmMapping.phone) : '-'}</td>
                  <td className="max-w-[320px] px-3 py-2 text-slate-600">{formatCandidates(result.candidates, crmMapping)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function CrmTableView({
  records,
  headers,
  selectedColumns,
  phoneColumn,
  matchedCrmRows,
  ambiguousCrmRows,
  filter,
  onFilterChange,
}: {
  records: CrmRecord[];
  headers: string[];
  selectedColumns: Set<string>;
  phoneColumn: string;
  matchedCrmRows: Map<number, string[]>;
  ambiguousCrmRows: Set<number>;
  filter: CrmFilter;
  onFilterChange: (filter: CrmFilter) => void;
}) {
  return (
    <article className="card space-y-3 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900">CRM customer view</h3>
          <p className="mt-1 text-sm text-slate-500">Mapped CRM columns are highlighted. Matched rows show the Google Ads caller number.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['all', 'matched', 'unmatched', 'ambiguous'] as CrmFilter[]).map((option) => (
            <button
              key={option}
              onClick={() => onFilterChange(option)}
              className={cn(
                'rounded-md border px-3 py-1.5 text-xs font-medium',
                filter === option ? 'border-brand-navy bg-brand-navy text-white' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50',
              )}
            >
              {crmFilterLabel(option)}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[960px] text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <th className="whitespace-nowrap px-3 py-2 font-semibold">Match</th>
              <th className="whitespace-nowrap px-3 py-2 font-semibold">Google Ads caller</th>
              {headers.map((header) => (
                <th
                  key={header}
                  className={cn(
                    'whitespace-nowrap px-3 py-2 font-semibold',
                    selectedColumns.has(header) && 'bg-brand-gold/20 text-brand-navy',
                    phoneColumn === header && 'ring-2 ring-inset ring-brand-gold',
                  )}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {records.map((record) => {
              const callers = matchedCrmRows.get(record.rowIndex) ?? [];
              const ambiguous = ambiguousCrmRows.has(record.rowIndex);
              return (
                <tr key={record.rowIndex} className={cn(callers.length > 0 && 'bg-emerald-50/70', ambiguous && 'bg-amber-50/70')}>
                  <td className="px-3 py-2">{callers.length > 0 ? <SmallPill tone="success">Matched</SmallPill> : ambiguous ? <SmallPill tone="warning">Candidate</SmallPill> : <SmallPill tone="neutral">Unmatched</SmallPill>}</td>
                  <td className="px-3 py-2 font-mono text-slate-700">{callers.length ? callers.join(', ') : '-'}</td>
                  {headers.map((header) => (
                    <td
                      key={header}
                      className={cn(
                        'max-w-[220px] truncate whitespace-nowrap px-3 py-2 text-slate-700',
                        selectedColumns.has(header) && 'bg-brand-gold/10',
                        phoneColumn === header && 'font-semibold text-brand-navy',
                      )}
                      title={record.row[header]}
                    >
                      {record.row[header] || '-'}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {records.length === 0 && <p className="py-6 text-center text-sm text-slate-400">No CRM records match this filter.</p>}
    </article>
  );
}

function MatchBadge({ result }: { result: MatchResult }) {
  if (result.confidence === 'exact') return <SmallPill tone="success">Exact Match</SmallPill>;
  if (result.confidence === 'strong') return <SmallPill tone="success">Strong Match</SmallPill>;
  if (result.confidence === 'last4_unique') return <SmallPill tone="info">Last 4 Unique Match</SmallPill>;
  if (result.status === 'ambiguous') return <SmallPill tone="warning">Ambiguous</SmallPill>;
  return <SmallPill tone="neutral">No Match</SmallPill>;
}

function SmallPill({ tone, children }: { tone: 'success' | 'warning' | 'neutral' | 'info'; children: ReactNode }) {
  const tones = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
    neutral: 'border-slate-200 bg-slate-50 text-slate-600',
    info: 'border-sky-200 bg-sky-50 text-sky-700',
  };

  return <span className={cn('inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium', tones[tone])}>{children}</span>;
}

function crmFilterLabel(filter: CrmFilter) {
  if (filter === 'matched') return 'Matched only';
  if (filter === 'unmatched') return 'Unmatched only';
  if (filter === 'ambiguous') return 'Ambiguous candidates';
  return 'All customers';
}

function valueFor(row: CsvRow, column: string) {
  return column ? row[column] || '-' : '-';
}

function formatCandidates(candidates: CrmRecord[], mapping: CrmMapping) {
  if (candidates.length === 0) return '-';
  return candidates.map((candidate) => {
    const first = valueFor(candidate.row, mapping.firstName);
    const last = valueFor(candidate.row, mapping.lastName);
    const email = valueFor(candidate.row, mapping.email);
    const phone = valueFor(candidate.row, mapping.phone);
    return [first, last].filter((part) => part !== '-').join(' ') || `${phone} ${email}`;
  }).join('; ');
}

function resultToExportRow(result: MatchResult): Record<string, unknown> {
  const matched = result.matchedCrmRecord;
  return {
    google_ads_row_number: result.googleAdsRowIndex + 2,
    google_ads_caller_phone_raw: result.googleAdsPhoneParts.raw,
    google_ads_phone_normalized: result.googleAdsPhoneParts.normalized,
    google_ads_phone_last_10: result.googleAdsPhoneParts.last10,
    google_ads_phone_last_7: result.googleAdsPhoneParts.last7,
    google_ads_phone_last_4: result.googleAdsPhoneParts.last4,
    match_status: result.status,
    match_confidence: result.confidence ?? '',
    crm_row_number: matched ? matched.rowIndex + 2 : '',
    crm_phone_normalized: matched?.phoneParts.normalized ?? '',
    candidate_count: result.candidates.length,
    crm_candidates: result.candidates.map((candidate) => JSON.stringify(candidate.row)).join(' | '),
    ...prefixRow('google_ads', result.googleAdsRow),
    ...(matched ? prefixRow('matched_crm', matched.row) : {}),
  };
}

function prefixRow(prefix: string, row: CsvRow): Record<string, string> {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [`${prefix}_${key}`, value]));
}

