export type Direction = "increase" | "decrease";
export type RunRole = "baseline" | "candidate";
export type Stage = "smoke" | "validation" | "final";
export type RunStatus = "completed" | "failed";
export type MetricValue = string | number | boolean | null;

export interface Claim {
  text: string;
  metric: string;
  direction: Direction;
}

export interface SuccessCriteria {
  min_stage: Stage;
  require_valid_comparison: boolean;
}

export interface Experiment {
  id: string;
  objective: string;
  claim: Claim;
  baseline: {
    run: string;
  };
  candidate: {
    run: string;
  };
  required_controls: string[];
  success_criteria: SuccessCriteria;
}

export interface Provenance {
  git_commit?: string;
  git_dirty?: boolean;
  config_path?: string;
  [key: string]: unknown;
}

export interface Run {
  id: string;
  role: RunRole;
  stage: Stage;
  status: RunStatus;
  command: string;
  metrics_path: string;
  provenance?: Provenance;
}

export type Metrics = Record<string, MetricValue>;

export interface ValidationFailure {
  type: "status" | "stage" | "control" | "metric";
  message: string;
  details?: {
    field?: string;
    baseline?: unknown;
    candidate?: unknown;
  };
}

export type Verdict =
  | { kind: "VALID"; metricImproved: boolean }
  | { kind: "INVALID"; failures: ValidationFailure[] }
  | { kind: "NOT_SUPPORTED" };

export type VerdictKind = "VALID" | "INVALID" | "NOT_SUPPORTED";

export interface ClaimInfo {
  metric: string;
  direction: string;
}

export interface CheckResult {
  verdict: VerdictKind;
  experimentId: string;
  objective: string;
  claim: ClaimInfo;
  baselineMetric?: number;
  candidateMetric?: number;
  metricImproved?: boolean;
  failures: ValidationFailure[];
}
