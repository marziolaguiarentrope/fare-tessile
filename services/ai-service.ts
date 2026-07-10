export type AiIntent =
  | 'campaign_generation'
  | 'copy_generation'
  | 'budget_recommendation'
  | 'performance_analysis'
  | 'tracking_diagnosis';

export interface AiContext {
  clientId: string;
  platform: string;
  objective: string;
  budget: number;
  recentMetrics: Record<string, number>;
}

export interface AiResponseBlock {
  title: string;
  bullets: string[];
  actionPreview?: string;
}

export interface AiProvider {
  complete(prompt: string, context: AiContext): Promise<AiResponseBlock[]>;
}

class MockAiProvider implements AiProvider {
  async complete(prompt: string, context: AiContext) {
    return [
      {
        title: 'Operational summary',
        bullets: [
          `Prompt mapped to ${context.platform} workflow with objective ${context.objective}.`,
          `Budget envelope analyzed at ${context.budget.toLocaleString('en-US')} USD monthly.`,
          'Priority recommendation: rebalance 12% from low-efficiency ad sets into high-intent segments.'
        ]
      },
      {
        title: 'Action preview (simulated)',
        bullets: ['Create 1 campaign, 3 ad sets, 8 ad variants.', 'Attach naming schema and UTM pattern validation.'],
        actionPreview: `Dry-run executed for prompt: ${prompt}`
      }
    ];
  }
}

export const aiProviders = {
  mock: new MockAiProvider()
};

export const promptTemplates = {
  campaign_generation: 'Generate campaign architecture with budget split and test plan.',
  copy_generation: 'Generate high-performing copy variants with funnel-aware angles.',
  budget_recommendation: 'Recommend budget pacing adjustments for next seven days.',
  performance_analysis: 'Explain root causes behind KPI changes and propose actions.',
  tracking_diagnosis: 'Diagnose tracking quality and naming consistency issues.'
} satisfies Record<AiIntent, string>;

export async function runAiAction(intent: AiIntent, prompt: string, context: AiContext) {
  const finalPrompt = `${promptTemplates[intent]}\nUser request: ${prompt}`;
  return aiProviders.mock.complete(finalPrompt, context);
}
