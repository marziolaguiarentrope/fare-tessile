import { campaigns, clients, recommendations } from '@/mocks/data';

export const dataService = {
  getOverview() {
    const spend = campaigns.reduce((acc, item) => acc + item.spend, 0);
    const impressions = campaigns.reduce((acc, item) => acc + item.impressions, 0);
    const clicks = campaigns.reduce((acc, item) => acc + item.clicks, 0);
    const conversions = campaigns.reduce((acc, item) => acc + item.results, 0);
    return {
      spend,
      impressions,
      clicks,
      conversions,
      ctr: (clicks / impressions) * 100,
      cpc: spend / clicks,
      cpm: (spend / impressions) * 1000,
      cpa: spend / conversions,
      roas: 3.7
    };
  },
  clients,
  campaigns,
  recommendations
};
