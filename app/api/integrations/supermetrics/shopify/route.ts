import { NextRequest, NextResponse } from 'next/server';
import {
  getSupermetricsFields,
  querySupermetricsData,
  createSupermetricsLoginLink,
  SupermetricsServiceError,
} from '@/services/supermetrics-service';
import type { ShopifyFieldGap } from '@/types/shopify';

// ── Field candidates for Shopify (SHP) ───────────────────────────────────────
// Supermetrics SHP schema field names vary by account configuration; we resolve
// the best match dynamically so this works across different Shopify setups.

const DATE_CANDIDATES    = ['date_start', 'date', 'day', 'reporting starts', 'report date'];
const DATE_DISALLOW      = ['stop', 'end', 'week', 'month', 'year', 'of ', 'last', 'update'];

const STORE_CANDIDATES   = ['shop_name', 'shop name', 'store_name', 'store name', 'shop', 'store', 'account_name', 'account name', 'profile name'];

const REVENUE_CANDIDATES = [
  'total_sales', 'total sales', 'gross_sales', 'gross sales',
  'gross_revenue', 'gross revenue', 'net_revenue', 'net revenue',
  'net_sales', 'net sales', 'revenue', 'sales',
];
const REVENUE_DISALLOW   = ['per ', 'per_', 'rate', 'shipping', 'tax', 'fee', 'refund', 'return', 'discount'];

const ORDERS_CANDIDATES  = [
  'orders_count', 'orders count', 'total_orders', 'total orders',
  'number_of_orders', 'number of orders', 'order_count', 'orders',
];
const ORDERS_DISALLOW    = ['return', 'refund', 'cancel', 'average', 'value', 'rate', 'per ', 'amount', 'revenue'];

const SESSIONS_CANDIDATES = [
  'online_store_sessions', 'online store sessions',
  'total_sessions', 'total sessions', 'sessions', 'visits',
];
const SESSIONS_DISALLOW   = ['per ', 'rate', 'bounce', 'duration', 'page', 'converted'];

const AOV_CANDIDATES      = ['average_order_value', 'average order value', 'aov'];
const CONV_CANDIDATES     = ['online_store_conversion_rate', 'conversion_rate', 'conversion rate', 'cvr', 'store conversion'];

const PRODUCT_CANDIDATES  = ['product_title', 'product title', 'product_name', 'product name', 'product_type', 'product type', 'product'];
const PRODUCT_DISALLOW    = ['brand', 'vendor', 'tag', 'collection', 'category'];

const COUNTRY_CANDIDATES  = [
  'billing_country_name', 'billing country name',
  'shipping_country_name', 'shipping country name',
  'country_name', 'country', 'customer_country', 'customer country',
];

const UNITS_CANDIDATES    = ['units_sold', 'units sold', 'quantity_ordered', 'quantity ordered', 'items_sold', 'items sold', 'quantity'];

// ── Field resolution helpers ──────────────────────────────────────────────────

type Field = { field_id: string; field_name: string; field_type: 'dim' | 'met' };

function matchField(name: string, candidates: string[], disallow: string[] = []) {
  const n = name.toLowerCase();
  if (disallow.some((w) => n.includes(w))) return false;
  return candidates.some((c) => n === c || n.startsWith(c) || n.includes(c));
}

function findBest(arr: Field[], type: 'dim' | 'met', candidates: string[], disallow: string[] = []): Field | undefined {
  const allowed = arr.filter((f) => f.field_type === type && matchField(f.field_name, candidates, disallow));
  for (const pred of [
    (n: string, c: string) => n === c,
    (n: string, c: string) => n.startsWith(c),
    (n: string, c: string) => n.includes(c),
  ]) {
    const hit = allowed.find((f) => {
      const n = f.field_name.toLowerCase();
      return candidates.some((c) => pred(n, c));
    });
    if (hit) return hit;
  }
  return undefined;
}

function str(row: unknown[], i: number) { return i >= 0 ? String(row[i] ?? '') || null : null; }
function num(row: unknown[], i: number) { return i >= 0 ? Number(row[i]) || 0 : 0; }

function resolveReconnectSteps(code?: string) {
  if (code === 'QUERY_AUTH_NOT_FOUND') {
    return [
      'No Supermetrics Hub, conecte um login para Shopify (data source id: SHP).',
      'Confirme se o API token pertence ao mesmo team onde o login foi conectado.',
      'Tente novamente após reconectar.',
    ];
  }
  return [
    'Acesse o Supermetrics Hub e abra a conexão Shopify.',
    'Clique em reconnect e complete o fluxo de autorização.',
    'Tente novamente após reconectar.',
  ];
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    dsId?: string;
    loginGroups?: Array<{ dsUser: string; accountIds: string[] }>;
    accountIds?: string[];
    startDate?: string;
    endDate?: string;
    reportType?: 'timeseries' | 'products' | 'locations';
  };

  const dsId       = body.dsId ?? 'SHP';
  const reportType = body.reportType ?? 'timeseries';
  const startDate  = body.startDate ?? 'first day of this month';
  const endDate    = body.endDate   ?? 'today';

  const loginGroups: Array<{ dsUser: string | null; accountIds: string[] }> =
    body.loginGroups?.length
      ? body.loginGroups
      : [{ dsUser: null, accountIds: body.accountIds ?? [] }];

  const cleanGroups = loginGroups.map((g) => ({
    ...g,
    accountIds: g.accountIds.filter((id) => id && id.trim() !== ''),
  }));

  if (cleanGroups.every((g) => g.accountIds.length === 0 && !g.dsUser)) {
    return NextResponse.json({
      data: [],
      meta: { rowCount: 0, reportType, resolvedFields: {}, gaps: [] },
    });
  }

  try {
    const fields = await getSupermetricsFields(dsId);
    const dims   = fields.filter((f) => f.field_type === 'dim');
    const mets   = fields.filter((f) => f.field_type === 'met');

    const dateField       = findBest(dims, 'dim', DATE_CANDIDATES, DATE_DISALLOW);
    const storeField      = findBest(dims, 'dim', STORE_CANDIDATES);
    const revenueField    = findBest(mets, 'met', REVENUE_CANDIDATES, REVENUE_DISALLOW);
    const ordersField     = findBest(mets, 'met', ORDERS_CANDIDATES, ORDERS_DISALLOW);
    const sessionsField   = findBest(mets, 'met', SESSIONS_CANDIDATES, SESSIONS_DISALLOW);
    const aovField        = findBest(mets, 'met', AOV_CANDIDATES);
    const convRateField   = findBest(mets, 'met', CONV_CANDIDATES);
    const productField    = findBest(dims, 'dim', PRODUCT_CANDIDATES, PRODUCT_DISALLOW);
    const countryField    = findBest(dims, 'dim', COUNTRY_CANDIDATES);
    const unitsField      = findBest(mets, 'met', UNITS_CANDIDATES);

    // ── Field gap documentation ───────────────────────────────────────────────
    const gaps: ShopifyFieldGap[] = [];
    if (!revenueField) gaps.push({ field: 'revenue', description: 'No revenue/sales metric found in SHP schema.', suggestion: 'Expected fields: total_sales, gross_sales, net_sales, revenue.' });
    if (!ordersField)  gaps.push({ field: 'orders',  description: 'No orders count metric found.',              suggestion: 'Expected fields: orders_count, total_orders.' });
    if (!sessionsField)gaps.push({ field: 'sessions',description: 'No sessions metric found.',                  suggestion: 'Expected: online_store_sessions, sessions. May require Shopify Analytics report.' });
    if (!aovField)     gaps.push({ field: 'aov',     description: 'No AOV metric found — will compute from revenue/orders.', suggestion: 'Expected: average_order_value. Will fallback to revenue÷orders.' });
    if (!convRateField)gaps.push({ field: 'conversionRate', description: 'No conversion rate metric found.', suggestion: 'Expected: online_store_conversion_rate, conversion_rate.' });

    if (reportType === 'products' && !productField) {
      gaps.push({ field: 'product', description: 'No product dimension found in SHP schema.', suggestion: 'Expected: product_title, product_name. Ensure you have a product-level report available in Supermetrics.' });
    }
    if (reportType === 'locations' && !countryField) {
      gaps.push({ field: 'country', description: 'No country/location dimension found.', suggestion: 'Expected: billing_country_name, country. Ensure your Shopify plan includes geographic data.' });
    }

    // ── Build field list for this report type ────────────────────────────────
    let dimFields: (Field | undefined)[] = [];
    let metFields: (Field | undefined)[] = [];

    if (reportType === 'timeseries') {
      if (!dateField) {
        return NextResponse.json({ message: 'Could not resolve date dimension for SHP.', code: 'DATE_FIELD_NOT_FOUND' }, { status: 500 });
      }
      dimFields = [dateField, storeField];
      metFields = [revenueField, ordersField, sessionsField, aovField, convRateField];
    } else if (reportType === 'products') {
      if (!productField) {
        return NextResponse.json({ message: 'Could not resolve product dimension for SHP.', code: 'PRODUCT_FIELD_NOT_FOUND', gaps }, { status: 400 });
      }
      dimFields = [productField, storeField];
      metFields = [revenueField, ordersField, unitsField];
    } else {
      // locations
      if (!countryField) {
        return NextResponse.json({ message: 'Could not resolve country dimension for SHP.', code: 'COUNTRY_FIELD_NOT_FOUND', gaps }, { status: 400 });
      }
      dimFields = [countryField, storeField];
      metFields = [revenueField, ordersField];
    }

    const fieldIds = [...dimFields, ...metFields]
      .filter((f): f is Field => !!f)
      .map((f) => f.field_id);

    if (!revenueField && !ordersField) {
      return NextResponse.json({ message: 'Could not resolve any e-commerce metric for SHP.', code: 'NO_METRICS_FOUND', gaps }, { status: 500 });
    }

    // ── Query each login group ────────────────────────────────────────────────
    const queryResults = await Promise.all(
      cleanGroups
        .filter((g) => g.accountIds.length > 0 || g.dsUser)
        .map((group) => {
          const payload: Record<string, unknown> = {
            ds_id:           dsId,
            fields:          fieldIds,
            date_range_type: 'custom',
            start_date:      startDate,
            end_date:        endDate,
            max_rows:        50_000,
          };
          if (group.accountIds.length > 0) payload.ds_accounts = group.accountIds;
          if (group.dsUser) payload.ds_user = group.dsUser;
          return querySupermetricsData(payload);
        })
    );

    // ── Normalize rows ────────────────────────────────────────────────────────
    const resolvedFields = {
      date:       dateField    ? { id: dateField.field_id,    name: dateField.field_name }    : null,
      store:      storeField   ? { id: storeField.field_id,   name: storeField.field_name }   : null,
      revenue:    revenueField ? { id: revenueField.field_id, name: revenueField.field_name } : null,
      orders:     ordersField  ? { id: ordersField.field_id,  name: ordersField.field_name }  : null,
      sessions:   sessionsField? { id: sessionsField.field_id,name: sessionsField.field_name }: null,
      aov:        aovField     ? { id: aovField.field_id,     name: aovField.field_name }     : null,
      convRate:   convRateField? { id: convRateField.field_id,name: convRateField.field_name }: null,
      product:    productField ? { id: productField.field_id, name: productField.field_name } : null,
      country:    countryField ? { id: countryField.field_id, name: countryField.field_name } : null,
      unitsSold:  unitsField   ? { id: unitsField.field_id,   name: unitsField.field_name }   : null,
    };

    const allData: unknown[] = [];

    for (const response of queryResults) {
      const rawRows   = (response.data ?? []) as unknown as unknown[][];
      const headerRow = Array.isArray(rawRows[0]) ? (rawRows[0] as string[]) : [];
      const dataRows  = headerRow.length > 0 ? rawRows.slice(1) : rawRows;

      const col = (candidates: string[], disallow: string[] = []) =>
        headerRow.findIndex((h) => matchField(h, candidates, disallow));

      if (reportType === 'timeseries') {
        const iDate    = col(DATE_CANDIDATES, DATE_DISALLOW);
        const iStore   = col(STORE_CANDIDATES);
        const iRev     = col(REVENUE_CANDIDATES, REVENUE_DISALLOW);
        const iOrd     = col(ORDERS_CANDIDATES, ORDERS_DISALLOW);
        const iSes     = col(SESSIONS_CANDIDATES, SESSIONS_DISALLOW);
        const iAov     = col(AOV_CANDIDATES);
        const iConv    = col(CONV_CANDIDATES);

        for (const row of dataRows) {
          const r = row as unknown[];
          const revenue = num(r, iRev);
          const orders  = num(r, iOrd);
          const aov     = iAov >= 0 ? num(r, iAov) : (orders > 0 ? revenue / orders : 0);
          allData.push({
            date:           str(r, iDate),
            storeName:      str(r, iStore),
            revenue,
            orders,
            sessions:       num(r, iSes),
            aov,
            conversionRate: num(r, iConv),
          });
        }
      } else if (reportType === 'products') {
        const iProd  = col(PRODUCT_CANDIDATES, PRODUCT_DISALLOW);
        const iStore = col(STORE_CANDIDATES);
        const iRev   = col(REVENUE_CANDIDATES, REVENUE_DISALLOW);
        const iOrd   = col(ORDERS_CANDIDATES, ORDERS_DISALLOW);
        const iUnits = col(UNITS_CANDIDATES);

        for (const row of dataRows) {
          const r = row as unknown[];
          allData.push({
            product:   str(r, iProd),
            storeName: str(r, iStore),
            revenue:   num(r, iRev),
            orders:    num(r, iOrd),
            unitsSold: num(r, iUnits),
          });
        }
      } else {
        // locations
        const iCountry = col(COUNTRY_CANDIDATES);
        const iStore   = col(STORE_CANDIDATES);
        const iRev     = col(REVENUE_CANDIDATES, REVENUE_DISALLOW);
        const iOrd     = col(ORDERS_CANDIDATES, ORDERS_DISALLOW);

        for (const row of dataRows) {
          const r = row as unknown[];
          allData.push({
            country:   str(r, iCountry),
            storeName: str(r, iStore),
            revenue:   num(r, iRev),
            orders:    num(r, iOrd),
          });
        }
      }
    }

    return NextResponse.json({
      data: allData,
      meta: { rowCount: allData.length, reportType, resolvedFields, gaps },
    });
  } catch (error) {
    if (error instanceof SupermetricsServiceError) {
      let loginUrl: string | null = null;
      if (error.details.code === 'QUERY_AUTH_NOT_FOUND' || error.details.code === 'QUERY_AUTH_LOGIN_FAILED') {
        try { loginUrl = (await createSupermetricsLoginLink(dsId)).loginUrl; } catch { loginUrl = null; }
      }
      return NextResponse.json(
        { message: error.message, code: error.details.code, reconnectSteps: resolveReconnectSteps(error.details.code), loginUrl },
        { status: error.details.status }
      );
    }
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to fetch Shopify data.' },
      { status: 500 }
    );
  }
}
