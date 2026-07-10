// ── Shopify / Supermetrics SHP types ─────────────────────────────────────────

export type ShopifyTimeSeriesRow = {
  date: string | null;
  storeName: string | null;
  revenue: number;
  orders: number;
  sessions: number;
  /** Average Order Value — may be 0 if not available from Supermetrics (compute = revenue/orders client-side) */
  aov: number;
  /** Raw decimal, e.g. 0.032 = 3.2%. Multiply ×100 for display. May be 0 if not available. */
  conversionRate: number;
};

export type ShopifyProductRow = {
  product: string | null;
  storeName: string | null;
  revenue: number;
  orders: number;
  unitsSold: number;
};

export type ShopifyLocationRow = {
  country: string | null;
  storeName: string | null;
  revenue: number;
  orders: number;
};

/** A field that Supermetrics could not resolve from the SHP schema. */
export interface ShopifyFieldGap {
  field: string;
  description: string;
  suggestion: string;
}

export interface ShopifyQueryMeta {
  rowCount: number;
  reportType: 'timeseries' | 'products' | 'locations';
  resolvedFields: Record<string, { id: string; name: string } | null>;
  gaps: ShopifyFieldGap[];
}

export interface ShopifyTimeSeriesResponse {
  data: ShopifyTimeSeriesRow[];
  meta: ShopifyQueryMeta;
}

export interface ShopifyProductsResponse {
  data: ShopifyProductRow[];
  meta: ShopifyQueryMeta;
}

export interface ShopifyLocationsResponse {
  data: ShopifyLocationRow[];
  meta: ShopifyQueryMeta;
}
