export type SupermetricsCampaignRow = {
  date: string | null;
  accountName: string | null;
  campaignName: string | null;
  adGroupName: string | null;
  adName: string | null;
  objective: string | null;
  impressions: number;
  reach: number;
  clicks: number;
  spend: number;
  videoViews: number;
  leads: number;
  purchases: number;
  landingPageViews: number;
  results: number;
  /** Raw decimal from Supermetrics, e.g. 0.0497. Multiply ×100 for display. */
  ctr: number;
  cpc: number;
  cpm: number;
  frequency: number;
  roas: number;
  cpr: number;
};

export interface SupermetricsAccount {
  account_id: string;
  account_name: string;
}

export interface SupermetricsLoginAccounts {
  ds_user: string;
  display_name: string;
  accounts: SupermetricsAccount[];
  cache_time?: string | null;
}

export interface SupermetricsAccountsResponse {
  meta: {
    request_id: string;
  };
  data: SupermetricsLoginAccounts[];
}
