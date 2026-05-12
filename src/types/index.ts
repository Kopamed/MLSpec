// Core identifier type
export type Id = string;

// =============================================================================
// Custom Errors
// =============================================================================

export class DecisionValidationError extends Error {
  constructor(
    message: string,
    public code: string,
    public blocking_invariants: string[] = [],
    public suggested_next_actions: string[] = [],
    public data: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = "DecisionValidationError";
  }
}

// =============================================================================
// Enums
// =============================================================================

export type CaseMode = "scratch" | "structured" | "decision";
export type CaseStatus = "proposed" | "ready" | "running" | "observed" | "resolved" | "reopened" | "archived";

export type RunKind = "smoke" | "proxy" | "full" | "replication";
export type RunStatus = "planned" | "queued" | "running" | "completed" | "failed" | "aborted";

export type DeviationSeverity = "minor" | "material" | "fatal";
export type DeviationImpact = "none" | "weakens" | "invalidates";

export type EvidenceGrade = "smoke" | "proxy" | "partial" | "decision_grade" | "replicated" | "invalid";
export type ProtocolSatisfied = "yes" | "partial" | "no";

export type DecisionStatus = "accept" | "reject" | "inconclusive" | "rerun" | "archive";

export type AuditSeverity = "pass" | "warning" | "fail";

// =============================================================================
// Resource Budget
// =============================================================================

export interface ResourceBudget {
  gpu_hours: number;
  wallclock_hours: number;
  data_fraction: number; // 0..1
  seeds: number;
  epochs: number;
  accelerator_type?: string;
  peak_vram_gb?: number;
  num_devices?: number;
}

// =============================================================================
// Core Nouns
// =============================================================================

export interface Case {
  id: Id;
  question: string;
  mode: CaseMode;
  status: CaseStatus;
  current_protocol_id?: Id;
  owner_refs: string[];
  tags: string[];
  actor_ref: string;
  created_at: string;
}

export interface MetricSpec {
  name: string;
  direction: "max" | "min";
  split: string;
}

export interface Protocol {
  id: Id;
  case_id: Id;
  version: number;
  objective: string;
  baseline_spec?: string;
  dataset_specs: string[];
  metric_spec: MetricSpec;
  required_resources: ResourceBudget;
  min_decision_grade: "decision_grade" | "replicated";
  acceptance_rule?: string;
  locked_at?: string;
}

export interface Snapshot {
  id: Id;
  case_id: Id;
  commit_hash?: string;
  dirty_tree: boolean;
  diff_digest?: string;
  config_digests: string[];
  dataset_digests: string[];
  split_manifest_digest?: string;
  evaluator_digest?: string;
  environment_digest?: string;
  actor_ref: string;
  created_at: string;
}

export interface Run {
  id: Id;
  case_id: Id;
  protocol_id?: Id;
  snapshot_id?: Id;
  kind: RunKind;
  status: RunStatus;
  command: string[];
  tracker_refs: string[];
  commit_hash?: string;
  environment_digest?: string;
  input_artifact_refs: string[];
  actual_resources?: ResourceBudget;
  output_refs: string[];
  interrupt_reason?: string;
  started_at?: string;
  ended_at?: string;
}

export interface Deviation {
  id: Id;
  run_id: Id;
  category: string;
  description: string;
  severity: DeviationSeverity;
  impact: DeviationImpact;
  declared_by_actor_ref: string;
  resolved: boolean;
}

export interface MetricResult {
  name: string;
  split: string;
  value: number;
  dispersion?: number;
  seed?: number;
}

export interface Evidence {
  id: Id;
  case_id: Id;
  run_ids: Id[];
  metrics: MetricResult[];
  grade: EvidenceGrade;
  protocol_satisfied: ProtocolSatisfied;
  baseline_run_ids?: Id[];
  deviation_ids: Id[];
  summary: string;
}

export interface Claim {
  id: Id;
  case_id: Id;
  statement: string;
  scope: string;
  comparator?: string;
  expected_direction?: "max" | "min";
  target_metric?: string;
}

export interface Decision {
  id: Id;
  case_id: Id;
  claim_id: Id;
  status: DecisionStatus;
  evidence_ids: Id[];
  rationale: string;
  actor_ref: string;
  created_at: string;
}

// =============================================================================
// Audit
// =============================================================================

export interface AuditCheck {
  id: string;
  description: string;
  result: "pass" | "fail" | "warning";
  details?: Record<string, unknown>;
}

export interface AuditReport {
  case_id: Id;
  ok: boolean;
  severity: AuditSeverity;
  checks: AuditCheck[];
  generated_at: string;
}

// =============================================================================
// JSON Envelope
// =============================================================================

export interface JsonEnvelope<T> {
  ok: true;
  command: string;
  data: T;
  warnings: string[];
  meta: {
    schema_version: string;
    store_revision?: number;
  };
}

export interface JsonEnvelopeError {
  ok: false;
  command: string;
  code: string;
  message: string;
  data?: Record<string, unknown>;
  blocking_invariants?: string[];
  suggested_next_actions?: string[];
  meta: {
    schema_version: string;
  };
}

export type CommandResult<T> = JsonEnvelope<T> | JsonEnvelopeError;

// =============================================================================
// Input Types (for store operations)
// =============================================================================

export interface CreateCaseInput {
  question: string;
  mode: CaseMode;
  owner_refs?: string[];
  tags?: string[];
  actor_ref: string;
}

export interface DraftProtocolInput {
  case_id: Id;
  objective: string;
  baseline_spec?: string;
  dataset_specs?: string[];
  metric_spec: MetricSpec;
  required_resources: ResourceBudget;
  min_decision_grade?: "decision_grade" | "replicated";
  acceptance_rule?: string;
  actor_ref: string;
}

export interface LockProtocolInput {
  case_id: Id;
  protocol_id: Id;
  actor_ref: string;
}

export interface CreateSnapshotInput {
  case_id: Id;
  commit_hash?: string;
  dirty_tree: boolean;
  diff_digest?: string;
  config_digests?: string[];
  dataset_digests?: string[];
  split_manifest_digest?: string;
  evaluator_digest?: string;
  environment_digest?: string;
  actor_ref: string;
}

export interface BeginRunInput {
  case_id: Id;
  protocol_id?: Id;
  snapshot_id?: Id;
  kind: RunKind;
  command: string[];
  tracker_refs?: string[];
  commit_hash?: string;
  environment_digest?: string;
  actor_ref: string;
}

export interface EndRunInput {
  status: RunStatus;
  actual_resources?: ResourceBudget;
  output_refs?: string[];
  interrupt_reason?: string;
}

export interface RecordDeviationInput {
  run_id: Id;
  category: string;
  description: string;
  severity: DeviationSeverity;
  impact: DeviationImpact;
  declared_by_actor_ref: string;
  resolved?: boolean;
}

export interface ClassifyEvidenceInput {
  case_id: Id;
  run_ids: Id[];
  metrics: MetricResult[];
  baseline_run_ids?: Id[];
  deviation_ids?: Id[];
  actor_ref: string;
}

export interface CreateClaimInput {
  case_id: Id;
  statement: string;
  scope: string;
  comparator?: string;
  expected_direction?: "max" | "min";
  target_metric?: string;
  actor_ref: string;
}

export interface IssueDecisionInput {
  case_id: Id;
  claim_id: Id;
  status: DecisionStatus;
  evidence_ids: Id[];
  rationale: string;
  actor_ref: string;
}

export interface AuditScope {
  case_id: Id;
  run_ids?: Id[];
}

export interface StatusScope {
  case_id: Id;
}
