import React from 'react';
import { AiResponseBlock } from '@/components/ai/ai-response-block';
import { DataTable } from '@/components/tables/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { campaigns, clients, recommendations } from '@/mocks/data';
import { money } from '@/lib/utils';
import { SupermetricsConsole } from './integrations/supermetrics-console';
import { CampaignsWorkbench } from './campaigns/campaigns-workbench';
import { ClientsWorkbench } from './clients/clients-workbench';
import { PaidMediaBreakout } from './clients/paid-media-breakout';
import { BudgetPacingWorkbench } from './budget-pacing/budget-pacing-workbench';

export function ClientsPage() {
  return <PaidMediaBreakout />;
}

export function AccountsPage() {
  const rows = clients.flatMap((client) =>
    client.platforms.map((platform, idx) => [
      `${client.name} - ${platform}`,
      `acc_${client.id}_${idx}`,
      client.name,
      <StatusBadge value="Healthy" key="health" />,
      '2026-04-22 02:00 UTC',
      'read_ads, manage_campaigns',
      'Healthy',
      <button key="btn1" className="rounded border border-slate-300 px-2 py-1 text-xs">Reconnect</button>,
      <button key="btn2" className="rounded border border-slate-300 px-2 py-1 text-xs">Sync</button>
    ])
  );
  return <PageTable title="Accounts" headers={['Account', 'ID', 'Client', 'Connection', 'Last Sync', 'Scopes', 'API Health', 'Reconnect', 'Manual Sync']} rows={rows} />;
}

export function CampaignsPage() {
  return <CampaignsWorkbench />;
}

export function AdsIntelligencePage() {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Ads Intelligence</h2>
      <div className="grid gap-4 xl:grid-cols-3">
        <article className="card"><h3 className="mb-2 text-sm font-semibold">Top ads</h3><p className="text-sm text-slate-600">Meta carousel variants from Northstar are driving +21% CVR vs account baseline.</p></article>
        <article className="card"><h3 className="mb-2 text-sm font-semibold">Creative fatigue</h3><p className="text-sm text-slate-600">TikTok TOFU has frequency 3.9 with CTR decay in the last 5 days.</p></article>
        <article className="card"><h3 className="mb-2 text-sm font-semibold">Audience overlap risk</h3><p className="text-sm text-slate-600">Prospecting and retargeting sets share 24% overlap on Meta.</p></article>
      </div>
    </section>
  );
}

export function AiActionsPage() {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">AI Actions</h2>
      <div className="card">
        <p className="mb-2 text-sm text-slate-500">Copilot workspace (mocked action execution with preview and logs)</p>
        <textarea className="h-24 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm" defaultValue="Create a new Meta prospecting campaign focused on registrations." />
        <div className="mt-3 flex gap-2"><button className="rounded-lg bg-sky-500 px-3 py-2 text-sm font-medium text-slate-950">Run AI Action</button><button className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Preview API Impact</button></div>
      </div>
      <AiResponseBlock block={{ title: 'Generated strategy', bullets: ['Campaign objective: registrations', 'Budget split: 70% broad, 30% lookalike', 'A/B test plan: 3 headline clusters'], actionPreview: 'Simulated action logged. Awaiting human confirmation.' }} />
    </section>
  );
}

export function BudgetPacingPage() {
  return <BudgetPacingWorkbench />;
}

export function PerformanceAnalyticsPage() {
  return <PageTable title="Performance Analytics" headers={['Entity', 'Spend Trend', 'Conversion Trend', 'CPR', 'Efficiency', 'Volume vs Efficiency', 'Ranking']} rows={campaigns.map((c, i) => [c.name, i % 2 ? '↑' : '↓', i % 2 ? '↑' : '→', money(c.cpr), `${c.performanceScore}/100`, i % 2 ? 'High volume / medium efficiency' : 'Medium volume / high efficiency', `#${i + 1}`])} />;
}

export function RecommendationsPage() {
  return <PageTable title="Recommendations" headers={['Title', 'Description', 'Severity', 'Platform', 'Client', 'Rationale', 'Impact', 'Status', 'CTA']} rows={recommendations.map((r) => [r.title, r.description, <StatusBadge value={r.severity} key="sev" />, r.platform, clients.find((c) => c.id === r.clientId)?.name, r.rationale, r.impact, <StatusBadge value={r.status} key="st" />, <button key="cta" className="rounded border border-slate-300 px-2 py-1 text-xs">Apply</button>])} />;
}

export function CopyStudioPage() {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Copy Studio</h2>
      <div className="grid gap-4 xl:grid-cols-2">
        <article className="card">
          <p className="section-title">Generator</p>
          <textarea className="mt-3 h-36 w-full rounded border border-slate-300 bg-white p-3 text-sm" defaultValue="Generate 10 headlines for fintech registration campaign, tone: direct and trust-building." />
          <button className="mt-3 rounded-lg bg-sky-500 px-3 py-2 text-sm font-medium text-slate-950">Generate Variants</button>
        </article>
        <article className="card">
          <p className="section-title">Outputs</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="rounded border border-slate-300 p-2">Unlock smarter credit decisions in minutes.</li>
            <li className="rounded border border-slate-300 p-2">See your approval potential before you apply.</li>
            <li className="rounded border border-slate-300 p-2">Grow with a card built for modern operators.</li>
          </ul>
        </article>
      </div>
    </section>
  );
}

export function IntegrationsPage() {
  return (
    <section className="space-y-4">
      <PageTable title="Integrations" headers={['Provider', 'Status', 'Credentials', 'Scopes', 'Health', 'Last Sync', 'Test', 'Sync', 'Recent Logs']} rows={['Meta system user', 'Google Ads API', 'TikTok API', 'LinkedIn Ads', 'Supermetrics API'].map((provider, idx) => [provider, <StatusBadge value={idx === 2 ? 'Warning' : 'Healthy'} key='s' />, idx === 1 ? 'Missing refresh token' : 'Configured', 'read, write, insights', idx === 2 ? 'Warning' : 'Healthy', '2026-04-22 01:40 UTC', <button key='t' className='rounded border border-slate-300 px-2 py-1 text-xs'>Test</button>, <button key='y' className='rounded border border-slate-300 px-2 py-1 text-xs'>Sync</button>, idx === 1 ? 'Refresh token expires soon' : 'No incidents'])} />
      <SupermetricsConsole />
    </section>
  );
}

export function TeamPermissionsPage() {
  const users = [
    ['Olivia Mendes', 'Admin', 'Northstar, Lumen, Nova', 'All', 'Viewed global dashboards'],
    ['Lucas Reed', 'Account Manager', 'Lumen', 'Lumen accounts', 'Updated budget pacing targets'],
    ['Ana Costa', 'Analyst', 'Lumen', 'Meta + TikTok', 'Applied AI recommendation rec_1'],
    ['Board Viewer', 'Viewer', 'All', 'Read-only', 'Exported analytics report']
  ];
  return <PageTable title="Team & Permissions" headers={['User', 'Role', 'Assigned Clients', 'Assigned Accounts', 'Recent Activity']} rows={users.map((u) => [u[0], <StatusBadge key='role' value={u[1]} />, u[2], u[3], u[4]])} />;
}

export function SettingsPage() {
  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <article className="card"><h2 className="mb-2 text-xl font-semibold">Branding & Preferences</h2><p className="text-sm text-slate-600">Agency logo, workspace name, locale, number format, default comparison period.</p></article>
      <article className="card"><h2 className="mb-2 text-xl font-semibold">AI Guardrails</h2><p className="text-sm text-slate-600">Allowed AI actions, confirmation gates, naming templates, operational limits.</p></article>
      <article className="card"><h2 className="mb-2 text-xl font-semibold">Notifications & Audit</h2><p className="text-sm text-slate-600">Alert channels, webhook endpoints, immutable action log retention and access.</p></article>
      <article className="card"><h2 className="mb-2 text-xl font-semibold">Integrations</h2><p className="text-sm text-slate-600">Provider keys, OAuth setup, fallback strategy with Supermetrics adapters.</p></article>
    </section>
  );
}

function PageTable({ title, headers, rows }: { title: string; headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <DataTable headers={headers} rows={rows.map((row) => row.map((cell) => (cell ?? '-') as React.ReactNode))} />
    </section>
  );
}
