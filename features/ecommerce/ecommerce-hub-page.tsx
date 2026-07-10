import { AlertTriangle, CheckCircle2, ExternalLink, Link2, ShoppingBag } from 'lucide-react';

const merchantMetrics = [
  { label: 'Active products', value: '2,164', detail: 'Average active SKUs in current rolling window' },
  { label: 'Disapproved products', value: '18', detail: 'Needs feed or policy review' },
  { label: 'Product clicks', value: '182,480', detail: 'Merchant Center product click volume' },
  { label: 'Product CTR', value: '3.85%', detail: 'Clicks divided by product impressions' },
];

const feedChecks = [
  { label: 'Primary feed', status: 'Ready', tone: 'good' },
  { label: 'Shipping settings', status: 'Review', tone: 'warn' },
  { label: 'Tax settings', status: 'Ready', tone: 'good' },
  { label: 'Product identifiers', status: 'Review', tone: 'warn' },
];

export function EcommerceHubPage() {
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">E-comm Hub</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950">Merchant Center Connection</h1>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-brand-navy px-4 py-2 text-sm font-semibold text-white hover:bg-brand-denim">
          <Link2 size={16} />
          Link Merchant Center
        </button>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-premium">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-brand-navy p-2 text-white">
              <ShoppingBag size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Google Merchant Center</p>
              <p className="text-xs text-slate-500">Use this hub to connect the product feed used by Google Ads Shopping and Performance Max.</p>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-800">Connection requirements</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {feedChecks.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2">
                  <span className="text-sm text-slate-700">{item.label}</span>
                  <span className={item.tone === 'good' ? 'inline-flex items-center gap-1 text-xs font-semibold text-emerald-700' : 'inline-flex items-center gap-1 text-xs font-semibold text-amber-700'}>
                    {item.tone === 'good' ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-premium">
          <p className="text-sm font-semibold text-slate-900">Next setup steps</p>
          <ol className="mt-3 space-y-2 text-sm text-slate-600">
            <li>1. Connect the Merchant Center account in Supermetrics or the Google connector.</li>
            <li>2. Confirm product feed diagnostics are available.</li>
            <li>3. Map Merchant Center product clicks and impressions into the Overview sheet.</li>
          </ol>
          <button className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-navy hover:text-brand-denim">
            Open connector
            <ExternalLink size={14} />
          </button>
        </aside>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {merchantMetrics.map((metric) => (
          <article key={metric.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-premium">
            <p className="text-xs font-medium text-slate-500">{metric.label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-950">{metric.value}</p>
            <p className="mt-1 text-xs text-slate-400">{metric.detail}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
