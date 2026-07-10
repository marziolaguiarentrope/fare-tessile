import { NextRequest, NextResponse } from 'next/server';
import {
  createSupermetricsLoginLink,
  getSupermetricsFields,
  querySupermetricsData,
  SupermetricsServiceError
} from '@/services/supermetrics-service';
import { SupermetricsCampaignRow } from '@/types/supermetrics';

const FIELD_CANDIDATES = {
  date:             ['date', 'day', 'report date', 'reporting starts'],
  campaignName:     ['campaign_name', 'campaign', 'campaign title'],
  adGroupName:      ['ad set name', 'ad group name', 'adset_name', 'adgroup_name'],
  adName:           ['ad name', 'creative name', 'ad_title'],
  accountName:      ['account_name', 'account name'],
  objective:        ['campaign objective', 'objective', 'optimization goal'],
  impressions:      ['impressions'],
  reach:            ['reach'],
  frequency:        ['frequency'],
  clicks:           ['clicks', 'link clicks'],
  landingPageViews: ['landing page views', 'landing_page_views'],
  spend:            ['spend', 'cost'],
  leads:            ['leads', 'lead'],
  purchases:        ['purchases', 'purchase'],
  results:          ['results', 'conversions'],
  videoViews:       ['video views', 'thruplay', '3-second video views', 'video_views'],
  cpc:              ['cpc', 'cost per click', 'cost per link click'],
  ctr:              ['ctr', 'click through rate', 'click-through rate'],
  cpm:              ['cpm', 'cost per thousand', 'cost per 1,000'],
  roas:             ['roas', 'return on ad spend', 'purchase roas'],
  cpr:              ['cost per result', 'cost/result', 'cpa'],
} as const;

function resolveReconnectSteps(code?: string) {
  if (code === 'QUERY_AUTH_NOT_FOUND') {
    return [
      'No Supermetrics Hub, conecte pelo menos um login para essa fonte (ex.: Meta Ads/FA).',
      'Confirme se o token/API key pertence ao mesmo team onde o login foi conectado.',
      'Valide se o dsId usado na tela está correto (FA para Meta Ads, AW para Google Ads).',
      'Depois disso, rode a consulta novamente.'
    ];
  }
  return [
    'Acesse o Supermetrics Hub e abra a conexão da fonte Meta/Facebook.',
    'Clique em reconnect/re-authenticate e finalize o login no Facebook.',
    'Confirme permissões de contas/ativos e rode a consulta novamente.'
  ];
}

function matchField(fieldName: string, candidates: string[], disallow: string[] = []) {
  const normalized = fieldName.toLowerCase();
  if (disallow.some((word) => normalized.includes(word))) return false;
  return candidates.some((c) => normalized === c || normalized.includes(c));
}

function resolveFieldMap(fields: Array<{ field_id: string; field_name: string; field_type: 'dim' | 'met' }>) {
  const find = (key: keyof typeof FIELD_CANDIDATES, type: 'dim' | 'met', disallow: string[] = []) =>
    fields.find((f) => f.field_type === type && matchField(f.field_name, [...FIELD_CANDIDATES[key]], disallow))?.field_id;

  return {
    date:             find('date', 'dim'),
    campaignName:     find('campaignName', 'dim'),
    adGroupName:      find('adGroupName', 'dim'),
    adName:           find('adName', 'dim'),
    accountName:      find('accountName', 'dim'),
    objective:        find('objective', 'dim'),
    impressions:      find('impressions', 'met'),
    reach:            find('reach', 'met'),
    frequency:        find('frequency', 'met'),
    clicks:           find('clicks', 'met'),
    landingPageViews: find('landingPageViews', 'met'),
    spend:            find('spend', 'met'),
    leads:            find('leads', 'met', ['id']),
    purchases:        find('purchases', 'met', ['id', 'roas']),
    results:          find('results', 'met', ['id', 'cost', 'per', 'rate']),
    videoViews:       find('videoViews', 'met'),
    cpc:              find('cpc', 'met'),
    ctr:              find('ctr', 'met'),
    cpm:              find('cpm', 'met'),
    roas:             find('roas', 'met'),
    cpr:              find('cpr', 'met'),
  };
}

function resolveDateRange(input: {
  dateRangeType?: string;
  dateRangeValue?: number;
  startDate?: string;
  endDate?: string;
}) {
  const type = input.dateRangeType ?? 'last_x_days';
  const value = input.dateRangeValue ?? 30;
  if (type === 'custom')         return { start_date: input.startDate ?? '30daysAgo', end_date: input.endDate ?? 'yesterday' };
  if (type === 'last_x_days')    return { start_date: `-${value} days`, end_date: 'yesterday' };
  if (type === 'last_x_days_inc')return { start_date: `-${value} days`, end_date: 'today' };
  if (type === 'this_month')     return { start_date: 'first day of this month', end_date: 'yesterday' };
  if (type === 'this_month_inc') return { start_date: 'first day of this month', end_date: 'today' };
  if (type === 'last_month')     return { start_date: 'first day of previous month', end_date: 'last day of previous month' };
  if (type === 'yesterday')      return { start_date: 'yesterday', end_date: 'yesterday' };
  return { start_date: `-${value} days`, end_date: 'yesterday' };
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    dsId?: string;
    accountIds?: string[];
    startDate?: string;
    endDate?: string;
    dateRangeType?: string;
    dateRangeValue?: number;
    breakdown?: 'none' | 'day' | 'week' | 'month';
  };

  const dsId = body.dsId ?? 'FA';
  const accountIds = body.accountIds ?? [];
  const breakdown = body.breakdown ?? 'none';

  if (accountIds.length === 0) {
    return NextResponse.json({ data: [], breakdown });
  }

  try {
    const fieldSchema = await getSupermetricsFields(dsId);
    const fieldMap = resolveFieldMap(fieldSchema);

    // Include date dimension only when a date breakdown is requested
    const resolvedFields = (Object.entries(fieldMap) as [string, string | undefined][])
      .filter(([key, id]) => {
        if (!id) return false;
        if (key === 'date' && breakdown === 'none') return false;
        return true;
      }) as [string, string][];

    if (!resolvedFields.length) {
      throw new Error('Could not resolve campaign fields from Supermetrics schema.');
    }

    const fieldIds = resolvedFields.map(([, id]) => id);
    const dateRange = resolveDateRange(body);

    const queryPayload: Record<string, unknown> = {
      ds_id: dsId,
      ds_accounts: accountIds,
      fields: fieldIds,
      start_date: dateRange.start_date,
      end_date: dateRange.end_date,
    };

    const response = await querySupermetricsData(queryPayload);
    const rawRows = (response.data ?? []) as unknown as unknown[][];

    // Row 0 = display-name headers; rows 1..n = data
    const headerRow = Array.isArray(rawRows[0]) ? (rawRows[0] as string[]) : [];
    const dataRows  = headerRow.length > 0 ? rawRows.slice(1) : rawRows;

    const col = (key: keyof typeof FIELD_CANDIDATES, disallow: string[] = []) =>
      headerRow.findIndex((h) => matchField(h, [...FIELD_CANDIDATES[key]], disallow));

    const idx = {
      date:             col('date'),
      campaignName:     col('campaignName'),
      adGroupName:      col('adGroupName'),
      adName:           col('adName'),
      accountName:      col('accountName'),
      objective:        col('objective'),
      impressions:      col('impressions'),
      reach:            col('reach'),
      frequency:        col('frequency'),
      clicks:           col('clicks'),
      landingPageViews: col('landingPageViews'),
      spend:            col('spend'),
      leads:            col('leads',     ['id']),
      purchases:        col('purchases', ['id', 'roas']),
      results:          col('results',   ['id', 'cost', 'per', 'rate']),
      videoViews:       col('videoViews'),
      cpc:              col('cpc'),
      ctr:              col('ctr'),
      cpm:              col('cpm'),
      roas:             col('roas'),
      cpr:              col('cpr'),
    };

    const str = (row: unknown[], i: number) => i >= 0 ? ((row[i] as string) ?? null) : null;
    const num = (row: unknown[], i: number) => i >= 0 ? Number(row[i]) || 0 : 0;

    const normalized: SupermetricsCampaignRow[] = dataRows.map((row) => {
      const r = row as unknown[];
      const impressions = num(r, idx.impressions);
      const clicks      = num(r, idx.clicks);
      const spend       = num(r, idx.spend);
      const results     = num(r, idx.results);
      const reach       = num(r, idx.reach);
      return {
        date:             str(r, idx.date),
        accountName:      str(r, idx.accountName),
        campaignName:     str(r, idx.campaignName),
        adGroupName:      str(r, idx.adGroupName),
        adName:           str(r, idx.adName),
        objective:        str(r, idx.objective),
        impressions,
        reach,
        frequency:        num(r, idx.frequency),
        clicks,
        landingPageViews: num(r, idx.landingPageViews),
        spend,
        leads:            num(r, idx.leads),
        purchases:        num(r, idx.purchases),
        results,
        videoViews:       num(r, idx.videoViews),
        // CTR stored as raw decimal (e.g. 0.0497). Multiply ×100 for display.
        ctr:              num(r, idx.ctr),
        cpc:              num(r, idx.cpc),
        cpm:              num(r, idx.cpm),
        roas:             num(r, idx.roas),
        cpr:              results > 0 ? spend / results : num(r, idx.cpr),
      };
    });

    return NextResponse.json({ data: normalized, breakdown });
  } catch (error) {
    if (error instanceof SupermetricsServiceError) {
      let loginUrl: string | null = null;
      if (error.details.code === 'QUERY_AUTH_NOT_FOUND' || error.details.code === 'QUERY_AUTH_LOGIN_FAILED') {
        try { loginUrl = (await createSupermetricsLoginLink(dsId)).loginUrl; } catch { loginUrl = null; }
      }
      return NextResponse.json(
        { message: error.message, code: error.details.code, requestId: error.details.requestId, reconnectSteps: resolveReconnectSteps(error.details.code), loginUrl },
        { status: error.details.status }
      );
    }
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to fetch campaign metrics.' },
      { status: 500 }
    );
  }
}
