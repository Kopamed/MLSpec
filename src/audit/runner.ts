import type { AuditReport, AuditScope, Run, Case, Protocol, Evidence, Claim, Decision, Snapshot, AuditCheck, Deviation } from "../types/index.js";
import type { AuditSeverity } from "../types/index.js";
import {
  PLANNED_RUN_NOT_EVIDENCE,
  RUN_STATUS_MISMATCH,
  CHERRY_PICK_DETECTED,
  RESOURCE_UNDERRUN,
  BASELINE_NOT_COMPARABLE,
  SNAPSHOT_CONTAMINATION,
  SNAPSHOT_REQUIRED,
  UNSUPPORTED_DECISION,
  RUN_INTERRUPTED_NOT_INVALID,
  PROTOCOL_VERSION_DRIFT,
  ORPHAN_ARTIFACT,
  AGENT_TRACE_GAP,
  PROTOCOL_NOT_LOCKED,
  AuditCheckResult,
} from "./checks.js";

/**
 * Run all 12 audit checks and return an AuditReport.
 */
export function runAudit(
  scope: AuditScope,
  case_: Case,
  runs: Run[],
  protocols: Protocol[],
  snapshots: Snapshot[],
  evidence: Evidence[],
  claims: Claim[],
  decisions: Decision[],
  deviations: Deviation[]
): AuditReport {
  const checks: AuditCheck[] = [];

  const results: AuditCheckResult[] = [
    PLANNED_RUN_NOT_EVIDENCE(scope, runs, evidence),
    RUN_STATUS_MISMATCH(scope, runs, evidence),
    CHERRY_PICK_DETECTED(scope, runs, evidence),
    RESOURCE_UNDERRUN(scope, runs, protocols),
    BASELINE_NOT_COMPARABLE(scope, runs, evidence, snapshots),
    SNAPSHOT_CONTAMINATION(scope, runs, evidence, snapshots),
    SNAPSHOT_REQUIRED(scope, runs, evidence),
    UNSUPPORTED_DECISION(scope, evidence, claims, decisions),
    RUN_INTERRUPTED_NOT_INVALID(scope, runs, evidence),
    PROTOCOL_VERSION_DRIFT(scope, runs, protocols, evidence),
    ORPHAN_ARTIFACT(scope, runs, evidence, snapshots),
    AGENT_TRACE_GAP(scope, runs, evidence),
    PROTOCOL_NOT_LOCKED(scope, runs, protocols, evidence),
  ];

  let severity: AuditSeverity = "pass";
  const failCount = results.filter((r) => r.severity === "fail").length;
  const warnCount = results.filter((r) => r.severity === "warning").length;

  if (failCount > 0) severity = "fail";
  else if (warnCount > 0) severity = "warning";

  for (const result of results) {
    checks.push(result.check);
  }

  return {
    case_id: scope.case_id,
    ok: failCount === 0,
    severity,
    checks,
    generated_at: new Date().toISOString(),
  };
}