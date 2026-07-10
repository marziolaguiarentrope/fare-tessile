import { Campaign, Client, Recommendation } from '@/types/domain';

export const clients: Client[] = [
  {
    id: 'cl_1',
    name: 'Northstar Fintech',
    status: 'Active',
    plan: 'Enterprise',
    accountManager: 'Olivia Mendes',
    analyst: 'Noah Clark',
    monthlyBudget: 240000,
    spend: 164300,
    objective: 'Registrations',
    healthScore: 92,
    platforms: ['Meta Ads', 'Google Ads', 'LinkedIn Ads'],
    service: 'SEO + PPC',
    ppcAccountManagers: ['Eve', 'Taylor'],
    ppcAnalysts: ['Juan', 'Vlad']
  },
  {
    id: 'cl_2',
    name: 'Lumen E-commerce',
    status: 'Active',
    plan: 'Scale',
    accountManager: 'Lucas Reed',
    analyst: 'Ana Costa',
    monthlyBudget: 150000,
    spend: 112800,
    objective: 'Purchases',
    healthScore: 84,
    platforms: ['Meta Ads', 'Google Ads', 'TikTok Ads'],
    service: 'PPC',
    ppcAccountManagers: ['Caio', 'Eve'],
    ppcAnalysts: ['Anastasia', 'Will']
  },
  {
    id: 'cl_3',
    name: 'Nova EdTech',
    status: 'At Risk',
    plan: 'Growth',
    accountManager: 'Olivia Mendes',
    analyst: 'Kai Wong',
    monthlyBudget: 98000,
    spend: 81000,
    objective: 'Leads',
    healthScore: 69,
    platforms: ['Google Ads', 'LinkedIn Ads', 'Pinterest Ads'],
    service: 'SEO',
    ppcAccountManagers: ['Isaiah', 'Caio'],
    ppcAnalysts: ['Maria', 'Marzio']
  }
];

export const campaigns: Campaign[] = [
  { id: 'cp_1', name: 'US Prospecting Q2', clientId: 'cl_1', platform: 'Meta Ads', objective: 'Registrations', status: 'Active', spend: 58000, impressions: 3100000, clicks: 54300, results: 4360, cpr: 13.3, budget: 72000, startDate: '2026-04-01', endDate: '2026-05-15', analyst: 'Noah Clark', performanceScore: 88 },
  { id: 'cp_2', name: 'Search Intent - Credit', clientId: 'cl_1', platform: 'Google Ads', objective: 'Registrations', status: 'Learning', spend: 42700, impressions: 830000, clicks: 28400, results: 1914, cpr: 22.3, budget: 60000, startDate: '2026-03-19', endDate: '2026-05-01', analyst: 'Noah Clark', performanceScore: 76 },
  { id: 'cp_3', name: 'Retargeting DPA', clientId: 'cl_2', platform: 'Meta Ads', objective: 'Purchases', status: 'Active', spend: 21400, impressions: 640000, clicks: 19350, results: 1098, cpr: 19.5, budget: 28000, startDate: '2026-04-02', endDate: '2026-04-30', analyst: 'Ana Costa', performanceScore: 91 },
  { id: 'cp_4', name: 'TOFU Creator Launch', clientId: 'cl_2', platform: 'TikTok Ads', objective: 'Purchases', status: 'Paused', spend: 9800, impressions: 910000, clicks: 12800, results: 271, cpr: 36.1, budget: 24000, startDate: '2026-04-01', endDate: '2026-04-29', analyst: 'Ana Costa', performanceScore: 58 },
  { id: 'cp_5', name: 'Lead Gen MBA Program', clientId: 'cl_3', platform: 'LinkedIn Ads', objective: 'Leads', status: 'Active', spend: 28300, impressions: 290000, clicks: 7600, results: 344, cpr: 82.3, budget: 36000, startDate: '2026-03-25', endDate: '2026-05-10', analyst: 'Kai Wong', performanceScore: 63 }
];

export const recommendations: Recommendation[] = [
  { id: 'rec_1', title: 'Increase budget on Meta retargeting', description: 'Campaign cluster has stable CPR and conversion velocity in the last 7 days.', severity: 'Medium', platform: 'Meta Ads', clientId: 'cl_2', rationale: 'CPR 18% below target for 5 consecutive days.', impact: '+14% projected conversions', status: 'Pending' },
  { id: 'rec_2', title: 'Refresh creatives for TikTok TOFU', description: 'High frequency and declining CTR indicate fatigue.', severity: 'High', platform: 'TikTok Ads', clientId: 'cl_2', rationale: 'CTR dropped 31% while CPC rose 22%.', impact: 'Recover 0.6pp CTR', status: 'Pending' },
  { id: 'rec_3', title: 'Fix inconsistent UTM naming', description: 'Three active campaigns are missing naming standard suffixes.', severity: 'Low', platform: 'Google Ads', clientId: 'cl_1', rationale: 'Tracking splits are fragmented in analytics layer.', impact: 'Improved attribution confidence', status: 'Done' }
];

export const kpiSeries = [
  { date: 'Apr 01', spend: 12600, conversions: 440, cpr: 28.6 },
  { date: 'Apr 05', spend: 13420, conversions: 495, cpr: 27.1 },
  { date: 'Apr 10', spend: 14180, conversions: 530, cpr: 26.7 },
  { date: 'Apr 15', spend: 15210, conversions: 590, cpr: 25.8 },
  { date: 'Apr 20', spend: 16500, conversions: 618, cpr: 26.7 }
];
