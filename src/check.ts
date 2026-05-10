import path from "node:path";
import { readYaml, readJson, fileExists } from "./io.js";
import type {
  Experiment,
  Run,
  Metrics,
  ValidationFailure,
  Stage,
  CheckResult,
} from "./types.js";

export function stageRank(stage: Stage): number {
  switch (stage) {
    case "smoke":
      return 1;
    case "validation":
      return 2;
    case "final":
      return 3;
  }
}

export function checkExperiment(
  experimentId: string,
  projectRoot: string
): CheckResult {
  const expDir = path.join(projectRoot, "mlspec", "experiments", experimentId);
  const experimentPath = path.join(expDir, "experiment.yaml");

  if (!fileExists(experimentPath)) {
    return {
      verdict: "INVALID",
      experimentId,
      objective: "",
      claim: { metric: "", direction: "increase" },
      failures: [
        { type: "status", message: `Experiment not found: ${experimentId}` },
      ],
    };
  }

  const experiment = readYaml<Experiment>(experimentPath);
  const failures: ValidationFailure[] = [];

  const baselineRunDir = path.join(expDir, "runs", experiment.baseline.run);
  const candidateRunDir = path.join(expDir, "runs", experiment.candidate.run);

  const baselineRunPath = path.join(baselineRunDir, "run.yaml");
  const candidateRunPath = path.join(candidateRunDir, "run.yaml");

  if (!fileExists(baselineRunPath)) {
    return {
      verdict: "INVALID",
      experimentId,
      objective: experiment.objective,
      claim: {
        metric: experiment.claim.metric,
        direction: experiment.claim.direction,
      },
      failures: [
        {
          type: "status",
          message: `Baseline run not found: ${experiment.baseline.run}`,
        },
      ],
    };
  }

  if (!fileExists(candidateRunPath)) {
    return {
      verdict: "INVALID",
      experimentId,
      objective: experiment.objective,
      claim: {
        metric: experiment.claim.metric,
        direction: experiment.claim.direction,
      },
      failures: [
        {
          type: "status",
          message: `Candidate run not found: ${experiment.candidate.run}`,
        },
      ],
    };
  }

  const baselineRun = readYaml<Run>(baselineRunPath);
  const candidateRun = readYaml<Run>(candidateRunPath);

  // Validate run completion status
  if (baselineRun.status !== "completed") {
    failures.push({
      type: "status",
      message: `Baseline run is not completed: ${baselineRun.status}`,
    });
  }

  if (candidateRun.status !== "completed") {
    failures.push({
      type: "status",
      message: `Candidate run is not completed: ${candidateRun.status}`,
    });
  }

  // Validate minimum evidence stage
  const requiredStage = experiment.success_criteria.min_stage;

  if (stageRank(baselineRun.stage) < stageRank(requiredStage)) {
    failures.push({
      type: "stage",
      message: `Baseline evidence stage too weak: ${baselineRun.stage}, required ${requiredStage}`,
    });
  }

  if (stageRank(candidateRun.stage) < stageRank(requiredStage)) {
    failures.push({
      type: "stage",
      message: `Candidate evidence stage too weak: ${candidateRun.stage}, required ${requiredStage}`,
    });
  }

  // Load metrics
  const baselineMetricsPath = path.join(baselineRunDir, baselineRun.metrics_path);
  const candidateMetricsPath = path.join(candidateRunDir, candidateRun.metrics_path);

  if (!fileExists(baselineMetricsPath)) {
    return {
      verdict: "INVALID",
      experimentId,
      objective: experiment.objective,
      claim: {
        metric: experiment.claim.metric,
        direction: experiment.claim.direction,
      },
      failures: [
        {
          type: "metric",
          message: `Baseline metrics file not found: ${baselineMetricsPath}`,
        },
      ],
    };
  }

  if (!fileExists(candidateMetricsPath)) {
    return {
      verdict: "INVALID",
      experimentId,
      objective: experiment.objective,
      claim: {
        metric: experiment.claim.metric,
        direction: experiment.claim.direction,
      },
      failures: [
        {
          type: "metric",
          message: `Candidate metrics file not found: ${candidateMetricsPath}`,
        },
      ],
    };
  }

  const baselineMetrics = readJson<Metrics>(baselineMetricsPath);
  const candidateMetrics = readJson<Metrics>(candidateMetricsPath);

  // Validate required controls match
  for (const field of experiment.required_controls) {
    const baselineValue = baselineMetrics[field];
    const candidateValue = candidateMetrics[field];

    if (baselineValue === undefined) {
      failures.push({
        type: "control",
        message: `Baseline metrics missing required control: ${field}`,
      });
      continue;
    }

    if (candidateValue === undefined) {
      failures.push({
        type: "control",
        message: `Candidate metrics missing required control: ${field}`,
      });
      continue;
    }

    if (baselineValue !== candidateValue) {
      failures.push({
        type: "control",
        message: `Control mismatch: ${field}`,
        details: {
          field,
          baseline: baselineValue,
          candidate: candidateValue,
        },
      });
    }
  }

  // Validate metric improvement
  const metric = experiment.claim.metric;
  const baselineMetric = baselineMetrics[metric];
  const candidateMetric = candidateMetrics[metric];

  if (typeof baselineMetric !== "number") {
    failures.push({
      type: "metric",
      message: `Baseline metric is missing or non-numeric: ${metric}`,
    });
  }

  if (typeof candidateMetric !== "number") {
    failures.push({
      type: "metric",
      message: `Candidate metric is missing or non-numeric: ${metric}`,
    });
  }

  let metricImproved = false;

  if (typeof baselineMetric === "number" && typeof candidateMetric === "number") {
    metricImproved =
      experiment.claim.direction === "increase"
        ? candidateMetric > baselineMetric
        : candidateMetric < baselineMetric;
  }

  // If there are failures, return invalid
  if (failures.length > 0) {
    return {
      verdict: "INVALID",
      experimentId,
      objective: experiment.objective,
      claim: {
        metric: experiment.claim.metric,
        direction: experiment.claim.direction,
      },
      baselineMetric:
        typeof baselineMetric === "number" ? baselineMetric : undefined,
      candidateMetric:
        typeof candidateMetric === "number" ? candidateMetric : undefined,
      metricImproved,
      failures,
    };
  }

  // If metric didn't improve, return NOT_SUPPORTED
  if (!metricImproved) {
    return {
      verdict: "NOT_SUPPORTED",
      experimentId,
      objective: experiment.objective,
      claim: {
        metric: experiment.claim.metric,
        direction: experiment.claim.direction,
      },
      baselineMetric:
        typeof baselineMetric === "number" ? baselineMetric : undefined,
      candidateMetric:
        typeof candidateMetric === "number" ? candidateMetric : undefined,
      metricImproved: false,
      failures: [],
    };
  }

  // All checks passed
  return {
    verdict: "VALID",
    experimentId,
    objective: experiment.objective,
    claim: {
      metric: experiment.claim.metric,
      direction: experiment.claim.direction,
    },
    baselineMetric:
      typeof baselineMetric === "number" ? baselineMetric : undefined,
    candidateMetric:
      typeof candidateMetric === "number" ? candidateMetric : undefined,
    metricImproved: true,
    failures: [],
  };
}
