import type { Renderer } from "../renderers.js";
import type { CheckResult } from "../types.js";

interface JsonOutput {
  verdict: string;
  experiment: string;
  objective: string;
  claim: {
    metric: string;
    direction: string;
  };
  metrics: {
    baseline: number | undefined;
    candidate: number | undefined;
  };
  failures: Array<{
    type: string;
    message: string;
    field?: string;
    baseline?: unknown;
    candidate?: unknown;
  }>;
  allowedConclusions: string[];
  disallowedConclusions: string[];
}

export class JsonRenderer implements Renderer {
  render(result: CheckResult): string {
    const output: JsonOutput = {
      verdict: result.verdict,
      experiment: result.experimentId,
      objective: result.objective,
      claim: result.claim,
      metrics: {
        baseline: result.baselineMetric,
        candidate: result.candidateMetric,
      },
      failures: result.failures.map((f) => ({
        type: f.type,
        message: f.message,
        field: f.details?.field,
        baseline: f.details?.baseline,
        candidate: f.details?.candidate,
      })),
      allowedConclusions: [],
      disallowedConclusions: [],
    };

    if (result.verdict === "INVALID") {
      output.disallowedConclusions = [
        "The candidate is better than the baseline.",
        "The intervention caused the improvement.",
        "The candidate recipe should be promoted.",
      ];
    }

    if (result.verdict === "VALID") {
      output.allowedConclusions = [
        "The required controls match and the target metric improved.",
      ];
    }

    return JSON.stringify(output, null, 2);
  }
}
