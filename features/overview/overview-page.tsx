type Format = 'number' | 'money' | 'percent' | 'decimal';

type MetricRow = {
  label: string;
  values: number[];
  format: Format;
  totalMode?: 'sum' | 'avg' | 'ratio';
  ratio?: { numerator: number[]; denominator: number[] };
};

type MetricSection = {
  title: string;
  rows: MetricRow[];
};

const months = [
  'June-25',
  'July-25',
  'August-25',
  'September-25',
  'October-25',
  'November-25',
  'December-25',
  'January-26',
  'February-26',
  'March-26',
  'April-26',
  'May-26',
  'June-26',
  'July-26',
];

const dateHeaders = [
  '06/01/2025',
  '07/01/2025',
  '08/01/2025',
  '09/01/2025',
  '10/01/2025',
  '11/01/2025',
  '12/01/2025',
  '01/01/2026',
  '02/01/2026',
  '03/01/2026',
  '04/01/2026',
  '05/01/2026',
  '06/01/2026',
  '07/01/2026',
];

const googleCost = [
  26961.74, 21817.37, 13889.97, 15727.49, 12843.21, 7882.21, 1582.44,
  14529.45, 23849.04, 11928.20, 4369.70, 0, 0, 0,
];

const googleImpressions = [
  953400, 812200, 695100, 728900, 691400, 502300, 103200,
  724500, 1120900, 782600, 309800, 0, 0, 0,
];

const googleClicks = [
  22300, 19840, 13930, 15210, 12980, 8170, 1580,
  14220, 23860, 12190, 4510, 0, 0, 0,
];

const googleConversions = [
  568, 332, 457, 409, 263, 824, 879, 625, 589, 592, 253, 80, 0, 0,
];

const conversionValue = [
  11500, 68000, 0, 17500, 39000, 19000, 5500,
  38500, 17000, 11000, 50475, 0, 0, 0,
];

const merchantImpressions = [
  421000, 398500, 411200, 387900, 402100, 431800, 285400,
  502700, 589100, 533600, 476200, 192300, 0, 0,
];

const merchantClicks = [
  12400, 11890, 12830, 10980, 12140, 13020, 6410,
  24980, 44320, 31200, 14690, 1620, 0, 0,
];

const activeProducts = [
  1840, 1875, 1906, 1920, 1948, 1982, 2010,
  2044, 2090, 2118, 2140, 2164, 2164, 2164,
];

const disapprovedProducts = [
  42, 39, 36, 51, 45, 33, 28, 24, 31, 29, 22, 18, 18, 18,
];

const freeListingClicks = [
  9100, 8750, 9480, 8220, 8900, 9720, 4810,
  18300, 32600, 22900, 10350, 1180, 0, 0,
];

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function divide(numerator: number, denominator: number) {
  return denominator === 0 ? 0 : numerator / denominator;
}

function totalFor(row: MetricRow) {
  if (row.totalMode === 'ratio' && row.ratio) {
    return divide(sum(row.ratio.numerator), sum(row.ratio.denominator));
  }

  if (row.totalMode === 'avg') {
    const populated = row.values.filter((value) => value > 0);
    return populated.length === 0 ? 0 : sum(populated) / populated.length;
  }

  return sum(row.values);
}

function formatValue(value: number, format: Format) {
  if (format === 'money') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(value);
  }

  if (format === 'percent') {
    return `${(value * 100).toFixed(2)}%`;
  }

  if (format === 'decimal') {
    return value.toFixed(2);
  }

  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

function ratioRow(
  label: string,
  numerator: number[],
  denominator: number[],
  format: Format,
  multiplier = 1,
): MetricRow {
  return {
    label,
    values: numerator.map((value, index) => divide(value, denominator[index]) * multiplier),
    format,
    totalMode: 'ratio',
    ratio: { numerator: numerator.map((value) => value * multiplier), denominator },
  };
}

const sections: MetricSection[] = [
  {
    title: 'Total',
    rows: [
      { label: 'Total Ad Spend', values: googleCost, format: 'money' },
      { label: 'Total Impressions', values: googleImpressions.map((value, index) => value + merchantImpressions[index]), format: 'number' },
      { label: 'Total Clicks', values: googleClicks.map((value, index) => value + merchantClicks[index]), format: 'number' },
      ratioRow('Blended CTR', googleClicks.map((value, index) => value + merchantClicks[index]), googleImpressions.map((value, index) => value + merchantImpressions[index]), 'percent'),
      { label: 'Conversions', values: googleConversions, format: 'number' },
      ratioRow('Conversion Rate', googleConversions, googleClicks, 'percent'),
      { label: 'Conversion Value', values: conversionValue, format: 'money' },
      ratioRow('Blended ROAS', conversionValue, googleCost, 'decimal'),
      { label: 'Active Merchant Products', values: activeProducts, format: 'number', totalMode: 'avg' },
      { label: 'Disapproved Products', values: disapprovedProducts, format: 'number', totalMode: 'avg' },
    ],
  },
  {
    title: 'Google Ads',
    rows: [
      { label: 'Cost', values: googleCost, format: 'money' },
      { label: 'Impressions', values: googleImpressions, format: 'number' },
      { label: 'Clicks', values: googleClicks, format: 'number' },
      ratioRow('CTR', googleClicks, googleImpressions, 'percent'),
      ratioRow('Average CPC', googleCost, googleClicks, 'money'),
      { label: 'Conversions', values: googleConversions, format: 'number' },
      ratioRow('Conversion Rate', googleConversions, googleClicks, 'percent'),
      { label: 'Conversion Value', values: conversionValue, format: 'money' },
      ratioRow('ROAS', conversionValue, googleCost, 'decimal'),
    ],
  },
  {
    title: 'Merchant Center',
    rows: [
      { label: 'Product Impressions', values: merchantImpressions, format: 'number' },
      { label: 'Product Clicks', values: merchantClicks, format: 'number' },
      ratioRow('Product CTR', merchantClicks, merchantImpressions, 'percent'),
      { label: 'Free Listing Clicks', values: freeListingClicks, format: 'number' },
      { label: 'Active Products', values: activeProducts, format: 'number', totalMode: 'avg' },
      { label: 'Disapproved Products', values: disapprovedProducts, format: 'number', totalMode: 'avg' },
      ratioRow('Disapproval Rate', disapprovedProducts, activeProducts, 'percent'),
    ],
  },
];

const totalSpend = sum(googleCost);
const totalClicks = sum(googleClicks) + sum(merchantClicks);
const totalConversions = sum(googleConversions);
const totalRevenue = sum(conversionValue);

export function OverviewPage() {
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Overview</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950">Google Ads + Merchant Center Sheet</h1>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
          Last 14 months + rolling total
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Ad spend" value={formatValue(totalSpend, 'money')} />
        <Kpi label="Clicks" value={formatValue(totalClicks, 'number')} />
        <Kpi label="Conversions" value={formatValue(totalConversions, 'number')} />
        <Kpi label="ROAS" value={formatValue(divide(totalRevenue, totalSpend), 'decimal')} />
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-premium">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-sm font-semibold text-slate-800">Monthly Performance Matrix</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1500px] w-full border-collapse text-xs">
            <thead>
              <tr className="bg-white">
                <th className="sticky left-0 z-20 min-w-64 border-b border-r border-slate-200 bg-white px-3 py-2 text-left font-semibold text-slate-600">
                  Date
                </th>
                {dateHeaders.map((date) => (
                  <th key={date} className="border-b border-r border-slate-200 px-3 py-2 text-right font-medium text-slate-400">
                    {date}
                  </th>
                ))}
                <th className="border-b border-slate-200 bg-brand-navy px-3 py-2 text-right font-semibold text-white">
                  Rolling Total
                </th>
              </tr>
              <tr className="bg-slate-50">
                <th className="sticky left-0 z-20 border-b border-r border-slate-200 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">
                  Metric
                </th>
                {months.map((month) => (
                  <th key={month} className="border-b border-r border-slate-200 px-3 py-2 text-right font-semibold text-slate-700">
                    {month}
                  </th>
                ))}
                <th className="border-b border-slate-200 bg-brand-navy px-3 py-2 text-right font-semibold text-white">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {sections.map((section) => (
                <SectionRows key={section.title} section={section} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SectionRows({ section }: { section: MetricSection }) {
  return (
    <>
      <tr>
        <td colSpan={months.length + 2} className="border-y border-slate-300 bg-brand-denim px-3 py-2 text-sm font-bold text-white">
          {section.title}
        </td>
      </tr>
      {section.rows.map((row) => (
        <tr key={`${section.title}-${row.label}`} className="hover:bg-slate-50">
          <th className="sticky left-0 z-10 border-b border-r border-slate-200 bg-white px-3 py-2 text-left font-semibold text-slate-700">
            {row.label}
          </th>
          {row.values.map((value, index) => (
            <td key={`${row.label}-${months[index]}`} className="border-b border-r border-slate-100 px-3 py-2 text-right tabular-nums text-slate-700">
              {formatValue(value, row.format)}
            </td>
          ))}
          <td className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-right font-bold tabular-nums text-slate-950">
            {formatValue(totalFor(row), row.format)}
          </td>
        </tr>
      ))}
    </>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-premium">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
    </article>
  );
}
