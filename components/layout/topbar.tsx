import { Bell, LogOut, RefreshCcw, Search } from 'lucide-react';
import { logout } from '@/lib/auth/actions';

const actions = [
  { label: 'Sync Data', icon: RefreshCcw, primary: true },
];

export function Topbar({ username }: { username: string }) {
  return (
    <header className="sticky top-0 z-10 border-b border-brand-gray/60 bg-canvas/90 px-6 py-4 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-brand-gray bg-panel px-3 py-2 text-slate-400 transition-colors focus-within:border-brand-cornflower focus-within:ring-1 focus-within:ring-brand-cornflower/30">
          <Search size={15} />
          <input
            className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            placeholder="Search metrics, months, campaigns, products..."
          />
        </div>
        <select className="rounded-lg border border-brand-gray bg-panel px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-cornflower/40">
          <option>Fare Tessile</option>
        </select>
        <select className="rounded-lg border border-brand-gray bg-panel px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-cornflower/40">
          <option>Last 14 months</option>
        </select>
        <button className="rounded-lg border border-brand-gray bg-panel p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-brand-navy">
          <Bell size={16} />
        </button>

        {/* User + Logout */}
        <div className="flex items-center gap-2 rounded-lg border border-brand-gray bg-panel px-3 py-2">
          <span className="text-xs font-medium text-slate-600">{username}</span>
          <form action={logout}>
            <button
              type="submit"
              title="Sair"
              className="text-slate-400 transition-colors hover:text-brand-rose"
            >
              <LogOut size={14} />
            </button>
          </form>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action.label}
            className={
              action.primary
                ? 'flex items-center gap-1.5 rounded-lg bg-brand-gold px-3 py-1.5 text-xs font-semibold text-brand-navy transition-colors hover:bg-brand-gold/90'
                : 'flex items-center gap-1.5 rounded-lg border border-brand-gray px-3 py-1.5 text-xs text-slate-600 transition-colors hover:bg-slate-50 hover:text-brand-navy'
            }
          >
            <action.icon size={13} />
            {action.label}
          </button>
        ))}
      </div>
    </header>
  );
}
