import { AiContext } from './ai-service';

export const contextBuilder = {
  buildClientContext(context: AiContext) {
    return {
      ...context,
      timestamp: new Date().toISOString(),
      source: 'mock-data-layer'
    };
  }
};

export const recommendationEngine = {
  evaluate() {
    return ['Reallocate budget to high-efficiency segments', 'Refresh fatigued creatives', 'Check tracking consistency'];
  }
};

export const campaignGenerationEngine = {
  generateNaming(base: string) {
    return `${base.toUpperCase()}_PROSPECTING_US_Q2`;
  }
};

export const copyGenerationEngine = {
  variants(seed: string) {
    return [
      `${seed} with faster setup and measurable outcomes.`,
      `${seed} trusted by growth teams that need efficiency.`,
      `${seed} designed for performance and scale.`
    ];
  }
};

export const analyticsSummaryEngine = {
  summarize() {
    return 'Spend is scaling with stable CPR, while social TOFU requires creative refresh.';
  }
};
