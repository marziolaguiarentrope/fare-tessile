export type Platform = 'Meta Ads' | 'Google Ads' | 'TikTok Ads' | 'LinkedIn Ads' | 'Pinterest Ads';

export type UserRole = 'Admin' | 'Account Manager' | 'Analyst' | 'Viewer';
export type ServiceType = 'SEO' | 'PPC' | 'SEO + PPC';

export interface Client {
  id: string;
  name: string;
  status: 'Active' | 'Paused' | 'At Risk';
  plan: 'Scale' | 'Growth' | 'Enterprise';
  accountManager: string;
  analyst: string;
  monthlyBudget: number;
  spend: number;
  objective: string;
  healthScore: number;
  platforms: Platform[];
  service: ServiceType;
  ppcAccountManagers: [string, string];
  ppcAnalysts: [string, string];
}

export interface Campaign {
  id: string;
  name: string;
  clientId: string;
  platform: Platform;
  objective: string;
  status: 'Active' | 'Learning' | 'Paused';
  spend: number;
  impressions: number;
  clicks: number;
  results: number;
  cpr: number;
  budget: number;
  startDate: string;
  endDate: string;
  analyst: string;
  performanceScore: number;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  severity: 'Low' | 'Medium' | 'High';
  platform: Platform;
  clientId: string;
  rationale: string;
  impact: string;
  status: 'Pending' | 'Done' | 'Dismissed';
}
