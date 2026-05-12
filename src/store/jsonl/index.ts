import { mkdirSync, readFileSync, appendFileSync, existsSync } from "fs";
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

type Event =
  | { type: "case.created"; data: Case }
  | { type: "case.archived"; data: { id: Id } }
  | { type: "case.status_changed"; data: { id: Id; status: string } }
  | { type: "protocol.drafted"; data: Protocol }
  | { type: "protocol.locked"; data: { id: Id; case_id: Id } }
  | { type: "snapshot.created"; data: Snapshot }
  | { type: "run.began"; data: Run }
  | { type: "run.ended"; data: { id: Id; input: EndRunInput } }
  | { type: "deviation.recorded"; data: Deviation }
  | { type: "evidence.classified"; data: Evidence }
  | { type: "claim.created"; data: Claim }
  | { type: "decision.issued"; data: Decision }
  | { type: "audit.completed"; data: AuditReport };

function getCaseDir(caseId: Id): string {
  const home = process.env.MLSPEC_STORE_PATH ?? ".mlspec";
  return join(home, "cases", caseId);
}

function getEventsPath(caseId: Id): string {
  return join(getCaseDir(caseId), "events.jsonl");
}

export class JSONLStore implements MLSpecStore {
  private caseCache: Map<Id, Case> = new Map();
  private protocolCache: Map<Id, Protocol> = new Map();
  private snapshotCache: Map<Id, Snapshot> = new Map();
  private runCache: Map<Id, Run> = new Map();
  private deviationCache: Map<Id, Deviation> = new Map();
  private evidenceCache: Map<Id, Evidence> = new Map();
  private claimCache: Map<Id, Claim> = new Map();
  private decisionCache: Map<Id, Decision> = new Map();
  private caseIndex: Set<Id> = new Set();

  private append(caseId: Id, event: Event): void {
    const dir = getCaseDir(caseId);
    mkdirSync(dir, { recursive: true });
    appendFileSync(getEventsPath(caseId), JSON.stringify(event) + "\n");
  }

  private loadCase(caseId: Id): void {
    const path = getEventsPath(caseId);
    if (!existsSync(path)) return;
    const lines = readFileSync(path, "utf-8").split("\n").filter(Boolean);
    for (const line of lines) {
      const event: Event = JSON.parse(line);
      this.applyEvent(event);
    }
  }

  private applyEvent(event: Event): void {
    switch (event.type) {
      case "case.created":
        this.caseCache.set(event.data.id, event.data);
        this.caseIndex.add(event.data.id);
        break;
      case "case.archived": {
        const c = this.caseCache.get(event.data.id);
        if (c) this.caseCache.set(c.id, { ...c, status: "archived" });
        break;
      }
      case "case.status_changed": {
        const c = this.caseCache.get(event.data.id);
        if (c) this.caseCache.set(c.id, { ...c, status: event.data.status as any });
        break;
      }
      case "protocol.drafted":
        this.protocolCache.set(event.data.id, event.data);
        break;
      case "protocol.locked": {
        const p = this.protocolCache.get(event.data.id);
        if (p) this.protocolCache.set(p.id, { ...p, locked_at: new Date().toISOString() });
        break;
      }
      case "snapshot.created":
        this.snapshotCache.set(event.data.id, event.data);
        break;
      case "run.began":
        this.runCache.set(event.data.id, event.data);
        break;
      case "run.ended": {
        const r = this.runCache.get(event.data.id);
        if (r) {
          this.runCache.set(r.id, {
            ...r,
            status: event.data.input.status,
            actual_resources: event.data.input.actual_resources,
            output_refs: event.data.input.output_refs ?? [],
            interrupt_reason: event.data.input.interrupt_reason,
            ended_at: new Date().toISOString(),
          });
        }
        break;
      }
      case "deviation.recorded":
        this.deviationCache.set(event.data.id, event.data);
        break;
      case "evidence.classified":
        this.evidenceCache.set(event.data.id, event.data);
        break;
      case "claim.created":
        this.claimCache.set(event.data.id, event.data);
        break;
      case "decision.issued":
        this.decisionCache.set(event.data.id, event.data);
        break;
      case "audit.completed":
        // Audit reports stored separately if needed
        break;
    }
  }

  private ensureCaseLoaded(caseId: Id): void {
    if (!this.caseCache.has(caseId) && !this.caseIndex.has(caseId)) {
      this.loadCase(caseId);
    }
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
    this.caseCache.set(id, case_);
    this.caseIndex.add(id);
    this.append(id, { type: "case.created", data: case_ });
    return case_;
  }

  getCase(id: Id): Case | null {
    this.ensureCaseLoaded(id);
    return this.caseCache.get(id) ?? null;
  }

  listCases(filter?: CaseFilter): Case[] {
    const cases = Array.from(this.caseCache.values());
    let filtered = cases;
    if (filter?.status?.length) {
      filtered = filtered.filter((c) => filter.status!.includes(c.status));
    }
    if (filter?.mode?.length) {
      filtered = filtered.filter((c) => filter.mode!.includes(c.mode));
    }
    filtered.sort((a, b) => b.created_at.localeCompare(a.created_at));
    if (filter?.limit) {
      const offset = filter.offset ?? 0;
      filtered = filtered.slice(offset, offset + filter.limit);
    }
    return filtered;
  }

  archiveCase(id: Id): Case {
    const c = this.getCase(id)!;
    const archived = { ...c, status: "archived" as const };
    this.caseCache.set(id, archived);
    this.append(id, { type: "case.archived", data: { id } });
    return archived;
  }

  // ---- Protocol ----

  draftProtocol(input: DraftProtocolInput): Protocol {
    const id = generateId();
    const existing = this.listProtocols(input.case_id);
    const version = existing.length > 0 ? Math.max(...existing.map((p) => p.version)) + 1 : 1;
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
    this.protocolCache.set(id, protocol);
    this.append(input.case_id, { type: "protocol.drafted", data: protocol });
    // Update case's current_protocol_id in cache
    const c = this.caseCache.get(input.case_id);
    if (c) {
      this.caseCache.set(c.id, { ...c, current_protocol_id: id });
    }
    return protocol;
  }

  lockProtocol(input: LockProtocolInput): Protocol {
    this.append(input.case_id, { type: "protocol.locked", data: { id: input.protocol_id, case_id: input.case_id } });
    const p = this.protocolCache.get(input.protocol_id)!;
    const locked = { ...p, locked_at: new Date().toISOString() };
    this.protocolCache.set(p.id, locked);

    // Transition case status from proposed → ready when protocol is locked
    const case_ = this.caseCache.get(input.case_id);
    if (case_ && case_.status === "proposed") {
      this.caseCache.set(case_.id, { ...case_, status: "ready" });
      this.append(input.case_id, { type: "case.status_changed", data: { id: case_.id, status: "ready" } });
    }

    return locked;
  }

  getProtocol(id: Id): Protocol | null {
    return this.protocolCache.get(id) ?? null;
  }

  listProtocols(caseId: Id): Protocol[] {
    this.ensureCaseLoaded(caseId);
    return Array.from(this.protocolCache.values()).filter((p) => p.case_id === caseId);
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
    this.snapshotCache.set(id, snapshot);
    this.append(input.case_id, { type: "snapshot.created", data: snapshot });
    return snapshot;
  }

  getSnapshot(id: Id): Snapshot | null {
    return this.snapshotCache.get(id) ?? null;
  }

  listSnapshots(caseId: Id): Snapshot[] {
    this.ensureCaseLoaded(caseId);
    return Array.from(this.snapshotCache.values()).filter((s) => s.case_id === caseId);
  }

  // ---- Run ----

  beginRun(input: BeginRunInput): Run {
    // For evidence-bearing runs (full/replication), require locked protocol
    if ((input.kind === "full" || input.kind === "replication") && input.protocol_id) {
      const protocol = this.getProtocol(input.protocol_id);
      if (protocol && !protocol.locked_at) {
        const { DecisionValidationError } = require("../../types/index.js");
        throw new DecisionValidationError(
          "Protocol must be locked before beginning evidence-bearing run",
          "PROTOCOL_NOT_LOCKED",
          ["PROTOCOL_NOT_LOCKED"],
          ["Lock the protocol with 'mlspec protocol lock' before running full or replication experiments"],
          { protocol_id: input.protocol_id }
        );
      }
    }

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
    this.runCache.set(id, run);
    this.append(input.case_id, { type: "run.began", data: run });
    return run;
  }

  endRun(runId: Id, input: EndRunInput): Run {
    const run = this.runCache.get(runId)!;
    const ended = {
      ...run,
      status: input.status,
      actual_resources: input.actual_resources,
      output_refs: input.output_refs ?? [],
      interrupt_reason: input.interrupt_reason,
      ended_at: new Date().toISOString(),
    };
    this.runCache.set(runId, ended);
    this.append(run.case_id, { type: "run.ended", data: { id: runId, input } });
    return ended;
  }

  getRun(id: Id): Run | null {
    return this.runCache.get(id) ?? null;
  }

  listRuns(filter?: RunFilter): Run[] {
    if (filter?.case_id) this.ensureCaseLoaded(filter.case_id);
    let runs = Array.from(this.runCache.values());
    if (filter?.case_id) runs = runs.filter((r) => r.case_id === filter.case_id);
    if (filter?.protocol_id) runs = runs.filter((r) => r.protocol_id === filter.protocol_id);
    if (filter?.status?.length) runs = runs.filter((r) => filter.status!.includes(r.status));
    if (filter?.kind?.length) runs = runs.filter((r) => filter.kind!.includes(r.kind));
    runs.sort((a, b) => (b.started_at ?? "").localeCompare(a.started_at ?? ""));
    if (filter?.limit) {
      const offset = filter.offset ?? 0;
      runs = runs.slice(offset, offset + filter.limit);
    }
    return runs;
  }

  // ---- Deviation ----

  recordDeviation(input: RecordDeviationInput): Deviation {
    const run = this.runCache.get(input.run_id);
    const caseId = run?.case_id ?? input.run_id; // fallback
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
    this.deviationCache.set(id, deviation);
    this.append(caseId, { type: "deviation.recorded", data: deviation });
    return deviation;
  }

  getDeviation(id: Id): Deviation | null {
    return this.deviationCache.get(id) ?? null;
  }

  listDeviations(runId: Id): Deviation[] {
    return Array.from(this.deviationCache.values()).filter((d) => d.run_id === runId);
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
    for (const devId of input.deviation_ids ?? []) {
      const dev = this.getDeviation(devId);
      if (dev && !allDeviations.find((d) => d.id === devId)) {
        allDeviations.push(dev);
      }
    }

    // Compute baseline comparability
    let baselineInfo: BaselineInfo = { comparable: false };
    if (input.baseline_run_ids && input.baseline_run_ids.length > 0) {
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
    this.evidenceCache.set(id, evidence);
    this.append(input.case_id, { type: "evidence.classified", data: evidence });

    // Transition case status from ready → observed when first evidence is classified
    const existingEvidence = Array.from(this.evidenceCache.values()).filter((e) => e.case_id === input.case_id);
    if (existingEvidence.length === 1) {
      // First evidence for this case
      const case_ = this.caseCache.get(input.case_id);
      if (case_ && case_.status === "ready") {
        this.caseCache.set(case_.id, { ...case_, status: "observed" });
        this.append(input.case_id, { type: "case.status_changed", data: { id: case_.id, status: "observed" } });
      }
    }

    return evidence;
  }

  getEvidence(id: Id): Evidence | null {
    return this.evidenceCache.get(id) ?? null;
  }

  listEvidence(caseId: Id): Evidence[] {
    this.ensureCaseLoaded(caseId);
    return Array.from(this.evidenceCache.values()).filter((e) => e.case_id === caseId);
  }

  // ---- Claim ----

  createClaim(input: CreateClaimInput): Claim {
    // Check max claims limit (default 5 per case)
    const MAX_CLAIMS_PER_CASE = 5;
    const existingClaims = this.listClaims(input.case_id);
    if (existingClaims.length >= MAX_CLAIMS_PER_CASE) {
      const { DecisionValidationError } = require("../../types/index.js");
      throw new DecisionValidationError(
        `Maximum claims limit (${MAX_CLAIMS_PER_CASE}) reached for case`,
        "MAX_CLAIMS_EXCEEDED",
        ["MAX_CLAIMS_EXCEEDED"],
        ["Archive or resolve existing claims before creating new ones"],
        { case_id: input.case_id, current_count: existingClaims.length, max_allowed: MAX_CLAIMS_PER_CASE }
      );
    }

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
    this.claimCache.set(id, claim);
    this.append(input.case_id, { type: "claim.created", data: claim });
    return claim;
  }

  getClaim(id: Id): Claim | null {
    return this.claimCache.get(id) ?? null;
  }

  listClaims(caseId: Id): Claim[] {
    this.ensureCaseLoaded(caseId);
    return Array.from(this.claimCache.values()).filter((c) => c.case_id === caseId);
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
      let evidenceCap = "none";

      if (!input.evidence_ids || input.evidence_ids.length === 0) {
        blockingInvariants.push("EVIDENCE_REQUIRED");
        suggestedActions.push("Classify evidence with 'mlspec evidence classify' before issuing decision");
      } else {
        // Check evidence grades
        const evidenceGrades = input.evidence_ids.map((evId) => this.getEvidence(evId)).filter(Boolean);
        const hasDecisionGrade = evidenceGrades.some(
          (ev) => ev && (ev.grade === "decision_grade" || ev.grade === "replicated")
        );
        evidenceCap = evidenceGrades.length > 0
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
    this.decisionCache.set(id, decision);
    this.append(input.case_id, { type: "decision.issued", data: decision });

    // Transition case status from observed → resolved when accept/reject decision is issued
    if (input.status === "accept" || input.status === "reject") {
      const case_ = this.caseCache.get(input.case_id);
      if (case_ && case_.status === "observed") {
        this.caseCache.set(case_.id, { ...case_, status: "resolved" });
        this.append(input.case_id, { type: "case.status_changed", data: { id: case_.id, status: "resolved" } });
      }
    }

    return decision;
  }

  getDecision(id: Id): Decision | null {
    return this.decisionCache.get(id) ?? null;
  }

  listDecisions(caseId: Id): Decision[] {
    this.ensureCaseLoaded(caseId);
    return Array.from(this.decisionCache.values())
      .filter((d) => d.case_id === caseId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
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
    const report = runAudit(scope, case_, runs, protocols, snapshots, evidence, claims, decisions, allDeviations);
    this.append(scope.case_id, { type: "audit.completed", data: report });
    return report;
  }

  // ---- Status ----

  status(scope: StatusScope): StatusReport {
    const case_ = this.getCase(scope.case_id);
    if (!case_) throw new Error(`Case not found: ${scope.case_id}`);
    const runs = this.listRuns({ case_id: scope.case_id });
    const byStatus: Record<string, number> = {};
    for (const run of runs) byStatus[run.status] = (byStatus[run.status] ?? 0) + 1;
    const evidence = this.listEvidence(scope.case_id);
    const byGrade: Record<string, number> = {};
    for (const ev of evidence) byGrade[ev.grade] = (byGrade[ev.grade] ?? 0) + 1;
    const decisions = this.listDecisions(scope.case_id);
    return {
      case_id: scope.case_id,
      case_status: case_.status,
      current_protocol_id: case_.current_protocol_id,
      runs: { total: runs.length, by_status: byStatus },
      evidence: { total: evidence.length, by_grade: byGrade },
      decisions: {
        total: decisions.length,
        latest: decisions[0] ? { status: decisions[0].status, created_at: decisions[0].created_at } : undefined,
      },
    };
  }
}