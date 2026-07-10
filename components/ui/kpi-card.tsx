import { ReactNode } from 'react';

export function KpiCard({ label, value, delta, icon }: { label: string; value: string; delta: string; icon?: ReactNode }) {
  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between text-sm text-slate-500">
        <span>{label}</span>
        {icon}
      </div>
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
      <p className="mt-2 text-xs text-emerald-300">{delta} vs previous period</p>
    </div>
  );
}
