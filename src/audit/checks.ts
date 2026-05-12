import type {
  AuditCheck,
  AuditScope,
  Run,
  Case,
  Protocol,
  Evidence,
  Claim,
  Decision,
  Snapshot,
} from "../types/index.js";
import type { AuditSeverity } from "../types/index.js";

export interface AuditCheckResult {
  check: AuditCheck;
  severity: AuditSeverity;
}

export function PLANNED_RUN_NOT_EVIDENCE(scope: AuditScope, runs: Run[], evidence: Evidence[]): AuditCheckResult {
  const checkId = "PLANNED_RUN_NOT_EVIDENCE";
  const evidenceRunIds = new Set<string>();
  for (const ev of evidence) {
    for (const rid of ev.run_ids) evidenceRunIds.add(rid);
  }
  const badRuns = runs.filter((r) => r.status === "planned" && evidenceRunIds.has(r.id));
  if (badRuns.length > 0) {
    return {
      check: { id: checkId, description: "Planned runs cannot be cited as evidence", result: "fail", details: { run_ids: badRuns.map((r) => r.id) } },
      severity: "fail",
    };
  }
  return { check: { id: checkId, description: "No planned runs cited as evidence", result: "pass" }, severity: "pass" };
}

export function RUN_STATUS_MISMATCH(scope: AuditScope, runs: Run[], evidence: Evidence[]): AuditCheckResult {
  const checkId = "RUN_STATUS_MISMATCH";
  const evidenceRunIds = new Set<string>();
  for (const ev of evidence) {
    for (const rid of ev.run_ids) evidenceRunIds.add(rid);
  }
  // Check for failed/aborted runs cited as evidence - this is a FAIL per spec
  const failedRuns = runs.filter((r) => (r.status === "failed" || r.status === "aborted") && evidenceRunIds.has(r.id));
  if (failedRuns.length > 0) {
    return {
      check: { id: checkId, description: "Failed or aborted runs cited as evidence", result: "fail", details: { runs: failedRuns.map((r) => ({ id: r.id, status: r.status })) } },
      severity: "fail",
    };
  }
  // Check for non-completed runs (excluding planned which is separate check)
  const badRuns = runs.filter((r) => r.status !== "completed" && r.status !== "planned" && r.status !== "queued" && evidenceRunIds.has(r.id));
  if (badRuns.length > 0) {
    return {
      check: { id: checkId, description: "Non-completed runs cited as evidence", result: "fail", details: { runs: badRuns.map((r) => ({ id: r.id, status: r.status })) } },
      severity: "fail",
    };
  }
  return { check: { id: checkId, description: "No status mismatch in evidence", result: "pass" }, severity: "pass" };
}

export function CHERRY_PICK_DETECTED(scope: AuditScope, runs: Run[], evidence: Evidence[]): AuditCheckResult {
  const checkId = "CHERRY_PICK_DETECTED";
  const runsByProtocol = new Map<string, Run[]>();
  for (const run of runs) {
    if (run.protocol_id) {
      const existing = runsByProtocol.get(run.protocol_id) ?? [];
      existing.push(run);
      runsByProtocol.set(run.protocol_id, existing);
    }
  }
  const warnings: string[] = [];
  for (const ev of evidence) {
    if (ev.run_ids.length === 1) {
      const citedRun = runs.find((r) => r.id === ev.run_ids[0]);
      if (citedRun?.protocol_id) {
        const siblings = runsByProtocol.get(citedRun.protocol_id) ?? [];
        if (siblings.length > 1) {
          warnings.push(`Run ${citedRun.id} cited from protocol ${citedRun.protocol_id} which has ${siblings.length} total runs`);
        }
      }
    }
  }
  if (warnings.length > 0) {
    return {
      check: { id: checkId, description: "Potential cherry-picking detected - single run selected from multiple", result: "fail", details: { warnings } },
      severity: "fail",
    };
  }
  return { check: { id: checkId, description: "No cherry-picking detected", result: "pass" }, severity: "pass" };
}

export function RESOURCE_UNDERRUN(scope: AuditScope, runs: Run[], protocols: Protocol[]): AuditCheckResult {
  const checkId = "RESOURCE_UNDERRUN";
  const protocolMap = new Map(protocols.map((p) => [p.id, p]));
  const underrunRuns: { run_id: string; dimension: string; required: number; actual: number; ratio: number }[] = [];
  for (const run of runs) {
    if (run.status !== "completed" || !run.protocol_id || !run.actual_resources) continue;
    const protocol = protocolMap.get(run.protocol_id);
    if (!protocol) continue;
    const req = protocol.required_resources;
    const act = run.actual_resources;

    // Check all dimensions per spec
    const dimensions: { key: keyof typeof req; label: string }[] = [
      { key: "gpu_hours", label: "gpu_hours" },
      { key: "wallclock_hours", label: "wallclock_hours" },
      { key: "data_fraction", label: "data_fraction" },
      { key: "epochs", label: "epochs" },
      { key: "seeds", label: "seeds" },
    ];

    for (const dim of dimensions) {
      if (req[dim.key] > 0) {
        const ratio = (act[dim.key] ?? 0) / req[dim.key];
        if (ratio < 1.0) {
          underrunRuns.push({ run_id: run.id, dimension: dim.label, required: req[dim.key], actual: act[dim.key] ?? 0, ratio });
        }
      }
    }
  }
  if (underrunRuns.length > 0) {
    // Fail if any dimension is < 50%, otherwise warning
    const hasFail = underrunRuns.some((u) => u.ratio < 0.5);
    return {
      check: { id: checkId, description: "Runs with resource underrun on one or more dimensions", result: hasFail ? "fail" : "warning", details: { runs: underrunRuns } },
      severity: hasFail ? "fail" : "warning",
    };
  }
  return { check: { id: checkId, description: "No resource underrun detected", result: "pass" }, severity: "pass" };
}

export function BASELINE_NOT_COMPARABLE(scope: AuditScope, runs: Run[], evidence: Evidence[], snapshots: Snapshot[]): AuditCheckResult {
  const checkId = "BASELINE_NOT_COMPARABLE";
  const snapshotMap = new Map(snapshots.map((s) => [s.id, s]));
  const runMap = new Map(runs.map((r) => [r.id, r]));
  const issues: { evidence_id: string; run_id: string; issue: string }[] = [];
  for (const ev of evidence) {
    if (!ev.baseline_run_ids || ev.baseline_run_ids.length === 0) continue;
    for (const runId of ev.run_ids) {
      const run = runMap.get(runId);
      const runSnapshot = run?.snapshot_id ? snapshotMap.get(run.snapshot_id) : null;
      for (const baselineId of ev.baseline_run_ids) {
        const baseline = runMap.get(baselineId);
        const baselineSnapshot = baseline?.snapshot_id ? snapshotMap.get(baseline.snapshot_id) : null;
        if (!baseline) {
          issues.push({ evidence_id: ev.id, run_id: runId, issue: `Baseline ${baselineId} not found` });
          continue;
        }
        // Check evaluator digest
        if (runSnapshot?.evaluator_digest && baselineSnapshot?.evaluator_digest) {
          if (runSnapshot.evaluator_digest !== baselineSnapshot.evaluator_digest) {
            issues.push({ evidence_id: ev.id, run_id: runId, issue: `Evaluator digest mismatch: run has '${runSnapshot.evaluator_digest}', baseline has '${baselineSnapshot.evaluator_digest}'` });
          }
        }
        // Check split manifest digest
        if (runSnapshot?.split_manifest_digest && baselineSnapshot?.split_manifest_digest) {
          if (runSnapshot.split_manifest_digest !== baselineSnapshot.split_manifest_digest) {
            issues.push({ evidence_id: ev.id, run_id: runId, issue: `Split manifest digest mismatch` });
          }
        }
      }
    }
  }
  if (issues.length > 0) {
    return { check: { id: checkId, description: "Baseline comparability issues - evaluator or split mismatch", result: "fail", details: { issues } }, severity: "fail" };
  }
  return { check: { id: checkId, description: "Baseline comparability OK", result: "pass" }, severity: "pass" };
}

export function SNAPSHOT_CONTAMINATION(scope: AuditScope, runs: Run[], evidence: Evidence[], snapshots: Snapshot[]): AuditCheckResult {
  const checkId = "SNAPSHOT_CONTAMINATION";
  const snapshotMap = new Map(snapshots.map((s) => [s.id, s]));
  const evidenceRunIds = new Set<string>();
  for (const ev of evidence) { for (const rid of ev.run_ids) evidenceRunIds.add(rid); }
  const contaminated: { run_id: string; snapshot_id: string }[] = [];
  for (const run of runs) {
    if (!evidenceRunIds.has(run.id) || !run.snapshot_id) continue;
    const snapshot = snapshotMap.get(run.snapshot_id);
    if (snapshot?.dirty_tree) contaminated.push({ run_id: run.id, snapshot_id: run.snapshot_id });
  }
  if (contaminated.length > 0) {
    return { check: { id: checkId, description: "Evidence from runs with dirty snapshots", result: "warning", details: { runs: contaminated } }, severity: "warning" };
  }
  return { check: { id: checkId, description: "No snapshot contamination detected", result: "pass" }, severity: "pass" };
}

export function SNAPSHOT_REQUIRED(scope: AuditScope, runs: Run[], evidence: Evidence[]): AuditCheckResult {
  const checkId = "SNAPSHOT_REQUIRED";
  const evidenceRunIds = new Set<string>();
  for (const ev of evidence) { for (const rid of ev.run_ids) evidenceRunIds.add(rid); }
  const noSnapshot: string[] = [];
  for (const run of runs) {
    // For full or replication runs, snapshot is required
    if ((run.kind === "full" || run.kind === "replication") && evidenceRunIds.has(run.id) && !run.snapshot_id) {
      noSnapshot.push(run.id);
    }
  }
  if (noSnapshot.length > 0) {
    return { check: { id: checkId, description: "Full/replication runs cited as evidence without snapshots", result: "fail", details: { run_ids: noSnapshot } }, severity: "fail" };
  }
  return { check: { id: checkId, description: "All evidence runs have snapshots", result: "pass" }, severity: "pass" };
}

export function UNSUPPORTED_DECISION(scope: AuditScope, evidence: Evidence[], claims: Claim[], decisions: Decision[]): AuditCheckResult {
  const checkId = "UNSUPPORTED_DECISION";
  const issues: { decision_id: string; claim_id: string; issue: string }[] = [];
  for (const decision of decisions) {
    const claim = claims.find((c) => c.id === decision.claim_id);
    if (!claim) { issues.push({ decision_id: decision.id, claim_id: decision.claim_id, issue: "Claim not found" }); continue; }
    if (decision.status === "accept" || decision.status === "reject") {
      if (decision.evidence_ids.length === 0) {
        issues.push({ decision_id: decision.id, claim_id: decision.claim_id, issue: "Accept/reject without evidence" });
        continue;
      }
      const hasGoodEvidence = decision.evidence_ids.some((evId) => {
        const ev = evidence.find((e) => e.id === evId);
        return ev && (ev.grade === "decision_grade" || ev.grade === "replicated");
      });
      if (!hasGoodEvidence) {
        issues.push({ decision_id: decision.id, claim_id: decision.claim_id, issue: "Accept/reject without decision_grade evidence" });
      }
    }
  }
  if (issues.length > 0) {
    return { check: { id: checkId, description: "Unsupported decisions detected", result: issues.some((i) => i.issue.includes("without evidence")) ? "fail" : "warning", details: { issues } }, severity: issues.some((i) => i.issue.includes("without evidence")) ? "fail" : "warning" };
  }
  return { check: { id: checkId, description: "All decisions are supported", result: "pass" }, severity: "pass" };
}

export function RUN_INTERRUPTED_NOT_INVALID(scope: AuditScope, runs: Run[], evidence: Evidence[]): AuditCheckResult {
  const checkId = "RUN_INTERRUPTED_NOT_INVALID";
  const evidenceRunIds = new Set<string>();
  for (const ev of evidence) { for (const rid of ev.run_ids) evidenceRunIds.add(rid); }
  const interruptedAsCompleted: string[] = [];
  for (const run of runs) {
    if (!evidenceRunIds.has(run.id)) continue;
    // Run marked completed but has interrupt_reason (OOM, killed, etc.)
    if (run.status === "completed" && run.interrupt_reason) {
      interruptedAsCompleted.push(run.id);
    }
  }
  if (interruptedAsCompleted.length > 0) {
    return {
      check: { id: checkId, description: "Runs marked completed but have interrupt_reason", result: "fail", details: { run_ids: interruptedAsCompleted } },
      severity: "fail",
    };
  }
  return { check: { id: checkId, description: "No interrupted runs falsely marked complete", result: "pass" }, severity: "pass" };
}

export function PROTOCOL_VERSION_DRIFT(scope: AuditScope, runs: Run[], protocols: Protocol[], evidence: Evidence[]): AuditCheckResult {
  const checkId = "PROTOCOL_VERSION_DRIFT";
  const protocolMap = new Map(protocols.map((p) => [p.id, p]));
  const issues: { evidence_id: string; run_id: string; issue: string }[] = [];

  // Group runs by case_id and check if multiple protocol versions are used for same case
  const runsByCase = new Map<string, Run[]>();
  for (const run of runs) {
    const existing = runsByCase.get(run.case_id) ?? [];
    existing.push(run);
    runsByCase.set(run.case_id, existing);
  }

  for (const [caseId, caseRuns] of runsByCase) {
    const protocolVersions = new Map<string, Set<string>>();
    for (const run of caseRuns) {
      if (run.protocol_id) {
        const p = protocolMap.get(run.protocol_id);
        if (p) {
          const existing = protocolVersions.get(caseId) ?? new Set();
          existing.add(`${p.id} (v${p.version})`);
          protocolVersions.set(caseId, existing);
        }
      }
    }
    // If multiple protocol versions used for evidence in same case
    for (const ev of evidence) {
      if (ev.case_id !== caseId) continue;
      const protocolIds = new Set<string>();
      for (const runId of ev.run_ids) {
        const run = caseRuns.find((r) => r.id === runId);
        if (run?.protocol_id) protocolIds.add(run.protocol_id);
      }
      if (protocolIds.size > 1) {
        issues.push({ evidence_id: ev.id, run_id: "", issue: `Evidence uses runs from multiple protocol versions: ${Array.from(protocolIds).join(", ")}` });
      }
    }
  }
  if (issues.length > 0) {
    return { check: { id: checkId, description: "Protocol version drift detected", result: "warning", details: { issues } }, severity: "warning" };
  }
  return { check: { id: checkId, description: "No protocol version drift detected", result: "pass" }, severity: "pass" };
}

export function ORPHAN_ARTIFACT(scope: AuditScope, runs: Run[], evidence: Evidence[], snapshots: Snapshot[]): AuditCheckResult {
  const checkId = "ORPHAN_ARTIFACT";
  // Check for artifacts (output_refs) that are not referenced by any evidence or decision
  const referencedArtifacts = new Set<string>();
  for (const ev of evidence) {
    // Add all run_ids that are cited in evidence
    for (const ref of ev.run_ids) referencedArtifacts.add(ref);
    // Also add baseline_run_ids
    for (const ref of ev.baseline_run_ids ?? []) referencedArtifacts.add(ref);
  }
  const orphanArtifacts: { run_id: string; artifact_ref: string }[] = [];
  for (const run of runs) {
    // A run's output_refs are orphan if the run itself is not referenced in any evidence
    if (!referencedArtifacts.has(run.id)) {
      for (const artifact of run.output_refs ?? []) {
        orphanArtifacts.push({ run_id: run.id, artifact_ref: artifact });
      }
    }
  }
  if (orphanArtifacts.length > 0) {
    return { check: { id: checkId, description: "Orphan artifacts found - output refs not cited in evidence", result: "warning", details: { artifacts: orphanArtifacts } }, severity: "warning" };
  }
  return { check: { id: checkId, description: "No orphan artifacts detected", result: "pass" }, severity: "pass" };
}

export function PROTOCOL_NOT_LOCKED(scope: AuditScope, runs: Run[], protocols: Protocol[], evidence: Evidence[]): AuditCheckResult {
  const checkId = "PROTOCOL_NOT_LOCKED";
  const protocolMap = new Map(protocols.map((p) => [p.id, p]));
  const evidenceRunIds = new Set<string>();
  for (const ev of evidence) { for (const rid of ev.run_ids) evidenceRunIds.add(rid); }
  const unlockedRuns: string[] = [];

  for (const run of runs) {
    // Only check evidence-bearing runs (full/replication) that are cited
    if ((run.kind === "full" || run.kind === "replication") && evidenceRunIds.has(run.id)) {
      if (run.protocol_id) {
        const protocol = protocolMap.get(run.protocol_id);
        if (protocol && !protocol.locked_at) {
          unlockedRuns.push(run.id);
        }
      }
    }
  }

  if (unlockedRuns.length > 0) {
    return { check: { id: checkId, description: "Evidence-bearing runs using unlocked protocols", result: "fail", details: { run_ids: unlockedRuns } }, severity: "fail" };
  }
  return { check: { id: checkId, description: "All evidence runs use locked protocols", result: "pass" }, severity: "pass" };
}

export function AGENT_TRACE_GAP(scope: AuditScope, runs: Run[], evidence: Evidence[]): AuditCheckResult {
  const checkId = "AGENT_TRACE_GAP";
  // Check for runs without tracker_refs (no trace of agent activity)
  const gaps: string[] = [];
  for (const run of runs) {
    if ((run.tracker_refs ?? []).length === 0) {
      gaps.push(run.id);
    }
  }
  if (gaps.length > 0) {
    return { check: { id: checkId, description: "Runs without agent tracker references", result: "warning", details: { run_ids: gaps } }, severity: "warning" };
  }
  return { check: { id: checkId, description: "All runs have tracker references", result: "pass" }, severity: "pass" };
}