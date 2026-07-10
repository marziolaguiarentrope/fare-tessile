'use client';

import { AlertTriangle, AlertCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { PacingAlert } from '../types/budgetPacing';
import { getStatusMeta } from '../utils/budgetPacingStatus';

interface BudgetPacingAlertsProps {
  alerts: PacingAlert[];
}

const SEVERITY_ICON = {
  high: <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />,
  medium: <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />,
  low: <Info className="w-4 h-4 text-blue-500 shrink-0" />,
};

const SEVERITY_ROW_BG = {
  high: 'border-red-200 bg-red-50/60',
  medium: 'border-amber-200 bg-amber-50/60',
  low: 'border-blue-200 bg-blue-50/40',
};

const SEVERITY_LABEL_BG = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-blue-100 text-blue-700',
};

export function BudgetPacingAlerts({ alerts }: BudgetPacingAlertsProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (alerts.length === 0) return null;

  const highCount = alerts.filter((a) => a.severity === 'high').length;
  const mediumCount = alerts.filter((a) => a.severity === 'medium').length;

  return (
    <div className="card p-0 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/80 transition-colors"
      >
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <span className="text-sm font-semibold text-slate-800">
            Active Alerts
          </span>
          <div className="flex items-center gap-1.5">
            {highCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                {highCount} critical
              </span>
            )}
            {mediumCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                {mediumCount} warning
              </span>
            )}
          </div>
        </div>
        {collapsed ? (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {/* Alert list */}
      {!collapsed && (
        <div className="border-t border-slate-100 divide-y divide-slate-100">
          {alerts.map((alert) => {
            const meta = getStatusMeta(alert.status);
            return (
              <div
                key={alert.id}
                className={`flex items-start gap-3 px-5 py-3.5 border-l-4 ${SEVERITY_ROW_BG[alert.severity]}`}
                style={{ borderLeftColor: alert.severity === 'high' ? '#ef4444' : alert.severity === 'medium' ? '#f59e0b' : '#3b82f6' }}
              >
                {SEVERITY_ICON[alert.severity]}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-800">{alert.message}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${meta.badgeCss}`}>
                      {meta.shortLabel}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${SEVERITY_LABEL_BG[alert.severity]}`}>
                      {alert.severity}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">{alert.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
