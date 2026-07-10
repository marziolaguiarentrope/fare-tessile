import { ReactNode } from 'react';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

export function DashboardShell({ children, username }: { children: ReactNode; username: string }) {
  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <Topbar username={username} />
        <main className="min-w-0 space-y-6 p-5">{children}</main>
      </div>
    </div>
  );
}
