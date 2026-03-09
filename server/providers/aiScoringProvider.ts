export interface MetricsSet {
  metrics: Array<{
    metric: string;
    weight: number;
    description: string;
  }>;
}

export interface ScoreBreakdown {
  [metric: string]: {
    score: number;
    rationale: string;
  };
}

export interface ScoringResult {
  breakdown: ScoreBreakdown;
  total: number;
}

export interface AiScoringProvider {
  score(idea: any, metricsSet: MetricsSet): Promise<ScoringResult>;
}

// Mock implementation - returns deterministic scores
class MockAiScoringProvider implements AiScoringProvider {
  async score(idea: any, metricsSet: MetricsSet): Promise<ScoringResult> {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const breakdown: ScoreBreakdown = {};
    let weightedSum = 0;

    for (const metric of metricsSet.metrics) {
      // Generate deterministic score based on idea content
      const baseScore = this.generateDeterministicScore(idea.title + idea.summary, metric.metric);
      breakdown[metric.metric] = {
        score: baseScore,
        rationale: `Based on analysis of "${idea.title}", the ${metric.metric} scores ${baseScore}/100. ${metric.description}`
      };
      weightedSum += baseScore * metric.weight;
    }

    return {
      breakdown,
      total: Math.round(weightedSum)
    };
  }

  private generateDeterministicScore(text: string, metricName: string): number {
    // Simple hash function for deterministic scoring
    let hash = 0;
    const combined = text + metricName;
    for (let i = 0; i < combined.length; i++) {
      hash = ((hash << 5) - hash) + combined.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash % 41) + 60; // Score between 60-100
  }
}

export const aiScoringProvider: AiScoringProvider = new MockAiScoringProvider();
