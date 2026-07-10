'use client';

import { useMemo, useState } from 'react';
import { clients } from '@/mocks/data';

export function useDashboardContext() {
  const [clientId, setClientId] = useState('all');
  const selectedClient = useMemo(() => clients.find((c) => c.id === clientId), [clientId]);
  return { clientId, setClientId, selectedClient };
}
