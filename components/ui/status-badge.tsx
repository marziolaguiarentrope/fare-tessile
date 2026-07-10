import { cn } from '@/lib/utils';

const tones: Record<string, string> = {
  Active: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  Paused: 'bg-slate-200 text-slate-700 border-slate-300',
  'At Risk': 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  Healthy: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  Warning: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  Error: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
  Pending: 'bg-sky-500/15 text-sky-300 border-sky-500/40',
  Done: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  Dismissed: 'bg-slate-200 text-slate-700 border-slate-300',
  High: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
  Medium: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  Low: 'bg-sky-500/15 text-sky-300 border-sky-500/40'
};

export function StatusBadge({ value }: { value: string }) {
  return <span className={cn('rounded-full border px-2 py-1 text-xs', tones[value] ?? tones.Pending)}>{value}</span>;
}
