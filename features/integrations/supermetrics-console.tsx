'use client';

import { useState } from 'react';

type DsOption = { id: string; label: string };

const dsOptions: DsOption[] = [
  { id: 'FA', label: 'Meta Ads (FA)' },
  { id: 'AW', label: 'Google Ads (AW)' }
];

interface ApiDataRow {
  ds_user: string;
  display_name: string;
  accounts: { account_id: string; account_name: string }[];
}

interface ApiErrorPayload {
  message?: string;
  reconnectSteps?: string[];
  requestId?: string;
  loginUrl?: string | null;
}

export function SupermetricsConsole() {
  const [dsId, setDsId] = useState('FA');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorSteps, setErrorSteps] = useState<string[]>([]);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [loginUrl, setLoginUrl] = useState<string | null>(null);
  const [rows, setRows] = useState<ApiDataRow[]>([]);

  const loadAccounts = async () => {
    setLoading(true);
    setError(null);
    setErrorSteps([]);
    setRequestId(null);
    setLoginUrl(null);

    try {
      const response = await fetch(`/api/integrations/supermetrics/accounts?dsId=${encodeURIComponent(dsId)}`);
      const raw = await response.text();
      let payload: { data?: ApiDataRow[] } & ApiErrorPayload = {};

      try {
        payload = JSON.parse(raw) as { data?: ApiDataRow[] } & ApiErrorPayload;
      } catch {
        throw new Error(
          'Supermetrics endpoint returned HTML instead of JSON. Check Vercel deployment mode (must run as Next.js server, not static output).'
        );
      }

      if (!response.ok) {
        setErrorSteps(payload.reconnectSteps ?? []);
        setRequestId(payload.requestId ?? null);
        setLoginUrl(payload.loginUrl ?? null);
        throw new Error(payload.message || 'Could not load accounts');
      }

      setRows(payload.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <article className="card">
      <h3 className="text-lg font-semibold">Supermetrics Accounts Sync</h3>
      <p className="mt-1 text-sm text-slate-500">
        Pull all connected accounts by data source using your Supermetrics API key configured in the backend env.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <select
          value={dsId}
          onChange={(e) => setDsId(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          {dsOptions.map((option) => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </select>
        <button
          onClick={loadAccounts}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          disabled={loading}
        >
          {loading ? 'Syncing...' : 'Load Accounts'}
        </button>
      </div>

      {error && (
        <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <p>{error}</p>
          {errorSteps.length > 0 && (
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              {errorSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          )}
          {requestId && <p className="mt-2 text-xs text-rose-500">Request ID: {requestId}</p>}
          {loginUrl && (
            <a
              href={loginUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex rounded-md bg-rose-700 px-3 py-2 text-xs font-semibold text-white"
            >
              Abrir link novo de autenticação no Supermetrics
            </a>
          )}
        </div>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="px-2 py-2">Data Source Login</th>
              <th className="px-2 py-2">Display Name</th>
              <th className="px-2 py-2">Accounts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.ds_user} className="border-b border-slate-100 align-top">
                <td className="px-2 py-2 font-medium text-slate-700">{row.ds_user}</td>
                <td className="px-2 py-2 text-slate-600">{row.display_name}</td>
                <td className="px-2 py-2 text-slate-600">
                  {row.accounts.length === 0 ? (
                    <span className="text-slate-400">No accounts</span>
                  ) : (
                    <ul className="space-y-1">
                      {row.accounts.map((account) => (
                        <li key={account.account_id}>
                          {account.account_name} <span className="text-slate-400">({account.account_id})</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}
