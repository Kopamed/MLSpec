// =============================================================================
// MLSpecStore Interface
// =============================================================================

import type {
  Id,
  Case,
  Protocol,
  Snapshot,
  Run,
  Deviation,
  Evidence,
  Claim,
  Decision,
  AuditReport,
  AuditScope,
  CreateCaseInput,
  DraftProtocolInput,
  LockProtocolInput,
  CreateSnapshotInput,
  BeginRunInput,
  EndRunInput,
  RecordDeviationInput,
  ClassifyEvidenceInput,
  CreateClaimInput,
  IssueDecisionInput,
  StatusScope,
} from "../types/index.js";

/**
 * Filter options for listing cases.
 */
export interface CaseFilter {
  status?: string[];
  mode?: string[];
  owner_refs?: string[];
  tags?: string[];
  limit?: number;
  offset?: number;
}

/**
 * Summary status report for a case.
 */
export interface StatusReport {
  case_id: Id;
  case_status: string;
  current_protocol_id?: Id;
  runs: {
    total: number;
    by_status: Record<string, number>;
  };
  evidence: {
    total: number;
    by_grade: Record<string, number>;
  };
  decisions: {
    total: number;
    latest?: {
      status: string;
      created_at: string;
    };
  };
}

/**
 * Filter options for listing runs.
 */
export interface RunFilter {
  case_id?: Id;
  protocol_id?: Id;
  status?: string[];
  kind?: string[];
  limit?: number;
  offset?: number;
}

/**
 * MLSpecStore is the repository interface for all MLSpec nouns.
 * Implementations (SQLite, JSONL) must satisfy this contract.
 */
export interface MLSpecStore {
  // ---- Case ----
  createCase(input: CreateCaseInput): Case;
  getCase(id: Id): Case | null;
  listCases(filter?: CaseFilter): Case[];
  archiveCase(id: Id): Case;

  // ---- Protocol ----
  draftProtocol(input: DraftProtocolInput): Protocol;
  lockProtocol(input: LockProtocolInput): Protocol;
  getProtocol(id: Id): Protocol | null;
  listProtocols(caseId: Id): Protocol[];

  // ---- Snapshot ----
  createSnapshot(input: CreateSnapshotInput): Snapshot;
  getSnapshot(id: Id): Snapshot | null;
  listSnapshots(caseId: Id): Snapshot[];

  // ---- Run ----
  beginRun(input: BeginRunInput): Run;
  endRun(runId: Id, input: EndRunInput): Run;
  getRun(id: Id): Run | null;
  listRuns(filter?: RunFilter): Run[];

  // ---- Deviation ----
  recordDeviation(input: RecordDeviationInput): Deviation;
  getDeviation(id: Id): Deviation | null;
  listDeviations(runId: Id): Deviation[];

  // ---- Evidence ----
  classifyEvidence(input: ClassifyEvidenceInput): Evidence;
  getEvidence(id: Id): Evidence | null;
  listEvidence(caseId: Id): Evidence[];

  // ---- Claim ----
  createClaim(input: CreateClaimInput): Claim;
  getClaim(id: Id): Claim | null;
  listClaims(caseId: Id): Claim[];

  // ---- Decision ----
  issueDecision(input: IssueDecisionInput): Decision;
  getDecision(id: Id): Decision | null;
  listDecisions(caseId: Id): Decision[];

  // ---- Audit ----
  audit(scope: AuditScope): AuditReport;

  // ---- Status ----
  status(scope: StatusScope): StatusReport;
}

// =============================================================================
// IdGenerator
// =============================================================================

import { v7 } from "uuid";

/**
 * Generates a UUIDv7 (time-ordered identifier).
 * UUIDv7 encodes timestamp in the first 48 bits, providing
 * time-ordered IDs suitable for sortability.
 */
export function generateId(): Id {
  return v7();
}