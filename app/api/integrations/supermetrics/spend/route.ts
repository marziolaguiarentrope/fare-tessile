import { NextRequest, NextResponse } from 'next/server';
import {
  getSupermetricsFields,
  querySupermetricsData,
  createSupermetricsLoginLink,
  SupermetricsServiceError,
} from '@/services/supermetrics-service';

const DATE_CANDIDATES    = ['date_start', 'date', 'report date', 'reporting starts'];
const DATE_DISALLOW      = ['stop', 'end', 'week', 'month', 'year', 'of ', 'last', 'update'];
const ACCOUNT_CANDIDATES = ['account_name', 'account name', 'shop name', 'store name', 'shop', 'store', 'profile name'];
const SPEND_CANDIDATES   = ['spend', 'cost'];
const SPEND_DISALLOW     = ['social', 'per ', 'per_', 'roas', 'return', 'rate', 'cpc', 'cpm', 'cpa', 'ctr', 'video', 'mobile', 'canvas', 'desktop'];

const IMPRESSIONS_CANDIDATES = ['impressions', 'impr'];
const IMPRESSIONS_DISALLOW   = ['unique', 'per '];
const CLICKS_CANDIDATES      = ['clicks', 'link clicks', 'link_clicks'];
const CLICKS_DISALLOW        = ['unique', 'outbound', 'per ', 'button', 'post'];

const ORDERS_CANDIDATES   = ['orders', 'total orders', 'number of orders', 'order count', 'sessions converted'];
const ORDERS_DISALLOW     = ['return', 'refund', 'cancel', 'average', 'value', 'rate', 'per ', 'amount'];
const SESSIONS_CANDIDATES = ['sessions', 'total sessions', 'visits', 'unique sessions', 'online store sessions'];
const SESSIONS_DISALLOW   = ['per ', 'rate', 'bounce', 'duration', 'page', 'converted'];

function matchField(name: string, candidates: string[], disallow: string[] = []) {
  const n = name.toLowerCase();
  if (disallow.some((w) => n.includes(w))) return false;
  return candidates.some((c) => n === c || n.startsWith(c) || n.includes(c));
}

/** Like Array.find but returns the best match by specificity: exact > startsWith > includes. */
function findBest<T>(
  arr: T[],
  getName: (item: T) => string,
  candidates: string[],
  disallow: string[] = [],
): T | undefined {
  const allowed = arr.filter((item) => matchField(getName(item), candidates, disallow));
  for (const pred of [
    (n: string, c: string) => n === c,
    (n: string, c: string) => n.startsWith(c),
    (n: string, c: string) => n.includes(c),
  ]) {
    const hit = allowed.find((item) => {
      const n = getName(item).toLowerCase();
      return candidates.some((c) => pred(n, c));
    });
    if (hit) return hit;
  }
  return undefined;
}

function resolveReconnectSteps(code?: string) {
  if (code === 'QUERY_AUTH_NOT_FOUND') {
    return [
      'Open Supermetrics Hub and connect a login for this data source.',
      'Confirm the token belongs to the same team where the login was connected.',
      'Re-run the query after reconnecting.',
    ];
  }
  return [
    'Open Supermetrics Hub and reconnect the Meta/Facebook source.',
    'Click reconnect/re-authenticate and complete the Facebook login.',
    'Re-run the query after reconnecting.',
  ];
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    dsId?: string;
    loginGroups?: Array<{ dsUser: string; accountIds: string[] }>;
    accountIds?: string[];
    startDate?: string;
    endDate?: string;
    metricCandidates?: string[];
    metricDisallow?: string[];
  };

  const dsId      = body.dsId ?? 'FA';
  const startDate = body.startDate ?? 'first day of this month';
  const endDate   = body.endDate   ?? 'today';

  const effectiveMetricCandidates = body.metricCandidates?.length ? body.metricCandidates : SPEND_CANDIDATES;
  const effectiveMetricDisallow   = body.metricDisallow            ? body.metricDisallow   : SPEND_DISALLOW;

  const loginGroups: Array<{ dsUser: string | null; accountIds: string[] }> =
    body.loginGroups?.length
      ? body.loginGroups
      : [{ dsUser: null, accountIds: body.accountIds ?? [] }];

  // Strip empty/blank account IDs (some platforms like HubSpot return "" as account_id)
  const cleanGroups = loginGroups.map((g) => ({
    ...g,
    accountIds: g.accountIds.filter((id) => id && id.trim() !== ''),
  }));

  // Only skip if nothing useful to query (no valid accounts AND no ds_user)
  if (cleanGroups.every((g) => g.accountIds.length === 0 && !g.dsUser)) {
    return NextResponse.json({ data: [], meta: { rowCount: 0, queries: 0 } });
  }

  try {
    const fields = await getSupermetricsFields(dsId);

    const dims = fields.filter((f) => f.field_type === 'dim');
    const mets = fields.filter((f) => f.field_type === 'met');
    const findDim = (candidates: string[], disallow: string[] = []) =>
      findBest(dims, (f) => f.field_name, candidates, disallow);
    const findMet = (candidates: string[], disallow: string[] = []) =>
      findBest(mets, (f) => f.field_name, candidates, disallow);

    const dateField        = findDim(DATE_CANDIDATES, DATE_DISALLOW);
    const accountField     = findDim(ACCOUNT_CANDIDATES);
    const spendField       = findMet(effectiveMetricCandidates, effectiveMetricDisallow);
    const impressionsField = findMet(IMPRESSIONS_CANDIDATES, IMPRESSIONS_DISALLOW);
    const clicksField      = findMet(CLICKS_CANDIDATES, CLICKS_DISALLOW);
    const ordersField      = findMet(ORDERS_CANDIDATES, ORDERS_DISALLOW);
    const sessionsField    = findMet(SESSIONS_CANDIDATES, SESSIONS_DISALLOW);

    if (!dateField) {
      const dimNames = fields.filter((f) => f.field_type === 'dim').map((f) => f.field_name).slice(0, 30);
      return NextResponse.json({
        message: `Could not resolve a date dimension for "${dsId}". Available dimensions: ${dimNames.join(', ')}`,
        code: 'DATE_FIELD_NOT_FOUND',
      }, { status: 500 });
    }

    if (!spendField) {
      return NextResponse.json({
        message: `Could not resolve a spend/cost metric for "${dsId}".`,
        code: 'SPEND_FIELD_NOT_FOUND',
      }, { status: 500 });
    }

    const fieldIds = [
      dateField.field_id,
      accountField?.field_id,
      spendField.field_id,
      impressionsField?.field_id,
      clicksField?.field_id,
      ordersField?.field_id,
      sessionsField?.field_id,
    ].filter(Boolean) as string[];

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
            max_rows:        100_000,
          };
          // Only pass ds_accounts when we have valid IDs — platforms like HubSpot
          // scope data to the connected portal via ds_user alone.
          if (group.accountIds.length > 0) payload.ds_accounts = group.accountIds;
          if (group.dsUser) payload.ds_user = group.dsUser;
          return querySupermetricsData(payload);
        })
    );

    const str = (row: unknown[], i: number) => i >= 0 ? String(row[i] ?? '') || null : null;
    const num = (row: unknown[], i: number) => i >= 0 ? Number(row[i]) || 0 : 0;

    const allNormalized: {
      date: string | null;
      accountName: string | null;
      spend: number;
      impressions: number;
      clicks: number;
      orders: number;
      sessions: number;
    }[] = [];

    for (const response of queryResults) {
      const rawRows   = (response.data ?? []) as unknown as unknown[][];
      const headerRow = Array.isArray(rawRows[0]) ? (rawRows[0] as string[]) : [];
      const dataRows  = headerRow.length > 0 ? rawRows.slice(1) : rawRows;

      const idxDate        = headerRow.findIndex((h) => matchField(h, DATE_CANDIDATES, DATE_DISALLOW));
      const idxAccount     = headerRow.findIndex((h) => matchField(h, ACCOUNT_CANDIDATES));
      const idxSpend       = headerRow.findIndex((h) => matchField(h, effectiveMetricCandidates, effectiveMetricDisallow));
      const idxImpressions = headerRow.findIndex((h) => matchField(h, IMPRESSIONS_CANDIDATES, IMPRESSIONS_DISALLOW));
      const idxClicks      = headerRow.findIndex((h) => matchField(h, CLICKS_CANDIDATES, CLICKS_DISALLOW));
      const idxOrders      = headerRow.findIndex((h) => matchField(h, ORDERS_CANDIDATES, ORDERS_DISALLOW));
      const idxSessions    = headerRow.findIndex((h) => matchField(h, SESSIONS_CANDIDATES, SESSIONS_DISALLOW));

      for (const row of dataRows) {
        const r = row as unknown[];
        allNormalized.push({
          date:        str(r, idxDate),
          accountName: str(r, idxAccount),
          spend:       num(r, idxSpend),
          impressions: num(r, idxImpressions),
          clicks:      num(r, idxClicks),
          orders:      num(r, idxOrders),
          sessions:    num(r, idxSessions),
        });
      }
    }

    return NextResponse.json({
      data: allNormalized,
      meta: {
        rowCount:       allNormalized.length,
        queries:        queryResults.length,
        resolvedFields: {
          date:        { id: dateField.field_id,    name: dateField.field_name },
          account:     accountField     ? { id: accountField.field_id,     name: accountField.field_name }     : null,
          spend:       { id: spendField.field_id,   name: spendField.field_name },
          impressions: impressionsField ? { id: impressionsField.field_id, name: impressionsField.field_name } : null,
          clicks:      clicksField      ? { id: clicksField.field_id,      name: clicksField.field_name }      : null,
          orders:      ordersField      ? { id: ordersField.field_id,      name: ordersField.field_name }      : null,
          sessions:    sessionsField    ? { id: sessionsField.field_id,    name: sessionsField.field_name }    : null,
        },
      },
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
      { message: error instanceof Error ? error.message : 'Failed to fetch spend data.' },
      { status: 500 }
    );
  }
}
