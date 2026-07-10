import { BarChart3, CheckCircle2, Link2 } from 'lucide-react';

const campaignRows = [
  { name: 'Search - Brand', cost: '$18,420.12', clicks: '14,982', conversions: '412', roas: '4.21' },
  { name: 'Performance Max - Shopping', cost: '$46,901.40', clicks: '52,118', conversions: '1,184', roas: '2.87' },
  { name: 'Search - Non Brand', cost: '$31,884.93', clicks: '28,744', conversions: '643', roas: '1.94' },
  { name: 'Remarketing', cost: '$8,206.18', clicks: '9,410', conversions: '220', roas: '3.12' },
];

export function GoogleAdsPage() {
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Google Ads</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950">Campaign Performance</h1>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-brand-navy px-4 py-2 text-sm font-semibold text-white hover:bg-brand-denim">
          <Link2 size={16} />
          Link Google Ads
        </button>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Cost" value="$155,380.82" />
        <Metric label="Clicks" value="140,790" />
        <Metric label="Conversions" value="5,871" />
        <Metric label="ROAS" value="1.79" />
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-premium">
        <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
          <BarChart3 size={16} className="text-brand-navy" />
          <p className="text-sm font-semibold text-slate-800">Campaigns</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-white text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 text-left">Campaign</th>
                <th className="px-4 py-3 text-right">Cost</th>
                <th className="px-4 py-3 text-right">Clicks</th>
                <th className="px-4 py-3 text-right">Conversions</th>
                <th className="px-4 py-3 text-right">ROAS</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {campaignRows.map((row) => (
                <tr key={row.name} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">{row.cost}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">{row.clicks}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">{row.conversions}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-950">{row.roas}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 size={12} />
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-premium">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
    </article>
  );
}
