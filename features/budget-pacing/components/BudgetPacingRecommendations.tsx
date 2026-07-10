'use client';

import { Lightbulb, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import type { PacingRecommendation } from '../types/budgetPacing';
import { getStatusMeta } from '../utils/budgetPacingStatus';

interface BudgetPacingRecommendationsProps {
  recommendations: PacingRecommendation[];
}

const IMPACT_PILL = {
  high: 'bg-red-50 text-red-700 border border-red-200',
  medium: 'bg-amber-50 text-amber-700 border border-amber-200',
  low: 'bg-slate-50 text-slate-600 border border-slate-200',
};

const IMPACT_DOT = {
  high: 'bg-red-500',
  medium: 'bg-amber-400',
  low: 'bg-slate-400',
};

export function BudgetPacingRecommendations({ recommendations }: BudgetPacingRecommendationsProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (recommendations.length === 0) return null;

  const highCount = recommendations.filter((r) => r.impact === 'high').length;

  return (
    <div className="card p-0 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/80 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-semibold text-slate-800">Recommendations</span>
          {highCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
              {highCount} urgent
            </span>
          )}
        </div>
        {collapsed ? (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {/* Rec list */}
      {!collapsed && (
        <div className="border-t border-slate-100 divide-y divide-slate-100">
          {recommendations.map((rec) => {
            const meta = getStatusMeta(rec.status);
            return (
              <div key={rec.id} className="px-5 py-4 flex items-start gap-4">
                {/* Impact dot */}
                <div className="pt-1 shrink-0">
                  <span className={`block w-2 h-2 rounded-full ${IMPACT_DOT[rec.impact]}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-bold text-slate-800">{rec.client}</span>
                    <span className="text-xs text-slate-400">{rec.platform}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${meta.badgeCss}`}>
                      {meta.shortLabel}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${IMPACT_PILL[rec.impact]}`}>
                      {rec.impact} impact
                    </span>
                  </div>

                  <div className="flex items-start gap-1.5 mb-1">
                    <ArrowRight className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-sm font-semibold text-slate-800">{rec.action}</p>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed">{rec.rationale}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
