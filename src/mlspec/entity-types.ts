/**
 * MLSpec Entity Types
 *
 * These types define the structure of MLSpec entities stored in the mlspec/ workspace.
 */

import { z } from 'zod';

/**
 * Evidence levels for ML experiments.
 * E0 = hypothesis only (no evidence file)
 * E1-E5 = progressively more rigorous validation
 */
export const EvidenceLevelSchema = z.enum(['E0', 'E1', 'E2', 'E3', 'E4', 'E5']);
export type EvidenceLevel = z.infer<typeof EvidenceLevelSchema>;

/**
 * Recommendation from a single evidence file.
 */
export const RecommendationSchema = z.enum(['promote', 'reject', 'inconclusive', 'retry', 'hold', 'none']);
export type Recommendation = z.infer<typeof RecommendationSchema>;

/**
 * Final decision for an experiment.
 */
export const DecisionSchema = z.enum(['promote', 'reject', 'inconclusive', 'hold', 'retry']);
export type Decision = z.infer<typeof DecisionSchema>;

/**
 * Reference to an entity being compared against (baseline or candidate).
 */
export const ComparisonRefSchema = z.object({
  entity_type: z.enum(['baseline', 'candidate']),
  name: z.string().min(1),
});
export type ComparisonRef = z.infer<typeof ComparisonRefSchema>;

/**
 * Metrics delta structure.
 */
export const MetricsSchema = z.record(z.string(), z.number()).optional();
export type Metrics = z.infer<typeof MetricsSchema>;

/**
 * Compute information for evidence.
 * Contains domain-relevant fields; not all fields apply to all ML domains.
 */
export const ComputeSchema = z.object({
  dataset_fraction: z.number().optional(),
  epochs: z.number().optional(),
  folds: z.number().optional(),
  seeds: z.array(z.number()).optional(),
  runtime: z.string().optional(),
  accelerator: z.string().optional(),
  cost: z.number().optional(),
  token_budget: z.number().optional(),
  image_size: z.number().optional(),
}).passthrough();
export type Compute = z.infer<typeof ComputeSchema>;

/**
 * Commands executed for evidence.
 * Optional fields for local-file workflows.
 */
export const EvidenceCommandsSchema = z.object({
  planned: z.string().optional(),
  executed: z.string().optional(),
}).optional();
export type EvidenceCommands = z.infer<typeof EvidenceCommandsSchema>;

/**
 * Artifacts produced by evidence.
 * Optional fields for local-file workflows.
 */
export const EvidenceArtifactsSchema = z.object({
  metrics_file: z.string().optional(),
  checkpoint: z.string().optional(),
  predictions: z.string().optional(),
  log_file: z.string().optional(),
  changed_files: z.array(z.string()).optional(),
}).optional();
export type EvidenceArtifacts = z.infer<typeof EvidenceArtifactsSchema>;

/**
 * Evidence file frontmatter.
 */
export const EvidenceFrontmatterSchema = z.object({
  evidence_level: EvidenceLevelSchema,
  recommendation: RecommendationSchema,
  comparison_ref: ComparisonRefSchema.nullable().optional(), // Can be null/optional
  metrics: MetricsSchema,
  compute: ComputeSchema.optional(),
  commands: EvidenceCommandsSchema,
  artifacts: EvidenceArtifactsSchema,
});
export type EvidenceFrontmatter = z.infer<typeof EvidenceFrontmatterSchema>;

/**
 * Experiment entity metadata (.experiment.yaml).
 */
export const ExperimentMetadataSchema = z.object({
  entity_type: z.literal('experiment'),
  schema: z.literal('ml-experiment'),
  comparison_ref: ComparisonRefSchema.nullable().optional(), // Can be filled in later
  created: z.string(),
});
export type ExperimentMetadata = z.infer<typeof ExperimentMetadataSchema>;

/**
 * Baseline entity metadata (.baseline.yaml).
 */
export const BaselineMetadataSchema = z.object({
  entity_type: z.literal('baseline'),
  created: z.string(),
  superseded_by: z.string().nullable().optional(), // null means not superseded
});
export type BaselineMetadata = z.infer<typeof BaselineMetadataSchema>;

/**
 * Candidate version record.
 */
export const CandidateVersionSchema = z.object({
  version: z.number(),
  file: z.string(),
  status: z.enum(['draft', 'finalized']),
  supporting_experiments: z.array(z.string()).optional(),
  created: z.string(),
});
export type CandidateVersion = z.infer<typeof CandidateVersionSchema>;

/**
 * Candidate entity metadata (.candidate.yaml).
 */
export const CandidateMetadataSchema = z.object({
  entity_type: z.literal('candidate'),
  name: z.string().min(1),
  current_version: z.number(),
  latest_finalized_version: z.number().nullable().optional(), // null means no finalized version
  versions: z.array(CandidateVersionSchema),
});
export type CandidateMetadata = z.infer<typeof CandidateMetadataSchema>;

/**
 * Decision file frontmatter.
 */
export const DecisionFrontmatterSchema = z.object({
  decision: DecisionSchema,
  target_candidate: z.string().optional(),
  rejection_reason: z.string().optional(),
  uncertainty_reason: z.string().optional(),
  blocker: z.string().optional(),
  revisit_condition: z.string().optional(),
  retry_plan: z.string().optional(),
});
export type DecisionFrontmatter = z.infer<typeof DecisionFrontmatterSchema>;

/**
 * Evaluation (workspace) metadata (.workspace.yaml).
 */
export const WorkspaceMetadataSchema = z.object({
  entity_type: z.literal('evaluation'),
  schema: z.literal('ml-experiment'),
  workspace_version: z.number(),
});
export type WorkspaceMetadata = z.infer<typeof WorkspaceMetadataSchema>;

/**
 * Entity type literal union for type guards.
 */
export type EntityType = 'experiment' | 'baseline' | 'candidate';

/**
 * Get the metadata schema for an entity type.
 */
export function getMetadataSchema(entityType: EntityType) {
  switch (entityType) {
    case 'experiment':
      return ExperimentMetadataSchema;
    case 'baseline':
      return BaselineMetadataSchema;
    case 'candidate':
      return CandidateMetadataSchema;
  }
}

/**
 * Get the metadata file name for an entity type.
 */
export function getMetadataFileName(entityType: EntityType): string {
  switch (entityType) {
    case 'experiment':
      return '.experiment.yaml';
    case 'baseline':
      return '.baseline.yaml';
    case 'candidate':
      return '.candidate.yaml';
  }
}

/**
 * Get the subdirectory for an entity type within mlspec/.
 */
export function getEntityDir(entityType: EntityType): string {
  switch (entityType) {
    case 'experiment':
      return 'experiments';
    case 'baseline':
      return 'baselines';
    case 'candidate':
      return 'candidates';
  }
}
