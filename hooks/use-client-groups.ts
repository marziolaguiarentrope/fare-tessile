'use client';

import { useCallback, useEffect, useState } from 'react';

export interface ClientGroup {
  id: string;
  name: string;
  /** Stable Supermetrics account IDs belonging to this client. */
  accountIds: string[];
}

const STORAGE_KEY = 'Fare Tessile-client-groups-v1';

function load(): ClientGroup[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ClientGroup[]) : [];
  } catch {
    return [];
  }
}

function persist(groups: ClientGroup[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
  } catch {}
}

export function useClientGroups() {
  const [groups, setGroups] = useState<ClientGroup[]>([]);

  // Hydrate from localStorage after mount
  useEffect(() => { setGroups(load()); }, []);

  const save = useCallback((next: ClientGroup[]) => {
    setGroups(next);
    persist(next);
  }, []);

  const addGroup = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    save([...groups, { id: crypto.randomUUID(), name: trimmed, accountIds: [] }]);
  }, [groups, save]);

  const removeGroup = useCallback((id: string) => {
    save(groups.filter((g) => g.id !== id));
  }, [groups, save]);

  const renameGroup = useCallback((id: string, name: string) => {
    save(groups.map((g) => (g.id === id ? { ...g, name } : g)));
  }, [groups, save]);

  /** Assign an account to a group (pass null to unassign). */
  const assignAccount = useCallback((accountId: string, groupId: string | null) => {
    save(
      groups.map((g) => ({
        ...g,
        accountIds:
          g.id === groupId
            ? [...new Set([...g.accountIds, accountId])]
            : g.accountIds.filter((id) => id !== accountId),
      })),
    );
  }, [groups, save]);

  return { groups, addGroup, removeGroup, renameGroup, assignAccount };
}
