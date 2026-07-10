import { NextRequest, NextResponse } from 'next/server';
import { runAiAction, type AiIntent } from '@/services/ai-service';

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    intent: AiIntent;
    prompt: string;
    context: {
      clientId: string;
      platform: string;
      objective: string;
      budget: number;
      recentMetrics: Record<string, number>;
    };
  };

  const blocks = await runAiAction(body.intent, body.prompt, body.context);
  return NextResponse.json({ blocks, mode: 'mock' });
}
