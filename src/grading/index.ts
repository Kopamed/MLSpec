import type {
  EvidenceGrade,
  ProtocolSatisfied,
  ResourceBudget,
  Run,
  Deviation,
  Snapshot,
  Protocol,
  MetricResult,
} from "../types/index.js";

export interface GradeResult {
  grade: EvidenceGrade;
  protocol_satisfied: ProtocolSatisfied;
  warnings: string[];
  details: {
    resource_ratio: number;
    minimum_completeness_ratio: number;
    deviation_cap: EvidenceGrade | null;
    baseline_comparable: boolean;
    has_variance: boolean;
  };
}

export interface BaselineInfo {
  comparable: boolean;
  reason?: string;
}

/**
 * Compute the evidence grade based on resource consumption, deviations,
 * baseline comparability, and variance across runs.
 */
export function computeGrade(
  runs: Run[],
  protocol: Protocol,
  deviations: Deviation[],
  snapshot: Snapshot | null,
  baselineInfo: BaselineInfo,
  metrics: MetricResult[]
): GradeResult {
  const warnings: string[] = [];
  const details = {
    resource_ratio: 0,
    minimum_completeness_ratio: 0,
    deviation_cap: null as EvidenceGrade | null,
    baseline_comparable: baselineInfo.comparable,
    has_variance: false,
  };

  // Get actual resources from the runs
  const actualResources = aggregateActualResources(runs);
  const requiredResources = protocol.required_resources;

  // 8.2: Compute resource ratio
  const resourceRatio = computeResourceRatio(actualResources, requiredResources);
  details.resource_ratio = resourceRatio;

  // 8.3: Compute minimum completeness ratio
  const minCompleteness = computeMinimumCompletenessRatio(actualResources, requiredResources);
  details.minimum_completeness_ratio = minCompleteness;

  // 8.4: Check deviation caps
  const deviationCap = checkDeviationCaps(deviations);
  details.deviation_cap = deviationCap;

  // Check for variance (multiple seeds)
  details.has_variance = checkHasVariance(metrics);

  // Check if snapshot is dirty
  const snapshotDirty = snapshot?.dirty_tree ?? false;
  if (snapshotDirty) {
    warnings.push("Snapshot is dirty - evidence grade may be capped");
  }

  // Determine grade
  let grade: EvidenceGrade = "partial";
  let protocol_satisfied: ProtocolSatisfied = "partial";

  // Check fatal deviation first
  if (deviationCap === "invalid") {
    grade = "invalid";
    protocol_satisfied = "no";
    warnings.push("Fatal deviation detected - evidence is invalid");
    return { grade, protocol_satisfied, warnings, details };
  }

  // Check minimum completeness
  if (minCompleteness < 0.1) {
    grade = "smoke";
    protocol_satisfied = "no";
    warnings.push("Less than 10% of required resources - smoke grade");
  } else if (minCompleteness < 0.3) {
    grade = "proxy";
    protocol_satisfied = "partial";
    warnings.push("10-30% of required resources - proxy grade");
  } else if (minCompleteness < 1.0) {
    grade = "partial";
    protocol_satisfied = "partial";
    if (!baselineInfo.comparable) {
      warnings.push("Missing comparable baseline - capped at partial");
    }
    if (deviationCap === "partial") {
      warnings.push("Material unresolved deviations - capped at partial");
    }
  } else {
    // >= 100% of required resources
    // Check if we have decision grade requirements
    const hasBaseline = baselineInfo.comparable;
    const hasVariance = details.has_variance;
    const hasNoUnresolvedMaterial = deviationCap !== "partial";
    const hasCleanSnapshot = !snapshotDirty;

    if (protocol.min_decision_grade === "replicated") {
      // Need replication strategy satisfied
      if (hasBaseline && hasVariance && hasNoUnresolvedMaterial && hasCleanSnapshot) {
        grade = "replicated";
        protocol_satisfied = "yes";
      } else if (hasBaseline && hasVariance && hasNoUnresolvedMaterial) {
        // Clean snapshot required for replicated, but dirty snapshot still gives decision_grade with partial satisfaction
        grade = "decision_grade";
        protocol_satisfied = "partial";
      } else {
        grade = "partial";
        protocol_satisfied = "partial";
        if (!hasBaseline) warnings.push("No comparable baseline for replicated grade");
        if (!hasVariance) warnings.push("Variance not reported (multiple seeds required for replicated)");
        if (!hasNoUnresolvedMaterial) warnings.push("Unresolved material deviations present");
        if (!hasCleanSnapshot) warnings.push("Dirty snapshot - must be clean for replicated");
      }
    } else {
      // decision_grade is sufficient
      if (hasBaseline && hasVariance && hasNoUnresolvedMaterial && hasCleanSnapshot) {
        grade = "decision_grade";
        protocol_satisfied = "yes";
      } else if (hasBaseline && hasVariance && hasNoUnresolvedMaterial) {
        // Clean snapshot required for full satisfaction, dirty snapshot = partial
        grade = "partial";
        protocol_satisfied = "partial";
        if (!hasCleanSnapshot) warnings.push("Dirty snapshot - must be clean for decision_grade");
      } else {
        grade = "partial";
        protocol_satisfied = "partial";
        if (!hasBaseline) warnings.push("No comparable baseline for decision grade");
        if (!hasVariance) warnings.push("Variance not reported (multiple seeds required for decision grade)");
        if (!hasNoUnresolvedMaterial) warnings.push("Unresolved material deviations present");
        if (!hasCleanSnapshot) warnings.push("Dirty snapshot - must be clean for decision grade");
      }
    }
  }

  // Apply deviation cap
  if (grade !== "invalid" && deviationCap !== null) {
    if (gradeOrder(deviationCap) < gradeOrder(grade)) {
      grade = deviationCap;
    }
  }

  return { grade, protocol_satisfied, warnings, details };
}

function gradeOrder(g: EvidenceGrade): number {
  const order: Record<EvidenceGrade, number> = {
    smoke: 0,
    proxy: 1,
    partial: 2,
    decision_grade: 3,
    replicated: 4,
    invalid: -1,
  };
  return order[g];
}

/**
 * 8.2: Compute resource ratio as actual/required for each dimension,
 * then return the minimum ratio (most constrained dimension).
 */
export function computeResourceRatio(actual: Partial<ResourceBudget>, required: ResourceBudget): number {
  const dimensions = [
    { key: "gpu_hours", actual: actual.gpu_hours ?? 0, required: required.gpu_hours },
    { key: "wallclock_hours", actual: actual.wallclock_hours ?? 0, required: required.wallclock_hours },
    { key: "data_fraction", actual: actual.data_fraction ?? 0, required: required.data_fraction },
    { key: "epochs", actual: actual.epochs ?? 0, required: required.epochs },
    { key: "seeds", actual: actual.seeds ?? 0, required: required.seeds },
  ] as const;

  let minRatio = Infinity;
  for (const dim of dimensions) {
    if (dim.required > 0) {
      const ratio = dim.actual / dim.required;
      if (ratio < minRatio) minRatio = ratio;
    }
  }

  return minRatio === Infinity ? 0 : minRatio;
}

/**
 * 8.3: Compute minimum completeness ratio across all dimensions.
 * Returns the minimum ratio across gpu_hours, data_fraction, epochs, seeds.
 */
export function computeMinimumCompletenessRatio(
  actual: Partial<ResourceBudget>,
  required: ResourceBudget
): number {
  const ratios: number[] = [];

  if (required.gpu_hours > 0) {
    ratios.push((actual.gpu_hours ?? 0) / required.gpu_hours);
  }
  if (required.data_fraction > 0) {
    ratios.push((actual.data_fraction ?? 0) / required.data_fraction);
  }
  if (required.epochs > 0) {
    ratios.push((actual.epochs ?? 0) / required.epochs);
  }
  if (required.seeds > 0) {
    ratios.push((actual.seeds ?? 0) / required.seeds);
  }

  if (ratios.length === 0) return 0;
  return Math.min(...ratios);
}

/**
 * 8.4: Check deviation caps.
 * Fatal deviation → invalid
 * Material unresolved → caps at partial
 */
export function checkDeviationCaps(deviations: Deviation[]): EvidenceGrade | null {
  let hasFatal = false;
  let hasUnresolvedMaterial = false;

  for (const d of deviations) {
    if (d.severity === "fatal") {
      hasFatal = true;
    }
    if (d.severity === "material" && !d.resolved) {
      hasUnresolvedMaterial = true;
    }
  }

  if (hasFatal) return "invalid";
  if (hasUnresolvedMaterial) return "partial";
  return null;
}

/**
 * 8.5: Check baseline comparability.
 * Split, evaluator digest, and metric spec must match.
 */
export function checkBaselineComparability(
  run: Run,
  baselineRun: Run | null,
  snapshot: Snapshot | null,
  baselineSnapshot: Snapshot | null
): BaselineInfo {
  if (!baselineRun) {
    return { comparable: false, reason: "No baseline run provided" };
  }

  // Check evaluator digest match
  const runEvaluator = snapshot?.evaluator_digest;
  const baselineEvaluator = baselineSnapshot?.evaluator_digest;
  if (runEvaluator && baselineEvaluator && runEvaluator !== baselineEvaluator) {
    return { comparable: false, reason: "Evaluator digest mismatch" };
  }

  // Check split manifest digest match
  const runSplitDigest = snapshot?.split_manifest_digest;
  const baselineSplitDigest = baselineSnapshot?.split_manifest_digest;
  if (runSplitDigest && baselineSplitDigest && runSplitDigest !== baselineSplitDigest) {
    return { comparable: false, reason: "Split manifest digest mismatch" };
  }

  // Require the baseline to exist and be in completed status
  if (baselineRun.status !== "completed") {
    return { comparable: false, reason: `Baseline run status is ${baselineRun.status}, not completed` };
  }

  return { comparable: true };
}

function checkHasVariance(metrics: MetricResult[]): boolean {
  // Check if we have multiple seeds with the same metric
  const seedCounts = new Map<string, number>();
  for (const m of metrics) {
    if (m.seed !== undefined) {
      seedCounts.set(`${m.name}:${m.split}`, (seedCounts.get(`${m.name}:${m.split}`) ?? 0) + 1);
    }
  }
  return Array.from(seedCounts.values()).some((c) => c > 1);
}

function aggregateActualResources(runs: Run[]): Partial<ResourceBudget> {
  const aggregated: Partial<ResourceBudget> = {
    gpu_hours: 0,
    wallclock_hours: 0,
    data_fraction: 0,
    seeds: 0,
    epochs: 0,
  };

  for (const run of runs) {
    if (run.actual_resources) {
      aggregated.gpu_hours! += run.actual_resources.gpu_hours ?? 0;
      aggregated.wallclock_hours! += run.actual_resources.wallclock_hours ?? 0;
      aggregated.data_fraction! += run.actual_resources.data_fraction ?? 0;
      aggregated.seeds! += run.actual_resources.seeds ?? 0;
      aggregated.epochs! += run.actual_resources.epochs ?? 0;
    }
  }

  return aggregated;
}