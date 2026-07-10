import type { BudgetPacingSourceRow } from '../types/budgetPacing';

// Today = 2026-05-06
// daysInMonth = 31 (May), daysPassed = 5, daysLeft = 26
// expectedSpendToDate = budget * (5/31)
//
// Status targets:
//   Axel           → Critical Under  (spend well below expected)
//   Novatio        → Critical Over   (spend far above expected)
//   Yon-Ka Paris   → On Track        (spend ≈ expected)
//   Unbound Academy→ Critical Under  (almost no spend)
//   Prequel        → Over Pacing     (slightly above)
//   Northstar      → Under Pacing    (slightly below)
//   Lumen E-comm   → Critical Over   (way above)
//   Nova EdTech    → On Track        (barely above)

export const BUDGET_PACING_MOCK_DATA: BudgetPacingSourceRow[] = [
  {
    id: 'axel-meta-performance',
    client: 'Axel',
    platform: 'Meta Ads',
    channel: 'Performance',
    monthBudget: 15_000,
    actualSpend: 1_320,    // expected ≈ 2 419 → diff ≈ -45.4% → Critical Under
    currency: 'USD',
    owner: 'Sofia Monteiro',
    lastUpdated: '2026-05-05T18:30:00Z',
    month: '2026-05',
  },
  {
    id: 'novatio-google-search',
    client: 'Novatio',
    platform: 'Google Ads',
    channel: 'Search',
    monthBudget: 25_000,
    actualSpend: 5_250,    // expected ≈ 4 032 → diff ≈ +30.2% → Critical Over
    currency: 'USD',
    owner: 'Lucas Ferreira',
    lastUpdated: '2026-05-05T17:00:00Z',
    month: '2026-05',
  },
  {
    id: 'yonka-meta-prospecting',
    client: 'Yon-Ka Paris',
    platform: 'Meta Ads',
    channel: 'Prospecting',
    monthBudget: 8_000,
    actualSpend: 1_330,    // expected ≈ 1 290 → diff ≈ +3.1% → On Track
    currency: 'USD',
    owner: 'Sofia Monteiro',
    lastUpdated: '2026-05-05T20:00:00Z',
    month: '2026-05',
  },
  {
    id: 'unbound-tiktok-awareness',
    client: 'Unbound Academy',
    platform: 'TikTok Ads',
    channel: 'Awareness',
    monthBudget: 12_000,
    actualSpend: 860,      // expected ≈ 1 935 → diff ≈ -55.6% → Critical Under
    currency: 'USD',
    owner: 'Marcus Webb',
    lastUpdated: '2026-05-05T14:00:00Z',
    month: '2026-05',
  },
  {
    id: 'prequel-google-display',
    client: 'Prequel',
    platform: 'Google Ads',
    channel: 'Display',
    monthBudget: 18_500,
    actualSpend: 3_420,    // expected ≈ 2 984 → diff ≈ +14.6% → Over Pacing
    currency: 'USD',
    owner: 'Lucas Ferreira',
    lastUpdated: '2026-05-05T16:45:00Z',
    month: '2026-05',
  },
  {
    id: 'northstar-linkedin-b2b',
    client: 'Northstar Fintech',
    platform: 'LinkedIn Ads',
    channel: 'B2B Lead Gen',
    monthBudget: 30_000,
    actualSpend: 4_150,    // expected ≈ 4 839 → diff ≈ -14.2% → Under Pacing
    currency: 'USD',
    owner: 'Marcus Webb',
    lastUpdated: '2026-05-05T11:30:00Z',
    month: '2026-05',
  },
  {
    id: 'lumen-meta-retargeting',
    client: 'Lumen E-commerce',
    platform: 'Meta Ads',
    channel: 'Retargeting',
    monthBudget: 9_500,
    actualSpend: 2_120,    // expected ≈ 1 532 → diff ≈ +38.4% → Critical Over
    currency: 'USD',
    owner: 'Sofia Monteiro',
    lastUpdated: '2026-05-06T08:15:00Z',
    month: '2026-05',
  },
  {
    id: 'novaedtech-google-youtube',
    client: 'Nova EdTech',
    platform: 'Google Ads',
    channel: 'YouTube',
    monthBudget: 22_000,
    actualSpend: 3_680,    // expected ≈ 3 548 → diff ≈ +3.7% → On Track
    currency: 'USD',
    owner: 'Lucas Ferreira',
    lastUpdated: '2026-05-05T19:00:00Z',
    month: '2026-05',
  },
];
