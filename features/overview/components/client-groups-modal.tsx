'use client';

import { useState } from 'react';
import { X, Trash2, Plus, Users } from 'lucide-react';
import { ClientGroup } from '@/hooks/use-client-groups';

interface Account {
  id: string;
  name: string;
  platform: string;
}

interface PlatformConfig {
  dsId: string;
  badge: string;
  badgeClass: string;
}

interface Props {
  accounts: Account[];
  groups: ClientGroup[];
  platforms: PlatformConfig[];
  onAddGroup: (name: string) => void;
  onRemoveGroup: (id: string) => void;
  onRenameGroup: (id: string, name: string) => void;
  onAssignAccount: (accountId: string, groupId: string | null) => void;
  onClose: () => void;
}

/** Find which group an account belongs to (null = unassigned). */
function getGroupId(accountId: string, groups: ClientGroup[]): string | null {
  return groups.find((g) => g.accountIds.includes(accountId))?.id ?? null;
}

export function ClientGroupsModal({
  accounts, groups, platforms, onAddGroup, onRemoveGroup, onRenameGroup, onAssignAccount, onClose,
}: Props) {
  const [newName, setNewName] = useState('');
  const [search, setSearch] = useState('');

  const platMap = Object.fromEntries(platforms.map((p) => [p.dsId, p]));

  const filteredAccounts = search
    ? accounts.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()))
    : accounts;

  function handleAdd() {
    if (!newName.trim()) return;
    onAddGroup(newName.trim());
    setNewName('');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-12 pb-6 px-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl flex flex-col" style={{ minHeight: 520 }}>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
          <Users className="w-5 h-5 text-brand-navy" />
          <h2 className="text-base font-semibold text-slate-900">Manage Clients</h2>
          <p className="text-sm text-slate-400 ml-1">Group accounts across platforms into named clients.</p>
          <button onClick={onClose} className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">

          {/* Left — Client groups */}
          <div className="w-64 flex-shrink-0 border-r border-slate-100 flex flex-col">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Clients</p>
              <div className="flex gap-1.5">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  placeholder="New client name…"
                  className="flex-1 min-w-0 rounded-md border border-slate-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-cornflower/50"
                />
                <button
                  onClick={handleAdd}
                  disabled={!newName.trim()}
                  className="flex-shrink-0 rounded-md bg-brand-navy px-2.5 py-1.5 text-white hover:bg-brand-navy/85 disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
              {groups.length === 0 && (
                <p className="px-4 py-6 text-sm text-slate-400 text-center">No clients yet. Create one above.</p>
              )}
              {groups.map((g) => {
                const count = g.accountIds.length;
                return (
                  <div key={g.id} className="px-4 py-2.5 flex items-center gap-2">
                    <input
                      value={g.name}
                      onChange={(e) => onRenameGroup(g.id, e.target.value)}
                      className="flex-1 min-w-0 rounded border-0 bg-transparent text-sm font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-cornflower/40 focus:bg-white focus:rounded-md focus:px-1 -ml-1"
                    />
                    <span className="text-xs text-slate-400 tabular-nums flex-shrink-0">
                      {count} acct{count !== 1 ? 's' : ''}
                    </span>
                    <button
                      onClick={() => onRemoveGroup(g.id)}
                      className="flex-shrink-0 rounded p-0.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right — Accounts */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Accounts ({accounts.length})
              </p>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search accounts…"
                className="ml-auto w-48 rounded-md border border-slate-200 px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-cornflower/50"
              />
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
              {filteredAccounts.map((account) => {
                const plat = platMap[account.platform];
                const currentGroupId = getGroupId(account.id, groups);
                return (
                  <div key={account.id} className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50">
                    {/* Platform badge */}
                    <span className={`flex-shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${plat?.badgeClass ?? 'bg-slate-100 text-slate-600'}`}>
                      {plat?.badge ?? account.platform}
                    </span>
                    {/* Account name */}
                    <span className="flex-1 text-sm text-slate-800 truncate">{account.name}</span>
                    {/* Group selector */}
                    <select
                      value={currentGroupId ?? ''}
                      onChange={(e) => onAssignAccount(account.id, e.target.value || null)}
                      className="flex-shrink-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-cornflower/50 cursor-pointer"
                    >
                      <option value="">— No client —</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
              {filteredAccounts.length === 0 && (
                <p className="px-4 py-8 text-sm text-slate-400 text-center">No accounts found.</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-6 py-3 flex items-center justify-between text-xs text-slate-400">
          <span>Changes save automatically to your browser.</span>
          <button
            onClick={onClose}
            className="rounded-md bg-brand-navy px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-navy/85"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
