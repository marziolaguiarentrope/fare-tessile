import { NextRequest, NextResponse } from 'next/server';
import { createSupermetricsLoginLink, getSupermetricsAccounts, SupermetricsServiceError } from '@/services/supermetrics-service';

function resolveReconnectSteps(code?: string) {
  if (code === 'QUERY_AUTH_NOT_FOUND') {
    return [
      'No Supermetrics Hub, conecte pelo menos um login para essa fonte (ex.: Meta Ads/FA).',
      'Confirme se o token/API key pertence ao mesmo team onde o login foi conectado.',
      'Valide se o dsId usado na tela está correto (FA para Meta Ads, AW para Google Ads).',
      'Depois disso, rode o sync novamente.'
    ];
  }

  return [
    'Acesse o Supermetrics Hub e abra a conexão da fonte Meta/Facebook.',
    'Clique em reconnect/re-authenticate e finalize o login no Facebook.',
    'Confirme permissões de contas/ativos e volte para tentar novamente.'
  ];
}

export async function GET(req: NextRequest) {
  const dsId = req.nextUrl.searchParams.get('dsId') ?? 'FA';
  console.info('[API] /supermetrics/accounts request', { dsId });

  try {
    const payload = await getSupermetricsAccounts(dsId);
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof SupermetricsServiceError) {
      let loginUrl: string | null = null;

      if (error.details.code === 'QUERY_AUTH_NOT_FOUND' || error.details.code === 'QUERY_AUTH_LOGIN_FAILED') {
        try {
          const link = await createSupermetricsLoginLink(dsId);
          loginUrl = link.loginUrl;
        } catch {
          loginUrl = null;
        }
      }

      return NextResponse.json(
        {
          message: error.message,
          code: error.details.code,
          requestId: error.details.requestId,
          reconnectSteps: resolveReconnectSteps(error.details.code),
          loginUrl
        },
        { status: error.details.status }
      );
    }

    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : 'Failed to query Supermetrics accounts'
      },
      { status: 500 }
    );
  }
}
