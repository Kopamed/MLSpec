/**
 * MLSpec Reference Resolver
 *
 * Validates cross-entity references within the MLSpec workspace.
 */

import path from 'node:path';
import * as fs from 'node:fs';
import {
  resolveMlspecPath,
  ARCHIVE_SUBDIRS,
  type ArchiveDecision,
} from './utils.js';
import type {
  BaselineMetadata,
  CandidateMetadata,
  ExperimentMetadata,
  ComparisonRef,
} from './entity-types.js';
import { parse as parseYaml } from 'yaml';

export interface ReferenceValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Check if a baseline exists.
 */
export function baselineExists(projectPath: string, baselineName: string): boolean {
  const baselinePath = resolveMlspecPath(projectPath, 'baselines', baselineName, '.baseline.yaml');
  return fs.existsSync(baselinePath);
}

/**
 * Check if a candidate exists.
 */
export function candidateExists(projectPath: string, candidateName: string): boolean {
  const candidatePath = resolveMlspecPath(projectPath, 'candidates', candidateName, '.candidate.yaml');
  return fs.existsSync(candidatePath);
}

/**
 * Check if an experiment exists.
 */
export function experimentExists(projectPath: string, experimentName: string): boolean {
  const experimentPath = resolveMlspecPath(projectPath, 'experiments', experimentName, '.experiment.yaml');
  return fs.existsSync(experimentPath);
}

/**
 * Validate a comparison reference (baseline or candidate).
 * Returns valid if ref is null/undefined (caller decides whether to warn or error).
 */
export function validateComparisonRef(projectPath: string, ref: ComparisonRef | null | undefined): ReferenceValidationResult {
  if (!ref) {
    // Null/undefined is considered valid - caller should warn if comparison_ref is expected
    return { valid: true };
  }
  if (ref.entity_type === 'baseline') {
    if (!baselineExists(projectPath, ref.name)) {
      return {
        valid: false,
        error: `Baseline '${ref.name}' does not exist`,
      };
    }
  } else if (ref.entity_type === 'candidate') {
    if (!candidateExists(projectPath, ref.name)) {
      return {
        valid: false,
        error: `Candidate '${ref.name}' does not exist`,
      };
    }
  }
  return { valid: true };
}

/**
 * Load baseline metadata.
 */
export function loadBaselineMetadata(projectPath: string, baselineName: string): BaselineMetadata | null {
  const baselinePath = resolveMlspecPath(projectPath, 'baselines', baselineName, '.baseline.yaml');
  if (!fs.existsSync(baselinePath)) {
    return null;
  }
  try {
    const content = fs.readFileSync(baselinePath, 'utf-8');
    return parseYaml(content) as BaselineMetadata;
  } catch {
    return null;
  }
}

/**
 * Load candidate metadata.
 */
export function loadCandidateMetadata(projectPath: string, candidateName: string): CandidateMetadata | null {
  const candidatePath = resolveMlspecPath(projectPath, 'candidates', candidateName, '.candidate.yaml');
  if (!fs.existsSync(candidatePath)) {
    return null;
  }
  try {
    const content = fs.readFileSync(candidatePath, 'utf-8');
    return parseYaml(content) as CandidateMetadata;
  } catch {
    return null;
  }
}

/**
 * Load experiment metadata.
 */
export function loadExperimentMetadata(projectPath: string, experimentName: string): ExperimentMetadata | null {
  const experimentPath = resolveMlspecPath(projectPath, 'experiments', experimentName, '.experiment.yaml');
  if (!fs.existsSync(experimentPath)) {
    return null;
  }
  try {
    const content = fs.readFileSync(experimentPath, 'utf-8');
    return parseYaml(content) as ExperimentMetadata;
  } catch {
    return null;
  }
}

/**
 * List all baselines.
 */
export function listBaselines(projectPath: string): string[] {
  const baselinesDir = resolveMlspecPath(projectPath, 'baselines');
  if (!fs.existsSync(baselinesDir)) {
    return [];
  }
  return fs.readdirSync(baselinesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

/**
 * List all candidates.
 */
export function listCandidates(projectPath: string): string[] {
  const candidatesDir = resolveMlspecPath(projectPath, 'candidates');
  if (!fs.existsSync(candidatesDir)) {
    return [];
  }
  return fs.readdirSync(candidatesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

/**
 * List all experiments (excluding archived).
 */
export function listExperiments(projectPath: string): string[] {
  const experimentsDir = resolveMlspecPath(projectPath, 'experiments');
  if (!fs.existsSync(experimentsDir)) {
    return [];
  }
  return fs.readdirSync(experimentsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

/**
 * Get archive subdirectory for a decision.
 */
export function getArchiveSubdir(decision: ArchiveDecision): string {
  return ARCHIVE_SUBDIRS[decision];
}

/**
 * List archived experiments.
 */
export function listArchivedExperiments(projectPath: string): Record<ArchiveDecision, string[]> {
  const archiveDir = resolveMlspecPath(projectPath, 'archive');
  const result: Record<ArchiveDecision, string[]> = {
    promote: [],
    reject: [],
    inconclusive: [],
    hold: [],
    retry: [],
  };

  if (!fs.existsSync(archiveDir)) {
    return result;
  }

  for (const [decisionKey, subdir] of Object.entries(ARCHIVE_SUBDIRS)) {
    const decision = decisionKey as ArchiveDecision;
    const subdirPath = path.join(archiveDir, subdir);
    if (fs.existsSync(subdirPath)) {
      result[decision] = fs.readdirSync(subdirPath, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);
    }
  }

  return result;
}

/**
 * Protocol state for an experiment.
 */
export type ProtocolState = 'needs hypothesis' | 'needs evidence' | 'needs decision' | 'needs promotion' | 'needs archive';

/**
 * Get the protocol state for an experiment.
 *
 * Determines what step in the experiment protocol an experiment is at
 * based on the files that exist and their content.
 */
export function getProtocolState(projectPath: string, experiment: string): ProtocolState {
  const experimentDir = resolveMlspecPath(projectPath, 'experiments', experiment);
  const hypothesisPath = path.join(experimentDir, 'hypothesis.md');
  const evidenceDir = path.join(experimentDir, 'evidence');
  const decisionPath = path.join(experimentDir, 'decision.md');

  // Check existence in order
  if (!fs.existsSync(hypothesisPath)) {
    return 'needs hypothesis';
  }

  const hasEvidence = fs.existsSync(evidenceDir) &&
    fs.readdirSync(evidenceDir).filter((f: string) => f.endsWith('.md')).length > 0;

  if (!hasEvidence) {
    return 'needs evidence';
  }

  if (!fs.existsSync(decisionPath)) {
    return 'needs decision';
  }

  // Load decision to check if promote
  try {
    const content = fs.readFileSync(decisionPath, 'utf-8');
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      const parsed = parseYaml(frontmatterMatch[1]);
      if (parsed.decision === 'promote' && parsed.target_candidate) {
        // Check if this experiment is listed in any candidate version's supporting_experiments
        const candidateMeta = loadCandidateMetadata(projectPath, parsed.target_candidate);
        const hasBeenPromoted = candidateMeta?.versions.some((v: { supporting_experiments?: string[] }) =>
          v.supporting_experiments?.includes(experiment)
        );
        if (!hasBeenPromoted) {
          return 'needs promotion';
        }
      }
    }
  } catch {
    // If we can't parse decision, assume needs archive
  }

  return 'needs archive';
}
