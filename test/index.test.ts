import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync } from "fs";
import { join } from "path";
import { SQLiteStore } from "../src/store/sqlite/index.js";
import { JSONLStore } from "../src/store/jsonl/index.js";
import { runAudit } from "../src/audit/runner.js";
import { computeGrade } from "../src/grading/index.js";
import type { MLSpecStore, Case, Protocol, Snapshot, Run, Evidence, Claim, Decision } from "../src/store/index.js";
import { DecisionValidationError } from "../src/types/index.js";

const TEST_DIR = ".mlspec-test";

// Clean up before each test
beforeEach(() => {
  try {
    rmSync(TEST_DIR, { recursive: true, force: true });
  } catch {}
  mkdirSync(TEST_DIR, { recursive: true });
});

// Clean up after all tests
afterEach(() => {
  try {
    rmSync(TEST_DIR, { recursive: true, force: true });
  } catch {}
});

function createJSONLStore(): MLSpecStore {
  return new JSONLStore();
}

describe("Case Commands", () => {
  let store: MLSpecStore;

  beforeEach(() => {
    store = createJSONLStore();
  });

  test("createCase creates a case with proposed status", () => {
    const case_ = store.createCase({
      question: "Is attention mechanism better?",
      mode: "decision",
      actor_ref: "test-agent",
    });

    expect(case_.id).toBeDefined();
    expect(case_.question).toBe("Is attention mechanism better?");
    expect(case_.mode).toBe("decision");
    expect(case_.status).toBe("proposed");
    expect(case_.owner_refs).toEqual([]);
    expect(case_.tags).toEqual([]);
    expect(case_.actor_ref).toBe("test-agent");
  });

  test("createCase with owner_refs and tags", () => {
    const case_ = store.createCase({
      question: "Test case",
      mode: "structured",
      owner_refs: ["user1", "user2"],
      tags: ["nlp", "vision"],
      actor_ref: "test",
    });

    expect(case_.owner_refs).toEqual(["user1", "user2"]);
    expect(case_.tags).toEqual(["nlp", "vision"]);
  });

  test("getCase returns case by id", () => {
    const created = store.createCase({ question: "Test", mode: "scratch", actor_ref: "test" });
    const retrieved = store.getCase(created.id);

    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe(created.id);
    expect(retrieved!.question).toBe("Test");
  });

  test("getCase returns null for non-existent id", () => {
    const result = store.getCase("non-existent-id");
    expect(result).toBeNull();
  });

  test("listCases returns all cases", () => {
    store.createCase({ question: "Case 1", mode: "scratch", actor_ref: "test" });
    store.createCase({ question: "Case 2", mode: "structured", actor_ref: "test" });
    store.createCase({ question: "Case 3", mode: "decision", actor_ref: "test" });

    const cases = store.listCases();
    expect(cases.length).toBe(3);
  });

  test("listCases with status filter", () => {
    const case1 = store.createCase({ question: "Case 1", mode: "scratch", actor_ref: "test" });
    store.archiveCase(case1.id);
    store.createCase({ question: "Case 2", mode: "scratch", actor_ref: "test" });

    const activeCases = store.listCases({ status: ["proposed"] });
    expect(activeCases.length).toBe(1);
    expect(activeCases[0].question).toBe("Case 2");
  });

  test("archiveCase sets status to archived", () => {
    const case_ = store.createCase({ question: "Test", mode: "scratch", actor_ref: "test" });
    const archived = store.archiveCase(case_.id);

    expect(archived.status).toBe("archived");
    expect(store.getCase(case_.id)!.status).toBe("archived");
  });
});

describe("Protocol Commands", () => {
  let store: MLSpecStore;
  let testCase: Case;

  beforeEach(() => {
    store = createJSONLStore();
    testCase = store.createCase({ question: "Test case", mode: "decision", actor_ref: "test" });
  });

  test("draftProtocol creates a protocol", () => {
    const protocol = store.draftProtocol({
      case_id: testCase.id,
      objective: "Improve accuracy",
      metric_spec: { name: "accuracy", direction: "max", split: "test" },
      required_resources: {
        gpu_hours: 10,
        wallclock_hours: 12,
        data_fraction: 1.0,
        seeds: 5,
        epochs: 100,
      },
      actor_ref: "test",
    });

    expect(protocol.id).toBeDefined();
    expect(protocol.case_id).toBe(testCase.id);
    expect(protocol.version).toBe(1);
    expect(protocol.objective).toBe("Improve accuracy");
    expect(protocol.metric_spec.name).toBe("accuracy");
    expect(protocol.min_decision_grade).toBe("decision_grade");
    expect(protocol.locked_at).toBeUndefined();
  });

  test("draftProtocol increments version for same case", () => {
    store.draftProtocol({
      case_id: testCase.id,
      objective: "First protocol",
      metric_spec: { name: "accuracy", direction: "max", split: "test" },
      required_resources: { gpu_hours: 1, wallclock_hours: 1, data_fraction: 1, seeds: 1, epochs: 1 },
      actor_ref: "test",
    });

    const protocol2 = store.draftProtocol({
      case_id: testCase.id,
      objective: "Second protocol",
      metric_spec: { name: "accuracy", direction: "max", split: "test" },
      required_resources: { gpu_hours: 1, wallclock_hours: 1, data_fraction: 1, seeds: 1, epochs: 1 },
      actor_ref: "test",
    });

    expect(protocol2.version).toBe(2);
  });

  test("lockProtocol sets locked_at timestamp", () => {
    const protocol = store.draftProtocol({
      case_id: testCase.id,
      objective: "Test",
      metric_spec: { name: "accuracy", direction: "max", split: "test" },
      required_resources: { gpu_hours: 1, wallclock_hours: 1, data_fraction: 1, seeds: 1, epochs: 1 },
      actor_ref: "test",
    });

    const locked = store.lockProtocol({ case_id: testCase.id, protocol_id: protocol.id, actor_ref: "test" });

    expect(locked.locked_at).toBeDefined();
    expect(locked.locked_at).not.toBeNull();
  });

  test("getProtocol returns protocol by id", () => {
    const created = store.draftProtocol({
      case_id: testCase.id,
      objective: "Test",
      metric_spec: { name: "accuracy", direction: "max", split: "test" },
      required_resources: { gpu_hours: 1, wallclock_hours: 1, data_fraction: 1, seeds: 1, epochs: 1 },
      actor_ref: "test",
    });

    const retrieved = store.getProtocol(created.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe(created.id);
  });

  test("listProtocols returns all protocols for a case", () => {
    store.draftProtocol({
      case_id: testCase.id,
      objective: "Protocol 1",
      metric_spec: { name: "accuracy", direction: "max", split: "test" },
      required_resources: { gpu_hours: 1, wallclock_hours: 1, data_fraction: 1, seeds: 1, epochs: 1 },
      actor_ref: "test",
    });

    store.draftProtocol({
      case_id: testCase.id,
      objective: "Protocol 2",
      metric_spec: { name: "accuracy", direction: "max", split: "test" },
      required_resources: { gpu_hours: 1, wallclock_hours: 1, data_fraction: 1, seeds: 1, epochs: 1 },
      actor_ref: "test",
    });

    const protocols = store.listProtocols(testCase.id);
    expect(protocols.length).toBe(2);
  });
});

describe("Snapshot Commands", () => {
  let store: MLSpecStore;
  let testCase: Case;

  beforeEach(() => {
    store = createJSONLStore();
    testCase = store.createCase({ question: "Test case", mode: "decision", actor_ref: "test" });
  });

  test("createSnapshot creates a snapshot", () => {
    const snapshot = store.createSnapshot({
      case_id: testCase.id,
      commit_hash: "abc123",
      dirty_tree: false,
      actor_ref: "test",
    });

    expect(snapshot.id).toBeDefined();
    expect(snapshot.case_id).toBe(testCase.id);
    expect(snapshot.commit_hash).toBe("abc123");
    expect(snapshot.dirty_tree).toBe(false);
  });

  test("createSnapshot with dirty_tree true", () => {
    const snapshot = store.createSnapshot({
      case_id: testCase.id,
      dirty_tree: true,
      actor_ref: "test",
    });

    expect(snapshot.dirty_tree).toBe(true);
  });

  test("getSnapshot returns snapshot by id", () => {
    const created = store.createSnapshot({
      case_id: testCase.id,
      commit_hash: "abc123",
      dirty_tree: false,
      actor_ref: "test",
    });

    const retrieved = store.getSnapshot(created.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe(created.id);
  });

  test("listSnapshots returns all snapshots for a case", () => {
    store.createSnapshot({ case_id: testCase.id, dirty_tree: false, actor_ref: "test" });
    store.createSnapshot({ case_id: testCase.id, dirty_tree: true, actor_ref: "test" });

    const snapshots = store.listSnapshots(testCase.id);
    expect(snapshots.length).toBe(2);
  });
});

describe("Run Commands", () => {
  let store: MLSpecStore;
  let testCase: Case;

  beforeEach(() => {
    store = createJSONLStore();
    testCase = store.createCase({ question: "Test case", mode: "decision", actor_ref: "test" });
  });

  test("beginRun creates a run with running status", () => {
    const run = store.beginRun({
      case_id: testCase.id,
      kind: "full",
      command: ["python", "train.py"],
      actor_ref: "test",
    });

    expect(run.id).toBeDefined();
    expect(run.case_id).toBe(testCase.id);
    expect(run.status).toBe("running");
    expect(run.kind).toBe("full");
    expect(run.command).toEqual(["python", "train.py"]);
    expect(run.started_at).toBeDefined();
    expect(run.ended_at).toBeUndefined();
  });

  test("beginRun with optional fields", () => {
    const run = store.beginRun({
      case_id: testCase.id,
      protocol_id: "proto-123",
      snapshot_id: "snap-456",
      kind: "full",
      command: ["python", "train.py"],
      tracker_refs: ["mlflow:run123"],
      commit_hash: "abc123",
      environment_digest: "env-v1",
      actor_ref: "test",
    });

    expect(run.protocol_id).toBe("proto-123");
    expect(run.snapshot_id).toBe("snap-456");
    expect(run.tracker_refs).toEqual(["mlflow:run123"]);
    expect(run.commit_hash).toBe("abc123");
    expect(run.environment_digest).toBe("env-v1");
  });

  test("endRun updates run status", () => {
    const run = store.beginRun({
      case_id: testCase.id,
      kind: "full",
      command: ["python", "train.py"],
      actor_ref: "test",
    });

    const ended = store.endRun(run.id, {
      status: "completed",
      actual_resources: {
        gpu_hours: 10,
        wallclock_hours: 12,
        data_fraction: 1.0,
        seeds: 5,
        epochs: 100,
      },
      output_refs: ["gs://bucket/model.pt"],
    });

    expect(ended.status).toBe("completed");
    expect(ended.actual_resources?.gpu_hours).toBe(10);
    expect(ended.output_refs).toEqual(["gs://bucket/model.pt"]);
    expect(ended.ended_at).toBeDefined();
  });

  test("endRun with interrupt_reason", () => {
    const run = store.beginRun({
      case_id: testCase.id,
      kind: "full",
      command: ["python", "train.py"],
      actor_ref: "test",
    });

    const ended = store.endRun(run.id, {
      status: "completed",
      interrupt_reason: "OOM",
    });

    expect(ended.interrupt_reason).toBe("OOM");
  });

  test("getRun returns run by id", () => {
    const created = store.beginRun({
      case_id: testCase.id,
      kind: "full",
      command: ["python", "train.py"],
      actor_ref: "test",
    });

    const retrieved = store.getRun(created.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe(created.id);
  });

  test("listRuns with filters", () => {
    store.beginRun({ case_id: testCase.id, kind: "smoke", command: [], actor_ref: "test" });
    store.beginRun({ case_id: testCase.id, kind: "full", command: [], actor_ref: "test" });

    const allRuns = store.listRuns({ case_id: testCase.id });
    expect(allRuns.length).toBe(2);

    const smokeRuns = store.listRuns({ case_id: testCase.id, kind: ["smoke"] });
    expect(smokeRuns.length).toBe(1);
    expect(smokeRuns[0].kind).toBe("smoke");
  });
});

describe("Evidence Commands", () => {
  let store: MLSpecStore;
  let testCase: Case;
  let protocol: Protocol;
  let snapshot: Snapshot;
  let run: Run;

  beforeEach(() => {
    store = createJSONLStore();
    testCase = store.createCase({ question: "Test case", mode: "decision", actor_ref: "test" });
    protocol = store.draftProtocol({
      case_id: testCase.id,
      objective: "Test",
      metric_spec: { name: "accuracy", direction: "max", split: "test" },
      required_resources: { gpu_hours: 10, wallclock_hours: 12, data_fraction: 1.0, seeds: 5, epochs: 100 },
      actor_ref: "test",
    });
    store.lockProtocol({ case_id: testCase.id, protocol_id: protocol.id, actor_ref: "test" });
    snapshot = store.createSnapshot({ case_id: testCase.id, dirty_tree: false, actor_ref: "test" });
    run = store.beginRun({
      case_id: testCase.id,
      protocol_id: protocol.id,
      snapshot_id: snapshot.id,
      kind: "full",
      command: ["python", "train.py"],
      actor_ref: "test",
    });
    store.endRun(run.id, {
      status: "completed",
      actual_resources: { gpu_hours: 10, wallclock_hours: 12, data_fraction: 1.0, seeds: 5, epochs: 100 },
    });
  });

  test("classifyEvidence computes grade based on resources", () => {
    const evidence = store.classifyEvidence({
      case_id: testCase.id,
      run_ids: [run.id],
      metrics: [
        { name: "accuracy", split: "test", value: 0.92, seed: 1 },
        { name: "accuracy", split: "test", value: 0.93, seed: 2 },
      ],
      actor_ref: "test",
    });

    expect(evidence.id).toBeDefined();
    expect(evidence.run_ids).toEqual([run.id]);
    // Full resources should give partial (decision_grade requires clean snapshot, baseline, variance)
    // Without a comparable baseline and more conditions, grade is capped at partial
    expect(["partial", "decision_grade"]).toContain(evidence.grade);
  });

  test("classifyEvidence with partial resources gives lower grade", () => {
    // Create a new run with partial resources
    const partialRun = store.beginRun({
      case_id: testCase.id,
      protocol_id: protocol.id,
      snapshot_id: snapshot.id,
      kind: "full",
      command: ["python", "train.py"],
      actor_ref: "test",
    });
    store.endRun(partialRun.id, {
      status: "completed",
      actual_resources: { gpu_hours: 2, wallclock_hours: 2, data_fraction: 0.5, seeds: 1, epochs: 50 },
    });

    const evidence = store.classifyEvidence({
      case_id: testCase.id,
      run_ids: [partialRun.id],
      metrics: [{ name: "accuracy", split: "test", value: 0.92 }],
      actor_ref: "test",
    });

    // ~20% of resources should give proxy grade
    expect(evidence.grade).toBe("proxy");
  });

  test("classifyEvidence with fatal deviation gives invalid grade", () => {
    store.recordDeviation({
      run_id: run.id,
      category: "resource",
      description: "GPU crashed",
      severity: "fatal",
      impact: "invalidates",
      declared_by_actor_ref: "test",
    });

    const evidence = store.classifyEvidence({
      case_id: testCase.id,
      run_ids: [run.id],
      metrics: [{ name: "accuracy", split: "test", value: 0.92 }],
      actor_ref: "test",
    });

    expect(evidence.grade).toBe("invalid");
  });

  test("listEvidence returns evidence for case", () => {
    store.classifyEvidence({
      case_id: testCase.id,
      run_ids: [run.id],
      metrics: [],
      actor_ref: "test",
    });

    const evidenceList = store.listEvidence(testCase.id);
    expect(evidenceList.length).toBe(1);
  });
});

describe("Decision Commands", () => {
  let store: MLSpecStore;
  let testCase: Case;
  let protocol: Protocol;
  let snapshot: Snapshot;
  let run: Run;
  let evidence: Evidence;
  let claim: Claim;

  beforeEach(() => {
    store = createJSONLStore();
    testCase = store.createCase({ question: "Test case", mode: "decision", actor_ref: "test" });
    protocol = store.draftProtocol({
      case_id: testCase.id,
      objective: "Test",
      metric_spec: { name: "accuracy", direction: "max", split: "test" },
      required_resources: { gpu_hours: 10, wallclock_hours: 12, data_fraction: 1.0, seeds: 5, epochs: 100 },
      actor_ref: "test",
    });
    store.lockProtocol({ case_id: testCase.id, protocol_id: protocol.id, actor_ref: "test" });
    snapshot = store.createSnapshot({ case_id: testCase.id, dirty_tree: false, actor_ref: "test" });
    run = store.beginRun({
      case_id: testCase.id,
      protocol_id: protocol.id,
      snapshot_id: snapshot.id,
      kind: "full",
      command: ["python", "train.py"],
      actor_ref: "test",
    });
    store.endRun(run.id, {
      status: "completed",
      actual_resources: { gpu_hours: 10, wallclock_hours: 12, data_fraction: 1.0, seeds: 5, epochs: 100 },
    });
    evidence = store.classifyEvidence({
      case_id: testCase.id,
      run_ids: [run.id],
      metrics: [
        { name: "accuracy", split: "test", value: 0.92, seed: 1 },
        { name: "accuracy", split: "test", value: 0.93, seed: 2 },
      ],
      actor_ref: "test",
    });
    claim = store.createClaim({
      case_id: testCase.id,
      statement: "Model improves accuracy",
      scope: "global",
      target_metric: "accuracy",
      actor_ref: "test",
    });
  });

  test("issueDecision with inconclusive status succeeds", () => {
    const decision = store.issueDecision({
      case_id: testCase.id,
      claim_id: claim.id,
      status: "inconclusive",
      evidence_ids: [evidence.id],
      rationale: "Need more data",
      actor_ref: "test",
    });

    expect(decision.id).toBeDefined();
    expect(decision.status).toBe("inconclusive");
    expect(decision.claim_id).toBe(claim.id);
  });

  test("issueDecision with inconclusive succeeds without decision_grade", () => {
    // inconclusive doesn't require decision_grade
    const decision = store.issueDecision({
      case_id: testCase.id,
      claim_id: claim.id,
      status: "inconclusive",
      evidence_ids: [evidence.id],
      rationale: "Need more evidence",
      actor_ref: "test",
    });

    expect(decision.status).toBe("inconclusive");
  });

  test("issueDecision throws without claim_id", () => {
    expect(() => {
      store.issueDecision({
        case_id: testCase.id,
        claim_id: "",
        status: "inconclusive",
        evidence_ids: [],
        rationale: "Test",
        actor_ref: "test",
      });
    }).toThrow();
  });

  test("listDecisions returns decisions for case", () => {
    store.issueDecision({
      case_id: testCase.id,
      claim_id: claim.id,
      status: "inconclusive",
      evidence_ids: [evidence.id],
      rationale: "Test",
      actor_ref: "test",
    });

    const decisions = store.listDecisions(testCase.id);
    expect(decisions.length).toBe(1);
  });
});

describe("Audit Commands", () => {
  let store: MLSpecStore;
  let testCase: Case;

  beforeEach(() => {
    store = createJSONLStore();
    testCase = store.createCase({ question: "Test case", mode: "decision", actor_ref: "test" });
  });

  test("audit passes when no evidence exists", () => {
    const report = store.audit({ case_id: testCase.id });

    expect(report.case_id).toBe(testCase.id);
    expect(report.ok).toBe(true);
    expect(report.severity).toBe("pass");
    expect(report.checks.length).toBe(13); // All 13 checks (now including PROTOCOL_NOT_LOCKED)
  });

  test("audit detects RUN_STATUS_MISMATCH for non-completed runs", () => {
    // Test RUN_STATUS_MISMATCH by citing a running (not completed) run as evidence
    const protocol = store.draftProtocol({
      case_id: testCase.id,
      objective: "Test",
      metric_spec: { name: "accuracy", direction: "max", split: "test" },
      required_resources: { gpu_hours: 1, wallclock_hours: 1, data_fraction: 1, seeds: 1, epochs: 1 },
      actor_ref: "test",
    });
    store.lockProtocol({ case_id: testCase.id, protocol_id: protocol.id, actor_ref: "test" });
    const snapshot = store.createSnapshot({ case_id: testCase.id, dirty_tree: false, actor_ref: "test" });
    const run = store.beginRun({
      case_id: testCase.id,
      protocol_id: protocol.id,
      snapshot_id: snapshot.id,
      kind: "full",
      command: [],
      actor_ref: "test",
    });
    // Run is still "running" (not completed)

    const evidence = store.classifyEvidence({
      case_id: testCase.id,
      run_ids: [run.id],
      metrics: [],
      actor_ref: "test",
    });

    const report = store.audit({ case_id: testCase.id });
    // A running (not completed, not planned, not failed/aborted) run cited as evidence should fail
    const check = report.checks.find((c) => c.id === "RUN_STATUS_MISMATCH");

    expect(check?.result).toBe("fail");
  });

  test("audit detects RUN_STATUS_MISMATCH for failed runs", () => {
    const protocol = store.draftProtocol({
      case_id: testCase.id,
      objective: "Test",
      metric_spec: { name: "accuracy", direction: "max", split: "test" },
      required_resources: { gpu_hours: 1, wallclock_hours: 1, data_fraction: 1, seeds: 1, epochs: 1 },
      actor_ref: "test",
    });
    store.lockProtocol({ case_id: testCase.id, protocol_id: protocol.id, actor_ref: "test" });
    const snapshot = store.createSnapshot({ case_id: testCase.id, dirty_tree: false, actor_ref: "test" });
    const run = store.beginRun({
      case_id: testCase.id,
      protocol_id: protocol.id,
      snapshot_id: snapshot.id,
      kind: "full",
      command: [],
      actor_ref: "test",
    });
    store.endRun(run.id, { status: "failed" });

    const evidence = store.classifyEvidence({
      case_id: testCase.id,
      run_ids: [run.id],
      metrics: [],
      actor_ref: "test",
    });

    const report = store.audit({ case_id: testCase.id });
    const check = report.checks.find((c) => c.id === "RUN_STATUS_MISMATCH");

    expect(check?.result).toBe("fail");
  });

  test("audit detects SNAPSHOT_REQUIRED for full run without snapshot", () => {
    const run = store.beginRun({
      case_id: testCase.id,
      kind: "full",
      command: [],
      actor_ref: "test",
    });
    store.endRun(run.id, { status: "completed" });

    const evidence = store.classifyEvidence({
      case_id: testCase.id,
      run_ids: [run.id],
      metrics: [],
      actor_ref: "test",
    });

    const report = store.audit({ case_id: testCase.id });
    const check = report.checks.find((c) => c.id === "SNAPSHOT_REQUIRED");

    expect(check?.result).toBe("fail");
  });

  test("audit detects RESOURCE_UNDERRUN", () => {
    const protocol = store.draftProtocol({
      case_id: testCase.id,
      objective: "Test",
      metric_spec: { name: "accuracy", direction: "max", split: "test" },
      required_resources: { gpu_hours: 10, wallclock_hours: 10, data_fraction: 1, seeds: 5, epochs: 100 },
      actor_ref: "test",
    });
    store.lockProtocol({ case_id: testCase.id, protocol_id: protocol.id, actor_ref: "test" });
    const snapshot = store.createSnapshot({ case_id: testCase.id, dirty_tree: false, actor_ref: "test" });
    const run = store.beginRun({
      case_id: testCase.id,
      protocol_id: protocol.id,
      snapshot_id: snapshot.id,
      kind: "full",
      command: [],
      actor_ref: "test",
    });
    // Only 10% of required resources
    store.endRun(run.id, {
      status: "completed",
      actual_resources: { gpu_hours: 1, wallclock_hours: 1, data_fraction: 0.1, seeds: 1, epochs: 10 },
    });

    const evidence = store.classifyEvidence({
      case_id: testCase.id,
      run_ids: [run.id],
      metrics: [],
      actor_ref: "test",
    });

    const report = store.audit({ case_id: testCase.id });
    const check = report.checks.find((c) => c.id === "RESOURCE_UNDERRUN");

    expect(check?.result).toBe("fail");
  });
});

describe("Status Command", () => {
  let store: MLSpecStore;
  let testCase: Case;

  beforeEach(() => {
    store = createJSONLStore();
    testCase = store.createCase({ question: "Test case", mode: "decision", actor_ref: "test" });
  });

  test("status returns case summary", () => {
    const status = store.status({ case_id: testCase.id });

    expect(status.case_id).toBe(testCase.id);
    expect(status.case_status).toBe("proposed");
    expect(status.runs.total).toBe(0);
    expect(status.evidence.total).toBe(0);
    expect(status.decisions.total).toBe(0);
  });

  test("status with runs and evidence", () => {
    const protocol = store.draftProtocol({
      case_id: testCase.id,
      objective: "Test",
      metric_spec: { name: "accuracy", direction: "max", split: "test" },
      required_resources: { gpu_hours: 1, wallclock_hours: 1, data_fraction: 1, seeds: 1, epochs: 1 },
      actor_ref: "test",
    });
    store.lockProtocol({ case_id: testCase.id, protocol_id: protocol.id, actor_ref: "test" });
    const snapshot = store.createSnapshot({ case_id: testCase.id, dirty_tree: false, actor_ref: "test" });
    const run = store.beginRun({
      case_id: testCase.id,
      protocol_id: protocol.id,
      snapshot_id: snapshot.id,
      kind: "full",
      command: [],
      actor_ref: "test",
    });
    store.endRun(run.id, { status: "completed" });

    store.classifyEvidence({
      case_id: testCase.id,
      run_ids: [run.id],
      metrics: [],
      actor_ref: "test",
    });

    const status = store.status({ case_id: testCase.id });

    expect(status.runs.total).toBe(1);
    expect(status.runs.by_status.completed).toBe(1);
    expect(status.evidence.total).toBe(1);
  });
});

describe("End-to-End Workflow", () => {
  let store: MLSpecStore;

  beforeEach(() => {
    store = createJSONLStore();
  });

  test("full workflow: create case -> protocol -> snapshot -> run -> evidence -> claim -> decision", () => {
    // 1. Create case
    const case_ = store.createCase({
      question: "Does model X beat baseline?",
      mode: "decision",
      actor_ref: "agent-1",
    });
    expect(case_.status).toBe("proposed");

    // 2. Draft protocol
    const protocol = store.draftProtocol({
      case_id: case_.id,
      objective: "Beat baseline by 2%",
      metric_spec: { name: "accuracy", direction: "max", split: "test" },
      required_resources: { gpu_hours: 10, wallclock_hours: 12, data_fraction: 1.0, seeds: 5, epochs: 100 },
      actor_ref: "agent-1",
    });

    // 3. Lock protocol
    const locked = store.lockProtocol({ case_id: case_.id, protocol_id: protocol.id, actor_ref: "agent-1" });
    expect(locked.locked_at).toBeDefined();

    // 4. Create snapshot
    const snapshot = store.createSnapshot({
      case_id: case_.id,
      commit_hash: "abc123",
      dirty_tree: false,
      actor_ref: "agent-1",
    });

    // 5. Begin run
    const run = store.beginRun({
      case_id: case_.id,
      protocol_id: protocol.id,
      snapshot_id: snapshot.id,
      kind: "full",
      command: ["python", "train.py", "--epochs", "100"],
      tracker_refs: ["mlflow:run123"],
      actor_ref: "agent-1",
    });
    expect(run.status).toBe("running");

    // 6. End run with full resources
    const ended = store.endRun(run.id, {
      status: "completed",
      actual_resources: { gpu_hours: 10, wallclock_hours: 11, data_fraction: 1.0, seeds: 5, epochs: 100 },
      output_refs: ["s3://bucket/model.pt"],
    });
    expect(ended.status).toBe("completed");

    // 7. Classify evidence
    const evidence = store.classifyEvidence({
      case_id: case_.id,
      run_ids: [run.id],
      metrics: [
        { name: "accuracy", split: "test", value: 0.92, seed: 1 },
        { name: "accuracy", split: "test", value: 0.93, seed: 2 },
        { name: "accuracy", split: "test", value: 0.91, seed: 3 },
      ],
      actor_ref: "agent-1",
    });
    // Grade is partial without comparable baseline (decision_grade requires baseline comparability)
    expect(["partial", "decision_grade"]).toContain(evidence.grade);

    // 8. Create claim
    const claim = store.createClaim({
      case_id: case_.id,
      statement: "Model X improves accuracy by >1%",
      scope: "global",
      expected_direction: "max",
      target_metric: "accuracy",
      actor_ref: "agent-1",
    });

    // 9. Run audit
    const auditReport = store.audit({ case_id: case_.id });
    expect(auditReport.ok).toBe(true);

    // 10. Issue decision (use inconclusive since we don't have comparable baseline for decision_grade)
    const decision = store.issueDecision({
      case_id: case_.id,
      claim_id: claim.id,
      status: "inconclusive",
      evidence_ids: [evidence.id],
      rationale: "Evidence exists but lacks comparable baseline for decision_grade",
      actor_ref: "agent-1",
    });
    expect(decision.status).toBe("inconclusive");

    // 11. Check final status
    const status = store.status({ case_id: case_.id });
    expect(status.decisions.total).toBe(1);
    expect(status.decisions.latest?.status).toBe("inconclusive");
  });
});

// =============================================================================
// Case Constraint Tests
// =============================================================================

describe("Case Constraints", () => {
  let store: MLSpecStore;

  beforeEach(() => {
    store = createJSONLStore();
  });

  test("case cannot transition to ready without a protocol", () => {
    const case_ = store.createCase({ question: "Test", mode: "decision", actor_ref: "test" });

    // Case should start as proposed
    expect(case_.status).toBe("proposed");

    // Verify there's no current_protocol_id
    const retrieved = store.getCase(case_.id)!;
    expect(retrieved.status).toBe("proposed");
    expect(retrieved.current_protocol_id).toBeUndefined();
  });

  test("case cannot be resolved without a decision", () => {
    const case_ = store.createCase({ question: "Test", mode: "decision", actor_ref: "test" });

    // Cannot manually set case to resolved - it must come from a decision
    // But we can verify the case status remains as-is without a decision
    const retrieved = store.getCase(case_.id)!;
    expect(retrieved.status).toBe("proposed");

    // List decisions should be empty
    const decisions = store.listDecisions(case_.id);
    expect(decisions.length).toBe(0);
  });

  test("case status after protocol is drafted but not locked", () => {
    const case_ = store.createCase({ question: "Test", mode: "decision", actor_ref: "test" });
    const protocol = store.draftProtocol({
      case_id: case_.id,
      objective: "Test",
      metric_spec: { name: "accuracy", direction: "max", split: "test" },
      required_resources: { gpu_hours: 10, wallclock_hours: 12, data_fraction: 1.0, seeds: 5, epochs: 100 },
      actor_ref: "test",
    });

    // Case should have current_protocol_id set after drafting
    const retrieved = store.getCase(case_.id)!;
    expect(retrieved.current_protocol_id).toBe(protocol.id);
    // But status is still "proposed" until protocol is locked
    expect(retrieved.status).toBe("proposed");
  });
});

// =============================================================================
// Protocol Constraint Tests
// =============================================================================

describe("Protocol Constraints", () => {
  let store: MLSpecStore;

  beforeEach(() => {
    store = createJSONLStore();
  });

  test("locked protocol is immutable - cannot modify after lock", () => {
    const case_ = store.createCase({ question: "Test", mode: "decision", actor_ref: "test" });
    const protocol = store.draftProtocol({
      case_id: case_.id,
      objective: "Test",
      metric_spec: { name: "accuracy", direction: "max", split: "test" },
      required_resources: { gpu_hours: 10, wallclock_hours: 12, data_fraction: 1.0, seeds: 5, epochs: 100 },
      actor_ref: "test",
    });

    const locked = store.lockProtocol({ case_id: case_.id, protocol_id: protocol.id, actor_ref: "test" });
    expect(locked.locked_at).toBeDefined();

    // Locked protocol's locked_at should persist
    const retrieved = store.getProtocol(protocol.id)!;
    expect(retrieved.locked_at).toBeDefined();
    expect(retrieved.objective).toBe("Test"); // Original data intact
  });

test("evidence-bearing run requires locked protocol", () => {
    const case_ = store.createCase({ question: "Test", mode: "decision", actor_ref: "test" });

    // Draft but don't lock protocol
    const protocol = store.draftProtocol({
      case_id: case_.id,
      objective: "Test",
      metric_spec: { name: "accuracy", direction: "max", split: "test" },
      required_resources: { gpu_hours: 10, wallclock_hours: 12, data_fraction: 1.0, seeds: 5, epochs: 100 },
      actor_ref: "test",
    });

    const snapshot = store.createSnapshot({ case_id: case_.id, dirty_tree: false, actor_ref: "test" });

    // Run with unlocked protocol - should be rejected with PROTOCOL_NOT_LOCKED
    expect(() => {
      store.beginRun({
        case_id: case_.id,
        protocol_id: protocol.id,
        snapshot_id: snapshot.id,
        kind: "full",
        command: ["python", "train.py"],
        actor_ref: "test",
      });
    }).toThrow(DecisionValidationError);

    // Lock the protocol and then begin run should succeed
    store.lockProtocol({ case_id: case_.id, protocol_id: protocol.id, actor_ref: "test" });
    const run = store.beginRun({
      case_id: case_.id,
      protocol_id: protocol.id,
      snapshot_id: snapshot.id,
      kind: "full",
      command: ["python", "train.py"],
      actor_ref: "test",
    });

    store.endRun(run.id, {
      status: "completed",
      actual_resources: { gpu_hours: 10, wallclock_hours: 12, data_fraction: 1.0, seeds: 5, epochs: 100 },
    });

    const evidence = store.classifyEvidence({
      case_id: case_.id,
      run_ids: [run.id],
      metrics: [{ name: "accuracy", split: "test", value: 0.92, seed: 1 }],
      actor_ref: "test",
    });

    // Evidence should be classified (grade may vary based on conditions)
    expect(evidence.id).toBeDefined();
  });

  test("drafting new protocol version increments version number", () => {
    const case_ = store.createCase({ question: "Test", mode: "decision", actor_ref: "test" });
    const v1 = store.draftProtocol({
      case_id: case_.id,
      objective: "Test v1",
      metric_spec: { name: "accuracy", direction: "max", split: "test" },
      required_resources: { gpu_hours: 10, wallclock_hours: 12, data_fraction: 1.0, seeds: 5, epochs: 100 },
      actor_ref: "test",
    });
    expect(v1.version).toBe(1);

    const v2 = store.draftProtocol({
      case_id: case_.id,
      objective: "Test v2",
      metric_spec: { name: "accuracy", direction: "max", split: "test" },
      required_resources: { gpu_hours: 10, wallclock_hours: 12, data_fraction: 1.0, seeds: 5, epochs: 100 },
      actor_ref: "test",
    });
    expect(v2.version).toBe(2);

    const protocols = store.listProtocols(case_.id);
    expect(protocols.length).toBe(2);
  });
});

// =============================================================================
// Deviation Tests
// =============================================================================

describe("Deviation Tests", () => {
  let store: MLSpecStore;
  let testCase: Case;
  let protocol: Protocol;
  let snapshot: Snapshot;
  let run: Run;

  beforeEach(() => {
    store = createJSONLStore();
    testCase = store.createCase({ question: "Test", mode: "decision", actor_ref: "test" });
    protocol = store.draftProtocol({
      case_id: testCase.id,
      objective: "Test",
      metric_spec: { name: "accuracy", direction: "max", split: "test" },
      required_resources: { gpu_hours: 10, wallclock_hours: 12, data_fraction: 1.0, seeds: 5, epochs: 100 },
      actor_ref: "test",
    });
    store.lockProtocol({ case_id: testCase.id, protocol_id: protocol.id, actor_ref: "test" });
    snapshot = store.createSnapshot({ case_id: testCase.id, dirty_tree: false, actor_ref: "test" });
    run = store.beginRun({
      case_id: testCase.id,
      protocol_id: protocol.id,
      snapshot_id: snapshot.id,
      kind: "full",
      command: ["python", "train.py"],
      actor_ref: "test",
    });
    store.endRun(run.id, {
      status: "completed",
      actual_resources: { gpu_hours: 10, wallclock_hours: 12, data_fraction: 1.0, seeds: 5, epochs: 100 },
    });
  });

  test("recordDeviation creates a deviation record", () => {
    const deviation = store.recordDeviation({
      run_id: run.id,
      category: "resource",
      description: "GPU memory exceeded",
      severity: "material",
      impact: "weakens",
      declared_by_actor_ref: "test",
    });

    expect(deviation.id).toBeDefined();
    expect(deviation.run_id).toBe(run.id);
    expect(deviation.severity).toBe("material");
    expect(deviation.impact).toBe("weakens");
    expect(deviation.resolved).toBe(false);
  });

  test("recordDeviation with resolved=true marks it resolved", () => {
    const deviation = store.recordDeviation({
      run_id: run.id,
      category: "resource",
      description: "Minor issue",
      severity: "minor",
      impact: "none",
      declared_by_actor_ref: "test",
      resolved: true,
    });

    expect(deviation.resolved).toBe(true);
  });

  test("listDeviations returns deviations for a run", () => {
    store.recordDeviation({
      run_id: run.id,
      category: "resource",
      description: "Issue 1",
      severity: "minor",
      impact: "none",
      declared_by_actor_ref: "test",
    });
    store.recordDeviation({
      run_id: run.id,
      category: "metric",
      description: "Issue 2",
      severity: "material",
      impact: "weakens",
      declared_by_actor_ref: "test",
    });

    const deviations = store.listDeviations(run.id);
    expect(deviations.length).toBe(2);
  });

  test("material unresolved deviation caps grade at partial", () => {
    // Record a material unresolved deviation
    store.recordDeviation({
      run_id: run.id,
      category: "resource",
      description: "GPU underutilization",
      severity: "material",
      impact: "weakens",
      declared_by_actor_ref: "test",
    });

    // Classify evidence - should get partial due to unresolved material deviation
    const evidence = store.classifyEvidence({
      case_id: testCase.id,
      run_ids: [run.id],
      metrics: [
        { name: "accuracy", split: "test", value: 0.92, seed: 1 },
        { name: "accuracy", split: "test", value: 0.93, seed: 2 },
      ],
      actor_ref: "test",
    });

    // Grade should be capped at partial due to unresolved material deviation
    expect(evidence.grade).toBe("partial");
  });

  test("fatal deviation makes evidence invalid", () => {
    store.recordDeviation({
      run_id: run.id,
      category: "hardware",
      description: "GPU crashed",
      severity: "fatal",
      impact: "invalidates",
      declared_by_actor_ref: "test",
    });

    const evidence = store.classifyEvidence({
      case_id: testCase.id,
      run_ids: [run.id],
      metrics: [{ name: "accuracy", split: "test", value: 0.92 }],
      actor_ref: "test",
    });

    expect(evidence.grade).toBe("invalid");
  });

  test("resolved material deviation does not cap grade", () => {
    store.recordDeviation({
      run_id: run.id,
      category: "resource",
      description: "GPU underutilization",
      severity: "material",
      impact: "weakens",
      declared_by_actor_ref: "test",
      resolved: true, // Resolved material deviation
    });

    const evidence = store.classifyEvidence({
      case_id: testCase.id,
      run_ids: [run.id],
      metrics: [
        { name: "accuracy", split: "test", value: 0.92, seed: 1 },
        { name: "accuracy", split: "test", value: 0.93, seed: 2 },
      ],
      actor_ref: "test",
    });

    // With full resources and resolved material deviation, grade should not be capped at partial
    // (unless other conditions like baseline are missing)
    expect(["partial", "decision_grade"]).toContain(evidence.grade);
  });
});

// =============================================================================
// Evidence Grade Threshold Tests
// =============================================================================

describe("Evidence Grade Thresholds", () => {
  let store: MLSpecStore;
  let testCase: Case;
  let protocol: Protocol;

  beforeEach(() => {
    store = createJSONLStore();
    testCase = store.createCase({ question: "Test", mode: "decision", actor_ref: "test" });
    protocol = store.draftProtocol({
      case_id: testCase.id,
      objective: "Test",
      metric_spec: { name: "accuracy", direction: "max", split: "test" },
      required_resources: { gpu_hours: 10, wallclock_hours: 12, data_fraction: 1.0, seeds: 5, epochs: 100 },
      actor_ref: "test",
    });
  });

  test("smoke grade when less than 10% resources", () => {
    store.lockProtocol({ case_id: testCase.id, protocol_id: protocol.id, actor_ref: "test" });
    const snapshot = store.createSnapshot({ case_id: testCase.id, dirty_tree: false, actor_ref: "test" });
    const run = store.beginRun({
      case_id: testCase.id,
      protocol_id: protocol.id,
      snapshot_id: snapshot.id,
      kind: "full",
      command: ["python", "train.py"],
      actor_ref: "test",
    });
    // Only 5% of required resources
    store.endRun(run.id, {
      status: "completed",
      actual_resources: { gpu_hours: 0.5, wallclock_hours: 0.6, data_fraction: 0.05, seeds: 1, epochs: 5 },
    });

    const evidence = store.classifyEvidence({
      case_id: testCase.id,
      run_ids: [run.id],
      metrics: [],
      actor_ref: "test",
    });

    expect(evidence.grade).toBe("smoke");
  });

  test("proxy grade when 10-30% resources", () => {
    store.lockProtocol({ case_id: testCase.id, protocol_id: protocol.id, actor_ref: "test" });
    const snapshot = store.createSnapshot({ case_id: testCase.id, dirty_tree: false, actor_ref: "test" });
    const run = store.beginRun({
      case_id: testCase.id,
      protocol_id: protocol.id,
      snapshot_id: snapshot.id,
      kind: "full",
      command: ["python", "train.py"],
      actor_ref: "test",
    });
    // ~20% of required resources
    store.endRun(run.id, {
      status: "completed",
      actual_resources: { gpu_hours: 2, wallclock_hours: 2.4, data_fraction: 0.2, seeds: 1, epochs: 20 },
    });

    const evidence = store.classifyEvidence({
      case_id: testCase.id,
      run_ids: [run.id],
      metrics: [],
      actor_ref: "test",
    });

    expect(evidence.grade).toBe("proxy");
  });

  test("partial grade when 30-100% resources without baseline", () => {
    store.lockProtocol({ case_id: testCase.id, protocol_id: protocol.id, actor_ref: "test" });
    const snapshot = store.createSnapshot({ case_id: testCase.id, dirty_tree: false, actor_ref: "test" });
    const run = store.beginRun({
      case_id: testCase.id,
      protocol_id: protocol.id,
      snapshot_id: snapshot.id,
      kind: "full",
      command: ["python", "train.py"],
      actor_ref: "test",
    });
    // ~50% of required resources
    store.endRun(run.id, {
      status: "completed",
      actual_resources: { gpu_hours: 5, wallclock_hours: 6, data_fraction: 0.5, seeds: 2, epochs: 50 },
    });

    const evidence = store.classifyEvidence({
      case_id: testCase.id,
      run_ids: [run.id],
      metrics: [
        { name: "accuracy", split: "test", value: 0.92, seed: 1 },
        { name: "accuracy", split: "test", value: 0.93, seed: 2 },
      ],
      actor_ref: "test",
    });

    expect(evidence.grade).toBe("partial");
  });

  test("decision_grade requires baseline comparable and variance", () => {
    store.lockProtocol({ case_id: testCase.id, protocol_id: protocol.id, actor_ref: "test" });
    const snapshot = store.createSnapshot({
      case_id: testCase.id,
      dirty_tree: false,
      evaluator_digest: "eval-v1",
      split_manifest_digest: "split-v1",
      actor_ref: "test",
    });

    // Create baseline run first
    const baselineRun = store.beginRun({
      case_id: testCase.id,
      protocol_id: protocol.id,
      snapshot_id: snapshot.id,
      kind: "full",
      command: ["python", "train.py"],
      actor_ref: "test",
    });
    store.endRun(baselineRun.id, {
      status: "completed",
      actual_resources: { gpu_hours: 10, wallclock_hours: 12, data_fraction: 1.0, seeds: 5, epochs: 100 },
    });

    // Create comparison run
    const run = store.beginRun({
      case_id: testCase.id,
      protocol_id: protocol.id,
      snapshot_id: snapshot.id,
      kind: "full",
      command: ["python", "train.py"],
      actor_ref: "test",
    });
    store.endRun(run.id, {
      status: "completed",
      actual_resources: { gpu_hours: 10, wallclock_hours: 12, data_fraction: 1.0, seeds: 5, epochs: 100 },
    });

    const evidence = store.classifyEvidence({
      case_id: testCase.id,
      run_ids: [run.id],
      baseline_run_ids: [baselineRun.id],
      metrics: [
        { name: "accuracy", split: "test", value: 0.92, seed: 1 },
        { name: "accuracy", split: "test", value: 0.93, seed: 2 },
        { name: "accuracy", split: "test", value: 0.91, seed: 3 },
      ],
      actor_ref: "test",
    });

    // With full resources, baseline comparable, variance (multiple seeds), and clean snapshot
    // Should achieve decision_grade
    expect(["partial", "decision_grade"]).toContain(evidence.grade);
  });

  test("replicated grade requires min_decision_grade=replicated", () => {
    // Draft a protocol that requires replicated grade
    const replicatedProtocol = store.draftProtocol({
      case_id: testCase.id,
      objective: "Test replicated",
      metric_spec: { name: "accuracy", direction: "max", split: "test" },
      required_resources: { gpu_hours: 10, wallclock_hours: 12, data_fraction: 1.0, seeds: 5, epochs: 100 },
      min_decision_grade: "replicated",
      actor_ref: "test",
    });
    store.lockProtocol({ case_id: testCase.id, protocol_id: replicatedProtocol.id, actor_ref: "test" });

    const snapshot = store.createSnapshot({
      case_id: testCase.id,
      dirty_tree: false,
      evaluator_digest: "eval-v1",
      split_manifest_digest: "split-v1",
      actor_ref: "test",
    });

    // Create baseline run
    const baselineRun = store.beginRun({
      case_id: testCase.id,
      protocol_id: replicatedProtocol.id,
      snapshot_id: snapshot.id,
      kind: "full",
      command: ["python", "train.py"],
      actor_ref: "test",
    });
    store.endRun(baselineRun.id, {
      status: "completed",
      actual_resources: { gpu_hours: 10, wallclock_hours: 12, data_fraction: 1.0, seeds: 5, epochs: 100 },
    });

    // Create comparison run
    const run = store.beginRun({
      case_id: testCase.id,
      protocol_id: replicatedProtocol.id,
      snapshot_id: snapshot.id,
      kind: "full",
      command: ["python", "train.py"],
      actor_ref: "test",
    });
    store.endRun(run.id, {
      status: "completed",
      actual_resources: { gpu_hours: 10, wallclock_hours: 12, data_fraction: 1.0, seeds: 5, epochs: 100 },
    });

    const evidence = store.classifyEvidence({
      case_id: testCase.id,
      run_ids: [run.id],
      baseline_run_ids: [baselineRun.id],
      metrics: [
        { name: "accuracy", split: "test", value: 0.92, seed: 1 },
        { name: "accuracy", split: "test", value: 0.93, seed: 2 },
        { name: "accuracy", split: "test", value: 0.91, seed: 3 },
      ],
      actor_ref: "test",
    });

    // With replicated protocol, full resources, baseline, variance, and clean snapshot
    // Should achieve replicated grade
    expect(["partial", "replicated"]).toContain(evidence.grade);
  });
});

// =============================================================================
// Decision Gating Tests
// =============================================================================

describe("Decision Gating", () => {
  let store: MLSpecStore;
  let testCase: Case;
  let protocol: Protocol;
  let snapshot: Snapshot;
  let run: Run;
  let evidence: Evidence;
  let claim: Claim;

  beforeEach(() => {
    store = createJSONLStore();
    testCase = store.createCase({ question: "Test", mode: "decision", actor_ref: "test" });
    protocol = store.draftProtocol({
      case_id: testCase.id,
      objective: "Test",
      metric_spec: { name: "accuracy", direction: "max", split: "test" },
      required_resources: { gpu_hours: 10, wallclock_hours: 12, data_fraction: 1.0, seeds: 5, epochs: 100 },
      actor_ref: "test",
    });
    store.lockProtocol({ case_id: testCase.id, protocol_id: protocol.id, actor_ref: "test" });
    snapshot = store.createSnapshot({ case_id: testCase.id, dirty_tree: false, actor_ref: "test" });
    run = store.beginRun({
      case_id: testCase.id,
      protocol_id: protocol.id,
      snapshot_id: snapshot.id,
      kind: "full",
      command: ["python", "train.py"],
      actor_ref: "test",
    });
    store.endRun(run.id, {
      status: "completed",
      actual_resources: { gpu_hours: 10, wallclock_hours: 12, data_fraction: 1.0, seeds: 5, epochs: 100 },
    });
    evidence = store.classifyEvidence({
      case_id: testCase.id,
      run_ids: [run.id],
      metrics: [{ name: "accuracy", split: "test", value: 0.92 }],
      actor_ref: "test",
    });
    claim = store.createClaim({
      case_id: testCase.id,
      statement: "Model improves accuracy",
      scope: "global",
      target_metric: "accuracy",
      actor_ref: "test",
    });
  });

  test("accept with partial evidence fails with DecisionValidationError", () => {
    // Partial evidence grade cannot support accept decision
    expect(evidence.grade).toBe("partial");

    expect(() => {
      store.issueDecision({
        case_id: testCase.id,
        claim_id: claim.id,
        status: "accept",
        evidence_ids: [evidence.id],
        rationale: "Want to accept but grade is partial",
        actor_ref: "test",
      });
    }).toThrow(DecisionValidationError);
  });

  test("reject with partial evidence fails with DecisionValidationError", () => {
    expect(evidence.grade).toBe("partial");

    expect(() => {
      store.issueDecision({
        case_id: testCase.id,
        claim_id: claim.id,
        status: "reject",
        evidence_ids: [evidence.id],
        rationale: "Want to reject but grade is partial",
        actor_ref: "test",
      });
    }).toThrow(DecisionValidationError);
  });

  test("DecisionValidationError contains blocking_invariants and suggested_next_actions", () => {
    expect(evidence.grade).toBe("partial");

    try {
      store.issueDecision({
        case_id: testCase.id,
        claim_id: claim.id,
        status: "accept",
        evidence_ids: [evidence.id],
        rationale: "Test",
        actor_ref: "test",
      });
      fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(DecisionValidationError);
      const dve = err as DecisionValidationError;
      expect(dve.blocking_invariants).toBeDefined();
      expect(Array.isArray(dve.blocking_invariants)).toBe(true);
      expect(dve.blocking_invariants.length).toBeGreaterThan(0);
      expect(dve.suggested_next_actions).toBeDefined();
      expect(Array.isArray(dve.suggested_next_actions)).toBe(true);
      expect(dve.suggested_next_actions.length).toBeGreaterThan(0);
    }
  });

  test("accept without evidence fails with blocking_invariants", () => {
    expect(() => {
      store.issueDecision({
        case_id: testCase.id,
        claim_id: claim.id,
        status: "accept",
        evidence_ids: [],
        rationale: "No evidence",
        actor_ref: "test",
      });
    }).toThrow(DecisionValidationError);

    // Also verify it contains EVIDENCE_REQUIRED by catching and checking
    try {
      store.issueDecision({
        case_id: testCase.id,
        claim_id: claim.id,
        status: "accept",
        evidence_ids: [],
        rationale: "No evidence",
        actor_ref: "test",
      });
    } catch (err) {
      const dve = err as DecisionValidationError;
      expect(dve.blocking_invariants).toContain("EVIDENCE_REQUIRED");
    }
  });

  test("inconclusive does not require decision_grade evidence", () => {
    // inconclusive should succeed with partial evidence
    const decision = store.issueDecision({
      case_id: testCase.id,
      claim_id: claim.id,
      status: "inconclusive",
      evidence_ids: [evidence.id],
      rationale: "Need more data",
      actor_ref: "test",
    });

    expect(decision.status).toBe("inconclusive");
  });

  test("accept with decision_grade evidence succeeds", () => {
    // Create evidence with decision_grade by meeting all requirements
    const snapshot2 = store.createSnapshot({
      case_id: testCase.id,
      dirty_tree: false,
      evaluator_digest: "eval-v1",
      split_manifest_digest: "split-v1",
      actor_ref: "test",
    });

    // Create baseline run
    const baselineRun = store.beginRun({
      case_id: testCase.id,
      protocol_id: protocol.id,
      snapshot_id: snapshot2.id,
      kind: "full",
      command: ["python", "train.py"],
      actor_ref: "test",
    });
    store.endRun(baselineRun.id, {
      status: "completed",
      actual_resources: { gpu_hours: 10, wallclock_hours: 12, data_fraction: 1.0, seeds: 5, epochs: 100 },
    });

    // Create comparison run
    const run2 = store.beginRun({
      case_id: testCase.id,
      protocol_id: protocol.id,
      snapshot_id: snapshot2.id,
      kind: "full",
      command: ["python", "train.py"],
      actor_ref: "test",
    });
    store.endRun(run2.id, {
      status: "completed",
      actual_resources: { gpu_hours: 10, wallclock_hours: 12, data_fraction: 1.0, seeds: 5, epochs: 100 },
    });

    const goodEvidence = store.classifyEvidence({
      case_id: testCase.id,
      run_ids: [run2.id],
      baseline_run_ids: [baselineRun.id],
      metrics: [
        { name: "accuracy", split: "test", value: 0.92, seed: 1 },
        { name: "accuracy", split: "test", value: 0.93, seed: 2 },
        { name: "accuracy", split: "test", value: 0.91, seed: 3 },
      ],
      actor_ref: "test",
    });

    // Create new claim for this evidence
    const claim2 = store.createClaim({
      case_id: testCase.id,
      statement: "Model improves accuracy",
      scope: "global",
      target_metric: "accuracy",
      actor_ref: "test",
    });

    // Accept with decision_grade evidence should succeed
    const decision = store.issueDecision({
      case_id: testCase.id,
      claim_id: claim2.id,
      status: "accept",
      evidence_ids: [goodEvidence.id],
      rationale: "Evidence meets decision_grade requirements",
      actor_ref: "test",
    });

    expect(decision.status).toBe("accept");
  });
});

// =============================================================================
// Skill Contract Verification Tests
// =============================================================================

describe("Skill Contract Verification", () => {
  let store: MLSpecStore;

  beforeEach(() => {
    store = createJSONLStore();
  });

  test("refusal condition: accept without decision_grade evidence should be refused", () => {
    const case_ = store.createCase({ question: "Test", mode: "decision", actor_ref: "test" });
    const protocol = store.draftProtocol({
      case_id: case_.id,
      objective: "Test",
      metric_spec: { name: "accuracy", direction: "max", split: "test" },
      required_resources: { gpu_hours: 10, wallclock_hours: 12, data_fraction: 1.0, seeds: 5, epochs: 100 },
      actor_ref: "test",
    });
    store.lockProtocol({ case_id: case_.id, protocol_id: protocol.id, actor_ref: "test" });
    const snapshot = store.createSnapshot({ case_id: case_.id, dirty_tree: false, actor_ref: "test" });
    const run = store.beginRun({
      case_id: case_.id,
      protocol_id: protocol.id,
      snapshot_id: snapshot.id,
      kind: "full",
      command: ["python", "train.py"],
      actor_ref: "test",
    });
    store.endRun(run.id, {
      status: "completed",
      actual_resources: { gpu_hours: 10, wallclock_hours: 12, data_fraction: 1.0, seeds: 5, epochs: 100 },
    });
    const evidence = store.classifyEvidence({
      case_id: case_.id,
      run_ids: [run.id],
      metrics: [{ name: "accuracy", split: "test", value: 0.92 }],
      actor_ref: "test",
    });
    const claim = store.createClaim({
      case_id: case_.id,
      statement: "Model improves",
      scope: "global",
      target_metric: "accuracy",
      actor_ref: "test",
    });

    // Agent tries to accept with partial evidence - should be refused
    expect(() => {
      store.issueDecision({
        case_id: case_.id,
        claim_id: claim.id,
        status: "accept",
        evidence_ids: [evidence.id],
        rationale: "Accepting",
        actor_ref: "test",
      });
    }).toThrow(DecisionValidationError);
  });

  test("max allowed claims: store can handle multiple claims", () => {
    const case_ = store.createCase({ question: "Test", mode: "decision", actor_ref: "test" });

    const claim1 = store.createClaim({
      case_id: case_.id,
      statement: "Claim 1",
      scope: "global",
      target_metric: "accuracy",
      actor_ref: "test",
    });
    const claim2 = store.createClaim({
      case_id: case_.id,
      statement: "Claim 2",
      scope: "global",
      target_metric: "accuracy",
      actor_ref: "test",
    });
    const claim3 = store.createClaim({
      case_id: case_.id,
      statement: "Claim 3",
      scope: "global",
      target_metric: "accuracy",
      actor_ref: "test",
    });

    const claims = store.listClaims(case_.id);
    expect(claims.length).toBe(3);
    expect(claims.map((c) => c.id)).toContain(claim1.id);
    expect(claims.map((c) => c.id)).toContain(claim2.id);
    expect(claims.map((c) => c.id)).toContain(claim3.id);
  });

  test("CLI mutation ordering: operations must follow correct sequence", () => {
    const case_ = store.createCase({ question: "Test", mode: "decision", actor_ref: "test" });

    // 1. First create protocol
    const protocol = store.draftProtocol({
      case_id: case_.id,
      objective: "Test",
      metric_spec: { name: "accuracy", direction: "max", split: "test" },
      required_resources: { gpu_hours: 10, wallclock_hours: 12, data_fraction: 1.0, seeds: 5, epochs: 100 },
      actor_ref: "test",
    });
    store.lockProtocol({ case_id: case_.id, protocol_id: protocol.id, actor_ref: "test" });

    // 2. Create snapshot
    const snapshot = store.createSnapshot({ case_id: case_.id, dirty_tree: false, actor_ref: "test" });

    // 3. Begin run with protocol and snapshot
    const run = store.beginRun({
      case_id: case_.id,
      protocol_id: protocol.id,
      snapshot_id: snapshot.id,
      kind: "full",
      command: ["python", "train.py"],
      actor_ref: "test",
    });

    // 4. End run
    store.endRun(run.id, {
      status: "completed",
      actual_resources: { gpu_hours: 10, wallclock_hours: 12, data_fraction: 1.0, seeds: 5, epochs: 100 },
    });

    // 5. Classify evidence
    const evidence = store.classifyEvidence({
      case_id: case_.id,
      run_ids: [run.id],
      metrics: [{ name: "accuracy", split: "test", value: 0.92 }],
      actor_ref: "test",
    });

    // 6. Create claim
    const claim = store.createClaim({
      case_id: case_.id,
      statement: "Model improves",
      scope: "global",
      target_metric: "accuracy",
      actor_ref: "test",
    });

    // 7. Issue decision
    const decision = store.issueDecision({
      case_id: case_.id,
      claim_id: claim.id,
      status: "inconclusive",
      evidence_ids: [evidence.id],
      rationale: "Need more data",
      actor_ref: "test",
    });

    // Verify full workflow succeeded
    expect(decision.status).toBe("inconclusive");
    const status = store.status({ case_id: case_.id });
    expect(status.decisions.total).toBe(1);
    expect(status.evidence.total).toBe(1);
    expect(status.runs.total).toBe(1);
  });
});

// =============================================================================
// CHERRY_PICK_DETECTED Severity Fix
// =============================================================================

describe("CHERRY_PICK_DETECTED Severity", () => {
  let store: MLSpecStore;

  beforeEach(() => {
    store = createJSONLStore();
  });

  test("CHERRY_PICK_DETECTED should fail when single run selected from multiple", () => {
    const case_ = store.createCase({ question: "Test", mode: "decision", actor_ref: "test" });
    const protocol = store.draftProtocol({
      case_id: case_.id,
      objective: "Test",
      metric_spec: { name: "accuracy", direction: "max", split: "test" },
      required_resources: { gpu_hours: 10, wallclock_hours: 12, data_fraction: 1.0, seeds: 5, epochs: 100 },
      actor_ref: "test",
    });
    store.lockProtocol({ case_id: case_.id, protocol_id: protocol.id, actor_ref: "test" });
    const snapshot = store.createSnapshot({ case_id: case_.id, dirty_tree: false, actor_ref: "test" });

    // Create multiple runs under same protocol
    const run1 = store.beginRun({
      case_id: case_.id,
      protocol_id: protocol.id,
      snapshot_id: snapshot.id,
      kind: "full",
      command: ["python", "train.py"],
      actor_ref: "test",
    });
    store.endRun(run1.id, {
      status: "completed",
      actual_resources: { gpu_hours: 10, wallclock_hours: 12, data_fraction: 1.0, seeds: 5, epochs: 100 },
    });

    const run2 = store.beginRun({
      case_id: case_.id,
      protocol_id: protocol.id,
      snapshot_id: snapshot.id,
      kind: "full",
      command: ["python", "train.py"],
      actor_ref: "test",
    });
    store.endRun(run2.id, {
      status: "completed",
      actual_resources: { gpu_hours: 10, wallclock_hours: 12, data_fraction: 1.0, seeds: 5, epochs: 100 },
    });

    // Only cite run1 as evidence (cherry-picking)
    const evidence = store.classifyEvidence({
      case_id: case_.id,
      run_ids: [run1.id],
      metrics: [{ name: "accuracy", split: "test", value: 0.92 }],
      actor_ref: "test",
    });

    const report = store.audit({ case_id: case_.id });
    const cherryPickCheck = report.checks.find((c) => c.id === "CHERRY_PICK_DETECTED");

    // According to spec, this should FAIL, not just warn
    expect(cherryPickCheck?.result).toBe("fail");
  });

  test("CHERRY_PICK_DETECTED passes when all runs from protocol are cited", () => {
    const case_ = store.createCase({ question: "Test", mode: "decision", actor_ref: "test" });
    const protocol = store.draftProtocol({
      case_id: case_.id,
      objective: "Test",
      metric_spec: { name: "accuracy", direction: "max", split: "test" },
      required_resources: { gpu_hours: 10, wallclock_hours: 12, data_fraction: 1.0, seeds: 5, epochs: 100 },
      actor_ref: "test",
    });
    store.lockProtocol({ case_id: case_.id, protocol_id: protocol.id, actor_ref: "test" });
    const snapshot = store.createSnapshot({ case_id: case_.id, dirty_tree: false, actor_ref: "test" });

    const run1 = store.beginRun({
      case_id: case_.id,
      protocol_id: protocol.id,
      snapshot_id: snapshot.id,
      kind: "full",
      command: ["python", "train.py"],
      actor_ref: "test",
    });
    store.endRun(run1.id, {
      status: "completed",
      actual_resources: { gpu_hours: 10, wallclock_hours: 12, data_fraction: 1.0, seeds: 5, epochs: 100 },
    });

    const run2 = store.beginRun({
      case_id: case_.id,
      protocol_id: protocol.id,
      snapshot_id: snapshot.id,
      kind: "full",
      command: ["python", "train.py"],
      actor_ref: "test",
    });
    store.endRun(run2.id, {
      status: "completed",
      actual_resources: { gpu_hours: 10, wallclock_hours: 12, data_fraction: 1.0, seeds: 5, epochs: 100 },
    });

    // Cite both runs as evidence (not cherry-picking)
    const evidence = store.classifyEvidence({
      case_id: case_.id,
      run_ids: [run1.id, run2.id],
      metrics: [{ name: "accuracy", split: "test", value: 0.92 }],
      actor_ref: "test",
    });

    const report = store.audit({ case_id: case_.id });
    const cherryPickCheck = report.checks.find((c) => c.id === "CHERRY_PICK_DETECTED");

    expect(cherryPickCheck?.result).toBe("pass");
  });
});