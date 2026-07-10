import { SupermetricsAccountsResponse } from '@/types/supermetrics';

const SUPERMETRICS_BASE_URL = 'https://api.supermetrics.com';
const FACEBOOK_LOGIN_ERROR = 'You cannot access the app till you log in to www.facebook.com';
const AUTH_NOT_FOUND_ERROR = 'QUERY_AUTH_NOT_FOUND';

export interface SupermetricsServiceErrorDetails {
  status: number;
  code?: string;
  requestId?: string;
  raw?: string;
}

export class SupermetricsServiceError extends Error {
  details: SupermetricsServiceErrorDetails;

  constructor(message: string, details: SupermetricsServiceErrorDetails) {
    super(message);
    this.name = 'SupermetricsServiceError';
    this.details = details;
  }
}

function getApiKey(explicitApiKey?: string) {
  const apiKey = explicitApiKey || process.env.SUPERMETRICS_API_KEY;
  if (!apiKey) {
    throw new Error('SUPERMETRICS_API_KEY is missing. Add it to your environment variables.');
  }
  return apiKey;
}

async function parseErrorBody(response: Response) {
  const raw = await response.text();

  try {
    const payload = JSON.parse(raw) as {
      meta?: { request_id?: string };
      error?: { code?: string; message?: string; description?: string };
    };

    const description = payload.error?.description || payload.error?.message || '';
    const requestId = payload.meta?.request_id;
    const code = payload.error?.code;

    if (code === AUTH_NOT_FOUND_ERROR) {
      return new SupermetricsServiceError(
        'Não existe autenticação ativa para essa fonte de dados (ds_id) no time/token atual do Supermetrics.',
        {
          status: response.status,
          code,
          requestId,
          raw
        }
      );
    }

    if (description.includes(FACEBOOK_LOGIN_ERROR)) {
      return new SupermetricsServiceError(
        'Sua conexão Meta/Facebook no Supermetrics precisa ser reautenticada. Faça login no Facebook e reconecte a fonte no Supermetrics Hub antes de tentar novamente.',
        {
          status: response.status,
          code,
          requestId,
          raw
        }
      );
    }

    return new SupermetricsServiceError(
      `Supermetrics API error (${response.status})${description ? `: ${description}` : ''}`,
      {
        status: response.status,
        code,
        requestId,
        raw
      }
    );
  } catch {
    return new SupermetricsServiceError(`Supermetrics API error (${response.status}): ${raw}`, {
      status: response.status,
      raw
    });
  }
}

export async function getSupermetricsAccounts(dsId: string, explicitApiKey?: string) {
  const apiKey = getApiKey(explicitApiKey);
  const query = encodeURIComponent(JSON.stringify({ ds_id: dsId }));

  const response = await fetch(`${SUPERMETRICS_BASE_URL}/query/accounts?json=${query}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json'
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    throw await parseErrorBody(response);
  }

  return (await response.json()) as SupermetricsAccountsResponse;
}

interface SupermetricsField {
  field_id: string;
  field_name: string;
  field_type: 'dim' | 'met';
}

export async function getSupermetricsFields(dsId: string, explicitApiKey?: string) {
  const apiKey = getApiKey(explicitApiKey);
  const query = encodeURIComponent(JSON.stringify({ ds_id: dsId }));

  const response = await fetch(`${SUPERMETRICS_BASE_URL}/query/fields?json=${query}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json'
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    throw await parseErrorBody(response);
  }

  const payload = (await response.json()) as { data: SupermetricsField[] };
  return payload.data ?? [];
}

export async function querySupermetricsData(queryPayload: Record<string, unknown>, explicitApiKey?: string) {
  const apiKey = getApiKey(explicitApiKey);
  const query = encodeURIComponent(JSON.stringify(queryPayload));

  const response = await fetch(`${SUPERMETRICS_BASE_URL}/query/data/json?json=${query}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json'
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    throw await parseErrorBody(response);
  }

  return (await response.json()) as { data?: Record<string, unknown>[] };
}

export async function createSupermetricsLoginLink(dsId: string, explicitApiKey?: string) {
  const apiKey = getApiKey(explicitApiKey);

  const response = await fetch(`${SUPERMETRICS_BASE_URL}/ds/login/link`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ds_id: dsId,
      expiry_time: 'in 1 hour',
      description: `Fare Tessile Hub reconnect link (${dsId})`
    }),
    cache: 'no-store'
  });

  if (!response.ok) {
    throw await parseErrorBody(response);
  }

  const payload = (await response.json()) as { data?: { login_url?: string; link_id?: string } };
  return {
    loginUrl: payload.data?.login_url ?? null,
    linkId: payload.data?.link_id ?? null
  };
}
