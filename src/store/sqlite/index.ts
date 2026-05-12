import Database from "better-sqlite3";
import { mkdirSync } from "fs";
import { join } from "path";
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
} from "../../types/index.js";
import { MLSpecStore, CaseFilter, RunFilter, StatusReport, generateId } from "../index.js";
import { computeGrade, checkBaselineComparability, BaselineInfo } from "../../grading/index.js";

const SCHEMA_VERSION = "0.1.0";

function getStorePath(): string {
  const home = process.env.MLSPEC_STORE_PATH ?? ".mlspec";
  return join(home, "store.db");
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS cases (
      id TEXT PRIMARY KEY,
      question TEXT NOT NULL,
      mode TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'proposed',
      current_protocol_id TEXT,
      owner_refs TEXT NOT NULL DEFAULT '[]',
      tags TEXT NOT NULL DEFAULT '[]',
      actor_ref TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS protocols (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      objective TEXT NOT NULL,
      baseline_spec TEXT,
      dataset_specs TEXT NOT NULL DEFAULT '[]',
      metric_spec TEXT NOT NULL,
      required_resources TEXT NOT NULL,
      min_decision_grade TEXT NOT NULL,
      acceptance_rule TEXT,
      locked_at TEXT,
      FOREIGN KEY (case_id) REFERENCES cases(id)
    );

    CREATE TABLE IF NOT EXISTS snapshots (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      commit_hash TEXT,
      dirty_tree INTEGER NOT NULL,
      diff_digest TEXT,
      config_digests TEXT NOT NULL DEFAULT '[]',
      dataset_digests TEXT NOT NULL DEFAULT '[]',
      split_manifest_digest TEXT,
      evaluator_digest TEXT,
      environment_digest TEXT,
      actor_ref TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (case_id) REFERENCES cases(id)
    );

    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      protocol_id TEXT,
      snapshot_id TEXT,
      kind TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'planned',
      command TEXT NOT NULL DEFAULT '[]',
      tracker_refs TEXT NOT NULL DEFAULT '[]',
      commit_hash TEXT,
      environment_digest TEXT,
      input_artifact_refs TEXT NOT NULL DEFAULT '[]',
      actual_resources TEXT,
      output_refs TEXT NOT NULL DEFAULT '[]',
      interrupt_reason TEXT,
      started_at TEXT,
      ended_at TEXT,
      FOREIGN KEY (case_id) REFERENCES cases(id),
      FOREIGN KEY (protocol_id) REFERENCES protocols(id),
      FOREIGN KEY (snapshot_id) REFERENCES snapshots(id)
    );

    CREATE TABLE IF NOT EXISTS deviations (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      severity TEXT NOT NULL,
      impact TEXT NOT NULL,
      declared_by_actor_ref TEXT NOT NULL,
      resolved INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (run_id) REFERENCES runs(id)
    );

    CREATE TABLE IF NOT EXISTS evidence (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      run_ids TEXT NOT NULL DEFAULT '[]',
      metrics TEXT NOT NULL DEFAULT '[]',
      grade TEXT NOT NULL,
      protocol_satisfied TEXT NOT NULL,
      baseline_run_ids TEXT,
      deviation_ids TEXT NOT NULL DEFAULT '[]',
      summary TEXT NOT NULL,
      FOREIGN KEY (case_id) REFERENCES cases(id)
    );

    CREATE TABLE IF NOT EXISTS claims (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      statement TEXT NOT NULL,
      scope TEXT NOT NULL,
      comparator TEXT,
      expected_direction TEXT,
      target_metric TEXT,
      FOREIGN KEY (case_id) REFERENCES cases(id)
    );

    CREATE TABLE IF NOT EXISTS decisions (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      claim_id TEXT NOT NULL,
      status TEXT NOT NULL,
      evidence_ids TEXT NOT NULL DEFAULT '[]',
      rationale TEXT NOT NULL,
      actor_ref TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (case_id) REFERENCES cases(id),
      FOREIGN KEY (claim_id) REFERENCES claims(id)
    );

    CREATE TABLE IF NOT EXISTS audit_reports (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      ok INTEGER NOT NULL,
      severity TEXT NOT NULL,
      checks TEXT NOT NULL DEFAULT '[]',
      generated_at TEXT NOT NULL,
      FOREIGN KEY (case_id) REFERENCES cases(id)
    );

    CREATE TABLE IF NOT EXISTS store_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
    CREATE INDEX IF NOT EXISTS idx_cases_mode ON cases(mode);
    CREATE INDEX IF NOT EXISTS idx_protocols_case ON protocols(case_id);
    CREATE INDEX IF NOT EXISTS idx_snapshots_case ON snapshots(case_id);
    CREATE INDEX IF NOT EXISTS idx_runs_case ON runs(case_id);
    CREATE INDEX IF NOT EXISTS idx_runs_protocol ON runs(protocol_id);
    CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status);
    CREATE INDEX IF NOT EXISTS idx_deviations_run ON deviations(run_id);
    CREATE INDEX IF NOT EXISTS idx_evidence_case ON evidence(case_id);
    CREATE INDEX IF NOT EXISTS idx_claims_case ON claims(case_id);
    CREATE INDEX IF NOT EXISTS idx_decisions_case ON decisions(case_id);
    CREATE INDEX IF NOT EXISTS idx_audit_reports_case ON audit_reports(case_id);
  `);

  // Insert schema version if not exists
  db.prepare(`INSERT OR IGNORE INTO store_meta (key, value) VALUES ('schema_version', ?)`).run(SCHEMA_VERSION);
}

export class SQLiteStore implements MLSpecStore {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const path = dbPath ?? getStorePath();
    const dir = path.substring(0, path.lastIndexOf("/"));
    if (dir) mkdirSync(dir, { recursive: true });
    this.db = new Database(path);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    initSchema(this.db);
  }

  // ---- Case ----

  createCase(input: CreateCaseInput): Case {
    const id = generateId();
    const now = new Date().toISOString();
    const case_: Case = {
      id,
      question: input.question,
      mode: input.mode,
      status: "proposed",
      current_protocol_id: undefined,
      owner_refs: input.owner_refs ?? [],
      tags: input.tags ?? [],
      actor_ref: input.actor_ref,
      created_at: now,
    };
    this.db.prepare(`
      INSERT INTO cases (id, question, mode, status, current_protocol_id, owner_refs, tags, actor_ref, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      case_.id,
      case_.question,
      case_.mode,
      case_.status,
      case_.current_protocol_id ?? null,
      JSON.stringify(case_.owner_refs),
      JSON.stringify(case_.tags),
      case_.actor_ref,
      case_.created_at
    );
    return case_;
  }

  getCase(id: Id): Case | null {
    const row = this.db.prepare("SELECT * FROM cases WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.rowToCase(row);
  }

  listCases(filter?: CaseFilter): Case[] {
    let sql = "SELECT * FROM cases WHERE 1=1";
    const params: unknown[] = [];
    if (filter?.status?.length) {
      sql += ` AND status IN (${filter.status.map(() => "?").join(",")})`;
      params.push(...filter.status);
    }
    if (filter?.mode?.length) {
      sql += ` AND mode IN (${filter.mode.map(() => "?").join(",")})`;
      params.push(...filter.mode);
    }
    sql += " ORDER BY created_at DESC";
    if (filter?.limit) {
      sql += " LIMIT ?";
      params.push(filter.limit);
      if (filter?.offset) {
        sql += " OFFSET ?";
        params.push(filter.offset);
      }
    }
    const rows = this.db.prepare(sql).all(...params) as Record<string, unknown>[];
    return rows.map((r) => this.rowToCase(r));
  }

  archiveCase(id: Id): Case {
    this.db.prepare("UPDATE cases SET status = 'archived' WHERE id = ?").run(id);
    return this.getCase(id)!;
  }

  private rowToCase(row: Record<string, unknown>): Case {
    return {
      id: row.id as string,
      question: row.question as string,
      mode: row.mode as Case["mode"],
      status: row.status as Case["status"],
      current_protocol_id: row.current_protocol_id as string | undefined,
      owner_refs: JSON.parse(row.owner_refs as string),
      tags: JSON.parse(row.tags as string),
      actor_ref: row.actor_ref as string,
      created_at: row.created_at as string,
    };
  }

  // ---- Protocol ----

  draftProtocol(input: DraftProtocolInput): Protocol {
    const id = generateId();
    // Get next version for this case
    const last = this.db.prepare("SELECT MAX(version) as v FROM protocols WHERE case_id = ?").get(input.case_id) as { v: number | null };
    const version = (last?.v ?? 0) + 1;
    const protocol: Protocol = {
      id,
      case_id: input.case_id,
      version,
      objective: input.objective,
      baseline_spec: input.baseline_spec,
      dataset_specs: input.dataset_specs ?? [],
      metric_spec: input.metric_spec,
      required_resources: input.required_resources,
      min_decision_grade: input.min_decision_grade ?? "decision_grade",
      acceptance_rule: input.acceptance_rule,
      locked_at: undefined,
    };
    this.db.prepare(`
      INSERT INTO protocols (id, case_id, version, objective, baseline_spec, dataset_specs, metric_spec, required_resources, min_decision_grade, acceptance_rule, locked_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      protocol.id,
      protocol.case_id,
      protocol.version,
      protocol.objective,
      protocol.baseline_spec ?? null,
      JSON.stringify(protocol.dataset_specs),
      JSON.stringify(protocol.metric_spec),
      JSON.stringify(protocol.required_resources),
      protocol.min_decision_grade,
      protocol.acceptance_rule ?? null,
      protocol.locked_at ?? null
    );
    // Update case's current_protocol_id
    this.db.prepare("UPDATE cases SET current_protocol_id = ? WHERE id = ?").run(id, input.case_id);
    return protocol;
  }

  lockProtocol(input: LockProtocolInput): Protocol {
    const now = new Date().toISOString();
    this.db.prepare("UPDATE protocols SET locked_at = ? WHERE id = ? AND case_id = ?").run(now, input.protocol_id, input.case_id);
    return this.getProtocol(input.protocol_id)!;
  }

  getProtocol(id: Id): Protocol | null {
    const row = this.db.prepare("SELECT * FROM protocols WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.rowToProtocol(row);
  }

  listProtocols(caseId: Id): Protocol[] {
    const rows = this.db.prepare("SELECT * FROM protocols WHERE case_id = ? ORDER BY version").all(caseId) as Record<string, unknown>[];
    return rows.map((r) => this.rowToProtocol(r));
  }

  private rowToProtocol(row: Record<string, unknown>): Protocol {
    return {
      id: row.id as string,
      case_id: row.case_id as string,
      version: row.version as number,
      objective: row.objective as string,
      baseline_spec: row.baseline_spec as string | undefined,
      dataset_specs: JSON.parse(row.dataset_specs as string),
      metric_spec: JSON.parse(row.metric_spec as string),
      required_resources: JSON.parse(row.required_resources as string),
      min_decision_grade: row.min_decision_grade as Protocol["min_decision_grade"],
      acceptance_rule: row.acceptance_rule as string | undefined,
      locked_at: row.locked_at as string | undefined,
    };
  }

  // ---- Snapshot ----

  createSnapshot(input: CreateSnapshotInput): Snapshot {
    const id = generateId();
    const now = new Date().toISOString();
    const snapshot: Snapshot = {
      id,
      case_id: input.case_id,
      commit_hash: input.commit_hash,
      dirty_tree: input.dirty_tree,
      diff_digest: input.diff_digest,
      config_digests: input.config_digests ?? [],
      dataset_digests: input.dataset_digests ?? [],
      split_manifest_digest: input.split_manifest_digest,
      evaluator_digest: input.evaluator_digest,
      environment_digest: input.environment_digest,
      actor_ref: input.actor_ref,
      created_at: now,
    };
    this.db.prepare(`
      INSERT INTO snapshots (id, case_id, commit_hash, dirty_tree, diff_digest, config_digests, dataset_digests, split_manifest_digest, evaluator_digest, environment_digest, actor_ref, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      snapshot.id,
      snapshot.case_id,
      snapshot.commit_hash ?? null,
      snapshot.dirty_tree ? 1 : 0,
      snapshot.diff_digest ?? null,
      JSON.stringify(snapshot.config_digests),
      JSON.stringify(snapshot.dataset_digests),
      snapshot.split_manifest_digest ?? null,
      snapshot.evaluator_digest ?? null,
      snapshot.environment_digest ?? null,
      snapshot.actor_ref,
      snapshot.created_at
    );
    return snapshot;
  }

  getSnapshot(id: Id): Snapshot | null {
    const row = this.db.prepare("SELECT * FROM snapshots WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.rowToSnapshot(row);
  }

  listSnapshots(caseId: Id): Snapshot[] {
    const rows = this.db.prepare("SELECT * FROM snapshots WHERE case_id = ? ORDER BY created_at DESC").all(caseId) as Record<string, unknown>[];
    return rows.map((r) => this.rowToSnapshot(r));
  }

  private rowToSnapshot(row: Record<string, unknown>): Snapshot {
    return {
      id: row.id as string,
      case_id: row.case_id as string,
      commit_hash: row.commit_hash as string | undefined,
      dirty_tree: Boolean(row.dirty_tree),
      diff_digest: row.diff_digest as string | undefined,
      config_digests: JSON.parse(row.config_digests as string),
      dataset_digests: JSON.parse(row.dataset_digests as string),
      split_manifest_digest: row.split_manifest_digest as string | undefined,
      evaluator_digest: row.evaluator_digest as string | undefined,
      environment_digest: row.environment_digest as string | undefined,
      actor_ref: row.actor_ref as string,
      created_at: row.created_at as string,
    };
  }

  // ---- Run ----

  beginRun(input: BeginRunInput): Run {
    const id = generateId();
    const now = new Date().toISOString();
    const run: Run = {
      id,
      case_id: input.case_id,
      protocol_id: input.protocol_id,
      snapshot_id: input.snapshot_id,
      kind: input.kind,
      status: "running",
      command: input.command,
      tracker_refs: input.tracker_refs ?? [],
      commit_hash: input.commit_hash,
      environment_digest: input.environment_digest,
      input_artifact_refs: [],
      actual_resources: undefined,
      output_refs: [],
      interrupt_reason: undefined,
      started_at: now,
      ended_at: undefined,
    };
    this.db.prepare(`
      INSERT INTO runs (id, case_id, protocol_id, snapshot_id, kind, status, command, tracker_refs, commit_hash, environment_digest, input_artifact_refs, actual_resources, output_refs, interrupt_reason, started_at, ended_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      run.id,
      run.case_id,
      run.protocol_id ?? null,
      run.snapshot_id ?? null,
      run.kind,
      run.status,
      JSON.stringify(run.command),
      JSON.stringify(run.tracker_refs),
      run.commit_hash ?? null,
      run.environment_digest ?? null,
      JSON.stringify(run.input_artifact_refs),
      run.actual_resources ? JSON.stringify(run.actual_resources) : null,
      JSON.stringify(run.output_refs),
      run.interrupt_reason ?? null,
      run.started_at,
      run.ended_at ?? null
    );
    return run;
  }

  endRun(runId: Id, input: EndRunInput): Run {
    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE runs SET status = ?, actual_resources = ?, output_refs = ?, interrupt_reason = ?, ended_at = ?
      WHERE id = ?
    `).run(
      input.status,
      input.actual_resources ? JSON.stringify(input.actual_resources) : null,
      JSON.stringify(input.output_refs ?? []),
      input.interrupt_reason ?? null,
      now,
      runId
    );
    return this.getRun(runId)!;
  }

  getRun(id: Id): Run | null {
    const row = this.db.prepare("SELECT * FROM runs WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.rowToRun(row);
  }

  listRuns(filter?: RunFilter): Run[] {
    let sql = "SELECT * FROM runs WHERE 1=1";
    const params: unknown[] = [];
    if (filter?.case_id) {
      sql += " AND case_id = ?";
      params.push(filter.case_id);
    }
    if (filter?.protocol_id) {
      sql += " AND protocol_id = ?";
      params.push(filter.protocol_id);
    }
    if (filter?.status?.length) {
      sql += ` AND status IN (${filter.status.map(() => "?").join(",")})`;
      params.push(...filter.status);
    }
    if (filter?.kind?.length) {
      sql += ` AND kind IN (${filter.kind.map(() => "?").join(",")})`;
      params.push(...filter.kind);
    }
    sql += " ORDER BY started_at DESC";
    if (filter?.limit) {
      sql += " LIMIT ?";
      params.push(filter.limit);
      if (filter?.offset) {
        sql += " OFFSET ?";
        params.push(filter.offset);
      }
    }
    const rows = this.db.prepare(sql).all(...params) as Record<string, unknown>[];
    return rows.map((r) => this.rowToRun(r));
  }

  private rowToRun(row: Record<string, unknown>): Run {
    return {
      id: row.id as string,
      case_id: row.case_id as string,
      protocol_id: row.protocol_id as string | undefined,
      snapshot_id: row.snapshot_id as string | undefined,
      kind: row.kind as Run["kind"],
      status: row.status as Run["status"],
      command: JSON.parse(row.command as string),
      tracker_refs: JSON.parse(row.tracker_refs as string),
      commit_hash: row.commit_hash as string | undefined,
      environment_digest: row.environment_digest as string | undefined,
      input_artifact_refs: JSON.parse(row.input_artifact_refs as string),
      actual_resources: row.actual_resources ? JSON.parse(row.actual_resources as string) : undefined,
      output_refs: JSON.parse(row.output_refs as string),
      interrupt_reason: row.interrupt_reason as string | undefined,
      started_at: row.started_at as string | undefined,
      ended_at: row.ended_at as string | undefined,
    };
  }

  // ---- Deviation ----

  recordDeviation(input: RecordDeviationInput): Deviation {
    const id = generateId();
    const deviation: Deviation = {
      id,
      run_id: input.run_id,
      category: input.category,
      description: input.description,
      severity: input.severity,
      impact: input.impact,
      declared_by_actor_ref: input.declared_by_actor_ref,
      resolved: input.resolved ?? false,
    };
    this.db.prepare(`
      INSERT INTO deviations (id, run_id, category, description, severity, impact, declared_by_actor_ref, resolved)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      deviation.id,
      deviation.run_id,
      deviation.category,
      deviation.description,
      deviation.severity,
      deviation.impact,
      deviation.declared_by_actor_ref,
      deviation.resolved ? 1 : 0
    );
    return deviation;
  }

  getDeviation(id: Id): Deviation | null {
    const row = this.db.prepare("SELECT * FROM deviations WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.rowToDeviation(row);
  }

  listDeviations(runId: Id): Deviation[] {
    const rows = this.db.prepare("SELECT * FROM deviations WHERE run_id = ?").all(runId) as Record<string, unknown>[];
    return rows.map((r) => this.rowToDeviation(r));
  }

  private rowToDeviation(row: Record<string, unknown>): Deviation {
    return {
      id: row.id as string,
      run_id: row.run_id as string,
      category: row.category as string,
      description: row.description as string,
      severity: row.severity as Deviation["severity"],
      impact: row.impact as Deviation["impact"],
      declared_by_actor_ref: row.declared_by_actor_ref as string,
      resolved: Boolean(row.resolved),
    };
  }

  // ---- Evidence ----

  classifyEvidence(input: ClassifyEvidenceInput): Evidence {
    const id = generateId();

    // Fetch runs for grading
    const runs: Run[] = [];
    let firstRunSnapshot: Snapshot | null = null;
    for (const runId of input.run_ids) {
      const run = this.getRun(runId);
      if (run) {
        runs.push(run);
        // Get snapshot from first run for baseline check
        if (!firstRunSnapshot && run.snapshot_id) {
          firstRunSnapshot = this.getSnapshot(run.snapshot_id);
        }
      }
    }

    // Get case's current protocol
    const case_ = this.getCase(input.case_id);
    const protocol = case_?.current_protocol_id ? this.getProtocol(case_.current_protocol_id) : null;

    // Get deviations for all runs
    const allDeviations: Deviation[] = [];
    for (const runId of input.run_ids) {
      const devs = this.listDeviations(runId);
      allDeviations.push(...devs);
    }
    // Also include any deviation IDs provided in input
    for (const devId of input.deviation_ids ?? []) {
      const dev = this.getDeviation(devId);
      if (dev && !allDeviations.find((d) => d.id === devId)) {
        allDeviations.push(dev);
      }
    }

    // Compute baseline comparability
    let baselineInfo: BaselineInfo = { comparable: false };
    if (input.baseline_run_ids && input.baseline_run_ids.length > 0) {
      // Use first baseline run for comparability check
      const baselineRun = this.getRun(input.baseline_run_ids[0]);
      const baselineSnapshot = baselineRun?.snapshot_id ? this.getSnapshot(baselineRun.snapshot_id) : null;
      baselineInfo = checkBaselineComparability(
        runs[0] ?? { id: "", case_id: "", kind: "full", status: "completed", command: [], tracker_refs: [], input_artifact_refs: [], output_refs: [], actor_ref: "", created_at: "" },
        baselineRun ?? null,
        firstRunSnapshot,
        baselineSnapshot
      );
    }

    // Compute grade
    let grade: Evidence["grade"] = "partial";
    let protocol_satisfied: Evidence["protocol_satisfied"] = "partial";
    let summary = "";
    const warnings: string[] = [];

    if (protocol && runs.length > 0) {
      const gradeResult = computeGrade(runs, protocol, allDeviations, firstRunSnapshot, baselineInfo, input.metrics);
      grade = gradeResult.grade;
      protocol_satisfied = gradeResult.protocol_satisfied;
      warnings.push(...gradeResult.warnings);
      summary = `Grade: ${grade}, Protocol satisfied: ${protocol_satisfied}${warnings.length > 0 ? `. Warnings: ${warnings.join(", ")}` : ""}`;
    } else {
      summary = "No protocol found or no runs - cannot compute grade";
    }

    const evidence: Evidence = {
      id,
      case_id: input.case_id,
      run_ids: input.run_ids,
      metrics: input.metrics,
      grade,
      protocol_satisfied,
      baseline_run_ids: input.baseline_run_ids,
      deviation_ids: input.deviation_ids ?? [],
      summary,
    };
    this.db.prepare(`
      INSERT INTO evidence (id, case_id, run_ids, metrics, grade, protocol_satisfied, baseline_run_ids, deviation_ids, summary)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      evidence.id,
      evidence.case_id,
      JSON.stringify(evidence.run_ids),
      JSON.stringify(evidence.metrics),
      evidence.grade,
      evidence.protocol_satisfied,
      evidence.baseline_run_ids ? JSON.stringify(evidence.baseline_run_ids) : null,
      JSON.stringify(evidence.deviation_ids),
      evidence.summary
    );
    return evidence;
  }

  getEvidence(id: Id): Evidence | null {
    const row = this.db.prepare("SELECT * FROM evidence WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.rowToEvidence(row);
  }

  listEvidence(caseId: Id): Evidence[] {
    const rows = this.db.prepare("SELECT * FROM evidence WHERE case_id = ?").all(caseId) as Record<string, unknown>[];
    return rows.map((r) => this.rowToEvidence(r));
  }

  private rowToEvidence(row: Record<string, unknown>): Evidence {
    return {
      id: row.id as string,
      case_id: row.case_id as string,
      run_ids: JSON.parse(row.run_ids as string),
      metrics: JSON.parse(row.metrics as string),
      grade: row.grade as Evidence["grade"],
      protocol_satisfied: row.protocol_satisfied as Evidence["protocol_satisfied"],
      baseline_run_ids: row.baseline_run_ids ? JSON.parse(row.baseline_run_ids as string) : undefined,
      deviation_ids: JSON.parse(row.deviation_ids as string),
      summary: row.summary as string,
    };
  }

  // ---- Claim ----

  createClaim(input: CreateClaimInput): Claim {
    const id = generateId();
    const claim: Claim = {
      id,
      case_id: input.case_id,
      statement: input.statement,
      scope: input.scope,
      comparator: input.comparator,
      expected_direction: input.expected_direction,
      target_metric: input.target_metric,
    };
    this.db.prepare(`
      INSERT INTO claims (id, case_id, statement, scope, comparator, expected_direction, target_metric)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      claim.id,
      claim.case_id,
      claim.statement,
      claim.scope,
      claim.comparator ?? null,
      claim.expected_direction ?? null,
      claim.target_metric ?? null
    );
    return claim;
  }

  getClaim(id: Id): Claim | null {
    const row = this.db.prepare("SELECT * FROM claims WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.rowToClaim(row);
  }

  listClaims(caseId: Id): Claim[] {
    const rows = this.db.prepare("SELECT * FROM claims WHERE case_id = ?").all(caseId) as Record<string, unknown>[];
    return rows.map((r) => this.rowToClaim(r));
  }

  private rowToClaim(row: Record<string, unknown>): Claim {
    return {
      id: row.id as string,
      case_id: row.case_id as string,
      statement: row.statement as string,
      scope: row.scope as string,
      comparator: row.comparator as string | undefined,
      expected_direction: row.expected_direction as Claim["expected_direction"],
      target_metric: row.target_metric as string | undefined,
    };
  }

  // ---- Decision ----

  issueDecision(input: IssueDecisionInput): Decision {
    const { DecisionValidationError } = require("../../types/index.js");

    // Validate claim_id is provided
    if (!input.claim_id) {
      throw new DecisionValidationError(
        "claim_id is required",
        "MISSING_CLAIM_ID",
        ["CLAIM_REQUIRED"],
        ["Create a claim with 'mlspec claim create' before issuing a decision"],
        { claim_id: input.claim_id }
      );
    }

    // Validate claim exists
    const claim = this.getClaim(input.claim_id);
    if (!claim) {
      throw new DecisionValidationError(
        `Claim not found: ${input.claim_id}`,
        "CLAIM_NOT_FOUND",
        ["CLAIM_REQUIRED"],
        ["Create a claim with 'mlspec claim create' before issuing a decision"],
        { claim_id: input.claim_id }
      );
    }

    // For accept/reject, validate evidence grades
    if (input.status === "accept" || input.status === "reject") {
      const blockingInvariants: string[] = [];
      const suggestedActions: string[] = [];

      if (!input.evidence_ids || input.evidence_ids.length === 0) {
        blockingInvariants.push("EVIDENCE_REQUIRED");
        suggestedActions.push("Classify evidence with 'mlspec evidence classify' before issuing decision");
      } else {
        // Check evidence grades
        const evidenceGrades = input.evidence_ids.map((evId) => this.getEvidence(evId)).filter(Boolean);
        const hasDecisionGrade = evidenceGrades.some(
          (ev) => ev && (ev.grade === "decision_grade" || ev.grade === "replicated")
        );
        const evidenceCap = evidenceGrades.length > 0
          ? evidenceGrades.reduce((max, ev) => {
              const gradeOrder: Record<string, number> = { invalid: 0, smoke: 1, proxy: 2, partial: 3, decision_grade: 4, replicated: 5 };
              return gradeOrder[ev.grade] > gradeOrder[max] ? ev.grade : max;
            }, "invalid" as string)
          : "none";

        if (!hasDecisionGrade) {
          blockingInvariants.push("GRADE_INSUFFICIENT_FOR_ACCEPT");
          suggestedActions.push(`Evidence grade is '${evidenceCap}' - need 'decision_grade' or 'replicated' for accept/reject`);
          suggestedActions.push("Run more iterations/seeds or fix deviations to achieve decision_grade");
        }

        // Run audit to check for blocking invariants
        const auditReport = this.audit({ case_id: input.case_id });
        const blockingChecks = auditReport.checks.filter(
          (c) => c.result === "fail" && ["PLANNED_RUN_NOT_EVIDENCE", "RUN_STATUS_MISMATCH", "RESOURCE_UNDERRUN", "BASELINE_NOT_COMPARABLE", "UNSUPPORTED_DECISION"].includes(c.id)
        );
        if (blockingChecks.length > 0) {
          blockingInvariants.push(...blockingChecks.map((c) => c.id));
          suggestedActions.push(...blockingChecks.map((c) => `Fix: ${c.description}`));
        }

        if (blockingInvariants.length > 0) {
          throw new DecisionValidationError(
            `Cannot issue ${input.status} decision - blocking invariants present`,
            "INSUFFICIENT_EVIDENCE",
            blockingInvariants,
            suggestedActions,
            { claim_id: input.claim_id, requested_status: input.status, max_allowed_status: "inconclusive", evidence_cap: evidenceCap }
          );
        }
      }
    }

    // All validations passed - create decision
    const id = generateId();
    const now = new Date().toISOString();
    const decision: Decision = {
      id,
      case_id: input.case_id,
      claim_id: input.claim_id,
      status: input.status,
      evidence_ids: input.evidence_ids,
      rationale: input.rationale,
      actor_ref: input.actor_ref,
      created_at: now,
    };
    this.db.prepare(`
      INSERT INTO decisions (id, case_id, claim_id, status, evidence_ids, rationale, actor_ref, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      decision.id,
      decision.case_id,
      decision.claim_id,
      decision.status,
      JSON.stringify(decision.evidence_ids),
      decision.rationale,
      decision.actor_ref,
      decision.created_at
    );
    return decision;
  }

  getDecision(id: Id): Decision | null {
    const row = this.db.prepare("SELECT * FROM decisions WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.rowToDecision(row);
  }

  listDecisions(caseId: Id): Decision[] {
    const rows = this.db.prepare("SELECT * FROM decisions WHERE case_id = ? ORDER BY created_at DESC").all(caseId) as Record<string, unknown>[];
    return rows.map((r) => this.rowToDecision(r));
  }

  private rowToDecision(row: Record<string, unknown>): Decision {
    return {
      id: row.id as string,
      case_id: row.case_id as string,
      claim_id: row.claim_id as string,
      status: row.status as Decision["status"],
      evidence_ids: JSON.parse(row.evidence_ids as string),
      rationale: row.rationale as string,
      actor_ref: row.actor_ref as string,
      created_at: row.created_at as string,
    };
  }

  // ---- Audit ----

  audit(scope: AuditScope): AuditReport {
    const case_ = this.getCase(scope.case_id);
    if (!case_) throw new Error(`Case not found: ${scope.case_id}`);
    const runs = this.listRuns({ case_id: scope.case_id });
    const protocols = this.listProtocols(scope.case_id);
    const snapshots = this.listSnapshots(scope.case_id);
    const evidence = this.listEvidence(scope.case_id);
    const claims = this.listClaims(scope.case_id);
    const decisions = this.listDecisions(scope.case_id);
    const allDeviations: Deviation[] = [];
    for (const run of runs) {
      allDeviations.push(...this.listDeviations(run.id));
    }
    const { runAudit } = require("../../audit/runner.js");
    return runAudit(scope, case_, runs, protocols, snapshots, evidence, claims, decisions, allDeviations);
  }

  // ---- Status ----

  status(scope: StatusScope): StatusReport {
    const case_ = this.getCase(scope.case_id);
    if (!case_) throw new Error(`Case not found: ${scope.case_id}`);

    const runs = this.listRuns({ case_id: scope.case_id });
    const byStatus: Record<string, number> = {};
    for (const run of runs) {
      byStatus[run.status] = (byStatus[run.status] ?? 0) + 1;
    }

    const evidence = this.listEvidence(scope.case_id);
    const byGrade: Record<string, number> = {};
    for (const ev of evidence) {
      byGrade[ev.grade] = (byGrade[ev.grade] ?? 0) + 1;
    }

    const decisions = this.listDecisions(scope.case_id);
    const latest = decisions[0];

    return {
      case_id: scope.case_id,
      case_status: case_.status,
      current_protocol_id: case_.current_protocol_id,
      runs: { total: runs.length, by_status: byStatus },
      evidence: { total: evidence.length, by_grade: byGrade },
      decisions: {
        total: decisions.length,
        latest: latest ? { status: latest.status, created_at: latest.created_at } : undefined,
      },
    };
  }
}