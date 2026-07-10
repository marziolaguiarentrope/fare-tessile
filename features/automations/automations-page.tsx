'use client';

import { useState } from 'react';
import { ArrowRight, Workflow } from 'lucide-react';
import { MountAiryCallMatchWorkbench } from './mount-airy-call-match-workbench';

export function AutomationsPage() {
  const [activeAutomation, setActiveAutomation] = useState<'mount-airy' | null>(null);

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Automations</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Internal workflows for recurring marketing operations tasks.
        </p>
      </div>

      <article className="card flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-brand-navy p-2 text-white">
            <Workflow size={18} />
          </div>
          <div>
            <p className="section-title">First automation</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">Mount Airy - Google Ads Call to CRM Match</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Compare Google Ads caller phone numbers against Mount Airy CRM customers with normalized exact, strong, unique last-4, ambiguous, and no-match outcomes.
            </p>
          </div>
        </div>
        <button
          onClick={() => setActiveAutomation('mount-airy')}
          className="inline-flex items-center gap-2 rounded-md bg-brand-navy px-4 py-2 text-sm font-semibold text-white"
        >
          Open automation
          <ArrowRight size={15} />
        </button>
      </article>

      {activeAutomation === 'mount-airy' && <MountAiryCallMatchWorkbench />}
    </section>
  );
}
