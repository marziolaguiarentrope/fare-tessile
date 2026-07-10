import { ReactNode } from 'react';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

export function DashboardShell({ children, username }: { children: ReactNode; username: string }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <Topbar username={username} />
        <main className="space-y-6 p-6">{children}</main>
      </div>
    </div>
  );
}
