'use client';

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export function LineChartCard({ title, data, dataKey, stroke }: { title: string; data: Array<Record<string, string | number>>; dataKey: string; stroke: string }) {
  return (
    <div className="card h-80">
      <h3 className="mb-4 text-sm font-semibold text-slate-700">{title}</h3>
      <ResponsiveContainer width="100%" height="92%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#dbe4f3" />
          <XAxis dataKey="date" stroke="#64748b" />
          <YAxis stroke="#64748b" />
          <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 10 }} />
          <Line type="monotone" dataKey={dataKey} stroke={stroke} strokeWidth={2.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
