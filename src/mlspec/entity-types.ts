/**
 * MLSpec V2 Entity Types
 *
 * These types define the structure of MLSpec V2 entities stored in the mlspec/ workspace.
 * V2 replaces baseline/candidate model with recipe graph, and E1-E5 with smoke/validation/final stages.
 */

import { z } from 'zod';

/**
 * Recipe tags for categorizing recipes.
 */
export const RecipeTagSchema = z.enum(['baseline', 'candidate', 'current-best', 'variant', 'archived']);
export type RecipeTag = z.infer<typeof RecipeTagSchema>;

/**
 * Evidence stages for semantic evaluation levels.
 */
export const EvidenceStageSchema = z.enum(['smoke', 'validation', 'final']);
export type EvidenceStage = z.infer<typeof EvidenceStageSchema>;

/**
 * Resolution types for experiment outcomes.
 */
export const ResolutionTypeSchema = z.enum(['accept', 'reject', 'retry', 'hold', 'inconclusive']);
export type ResolutionType = z.infer<typeof ResolutionTypeSchema>;

/**
 * Experiment status transitions.
 */
export const ExperimentStatusSchema = z.enum(['draft', 'running', 'resolved']);
export type ExperimentStatus = z.infer<typeof ExperimentStatusSchema>;

/**
 * Recommendation from evidence file.
 */
export const EvidenceRecommendationSchema = z.enum(['accept', 'reject', 'inconclusive', 'retry', 'hold', 'none']);
export type EvidenceRecommendation = z.infer<typeof EvidenceRecommendationSchema>;

// ============================================================================
// Recipe Entity
// ============================================================================

/**
 * Recipe config structure containing full ML pipeline definition.
 */
export const RecipeConfigSchema = z.object({
  data: z.record(z.string(), z.any()).optional().describe('Dataset configuration'),
  preprocessing: z.array(z.string()).optional().describe('Preprocessing steps'),
  model: z.record(z.string(), z.any()).optional().describe('Model type and hyperparameters'),
  training: z.record(z.string(), z.any()).optional().describe('Training configuration'),
  inference: z.record(z.string(), z.any()).optional().describe('Inference configuration'),
  artifacts: z.record(z.string(), z.any()).optional().describe('Expected artifact files'),
}).passthrough();
export type RecipeConfig = z.infer<typeof RecipeConfigSchema>;

/**
 * Recipe entity metadata (recipe.yaml).
 */
export const RecipeMetadataSchema = z.object({
  entity_type: z.literal('recipe'),
  schema: z.literal('ml-experiment-v2'),
  id: z.string().min(1).describe('Globally unique recipe identifier (kebab-case)'),
  name: z.string().min(1).describe('Human-readable name'),
  tags: z.array(RecipeTagSchema).default([]).describe('Recipe tags'),
  parent_recipe: z.string().nullable().optional().describe('Parent recipe ID or null for root'),
  created_by_experiment: z.string().nullable().optional().describe('Creating experiment ID or null'),
  config: RecipeConfigSchema.optional().describe('Full ML pipeline configuration'),
  metrics: z.record(z.string(), z.number()).optional().describe('Achieved performance metrics'),
  created: z.string().describe('ISO timestamp'),
});
export type RecipeMetadata = z.infer<typeof RecipeMetadataSchema>;

// ============================================================================
// Experiment Entity
// ============================================================================

/**
 * Experiment entity metadata (experiment.yaml).
 */
export const ExperimentMetadataSchema = z.object({
  entity_type: z.literal('experiment'),
  schema: z.literal('ml-experiment-v2'),
  id: z.string().min(1).describe('Experiment identifier'),
  status: ExperimentStatusSchema.default('draft').describe('Experiment status'),
  base_recipe: z.string().describe('Reference to recipe being modified'),
  proposed_recipe: z.string().describe('Proposed recipe ID (not yet created)'),
  proposed_change: z.string().describe('Description of what changes from base'),
  controlled_variables: z.array(z.string()).optional().describe('What stays fixed'),
  success_criteria: z.array(z.string()).optional().describe('Metric thresholds for acceptance'),
  abort_criteria: z.array(z.string()).optional().describe('Conditions for early termination'),
  evidence_plan: z.array(EvidenceStageSchema).optional().describe('Planned evidence stages'),
  created: z.string().describe('ISO timestamp'),
});
export type ExperimentMetadata = z.infer<typeof ExperimentMetadataSchema>;

// ============================================================================
// Evidence Entity
// ============================================================================

/**
 * Single run result within evidence.
 */
export const EvidenceRunSchema = z.object({
  seed: z.number().describe('Random seed used'),
  command: z.string().describe('Actual command executed'),
  completed: z.string().describe('ISO timestamp'),
  duration_minutes: z.number().optional().describe('Execution time in minutes'),
  metrics: z.record(z.string(), z.number()).describe('Metric values'),
  artifacts: z.record(z.string(), z.string()).optional().describe('Artifact paths'),
}).passthrough();
export type EvidenceRun = z.infer<typeof EvidenceRunSchema>;

/**
 * Aggregated statistics across runs.
 * Structure: { metricName: { mean: number|null, std: number|null } }
 */
export const EvidenceAggregateSchema = z.record(z.string(), z.object({
  mean: z.number().nullable(),
  std: z.number().nullable(),
}).passthrough()).optional().describe('Aggregated statistics');
export type EvidenceAggregate = z.infer<typeof EvidenceAggregateSchema>;

/**
 * Evidence file frontmatter.
 */
export const EvidenceFrontmatterSchema = z.object({
  entity_type: z.literal('evidence'),
  experiment_id: z.string().describe('Parent experiment ID'),
  stage: EvidenceStageSchema.describe('Evidence stage (smoke|validation|final)'),
  runs: z.array(EvidenceRunSchema).describe('Individual run results'),
  aggregate: EvidenceAggregateSchema.optional().describe('Aggregated statistics'),
  summary: z.string().optional().describe('Human-readable summary'),
  recommendation: EvidenceRecommendationSchema.default('none').describe('Suggested next action'),
  created: z.string().describe('ISO timestamp'),
});
export type EvidenceFrontmatter = z.infer<typeof EvidenceFrontmatterSchema>;

// ============================================================================
// Resolution Entity
// ============================================================================

/**
 * Resolution document frontmatter.
 */
export const ResolutionFrontmatterSchema = z.object({
  entity_type: z.literal('resolution'),
  experiment_id: z.string().describe('Parent experiment ID'),
  resolution: ResolutionTypeSchema.describe('Resolution type'),
  accepted_recipe: z.string().optional().describe('Created recipe ID (if accept)'),
  accepted_tags: z.array(RecipeTagSchema).optional().describe('Tags for accepted recipe'),
  rejection_reason: z.string().optional().describe('Reason for rejection'),
  uncertainty_reason: z.string().optional().describe('Reason for inconclusive'),
  blocker: z.string().optional().describe('Blocker for hold'),
  revisit_condition: z.string().optional().describe('Condition for retry'),
  retry_plan: z.string().optional().describe('Plan for retry'),
  rationale: z.string().optional().describe('Explanation of decision'),
  supporting_evidence: z.array(z.object({
    stage: EvidenceStageSchema,
    summary: z.string(),
  })).optional().describe('References to supporting evidence'),
  created: z.string().describe('ISO timestamp'),
});
export type ResolutionFrontmatter = z.infer<typeof ResolutionFrontmatterSchema>;

// ============================================================================
// Finding Entity (V2 - unchanged pattern)
// ============================================================================

/**
 * Finding entity metadata (finding.yaml).
 */
export const FindingMetadataSchema = z.object({
  entity_type: z.literal('finding'),
  created: z.string().describe('ISO timestamp'),
});
export type FindingMetadata = z.infer<typeof FindingMetadataSchema>;

// ============================================================================
// Workspace Entity (V2)
// ============================================================================

/**
 * Evaluation (workspace) metadata (.workspace.yaml).
 */
export const WorkspaceMetadataSchema = z.object({
  entity_type: z.literal('evaluation'),
  schema: z.literal('ml-experiment-v2'),
  workspace_version: z.number().default(2),
});
export type WorkspaceMetadata = z.infer<typeof WorkspaceMetadataSchema>;

// ============================================================================
// Entity Type Utilities
// ============================================================================

/**
 * Entity type literal union for type guards.
 */
export type EntityTypeV2 = 'recipe' | 'experiment' | 'finding';

/**
 * Get the metadata schema for a V2 entity type.
 */
export function getMetadataSchemaV2(entityType: EntityTypeV2) {
  switch (entityType) {
    case 'recipe':
      return RecipeMetadataSchema;
    case 'experiment':
      return ExperimentMetadataSchema;
    case 'finding':
      return FindingMetadataSchema;
  }
}

/**
 * Get the metadata file name for a V2 entity type.
 */
export function getMetadataFileNameV2(entityType: EntityTypeV2): string {
  switch (entityType) {
    case 'recipe':
      return 'recipe.yaml';
    case 'experiment':
      return 'experiment.yaml';
    case 'finding':
      return 'finding.yaml';
  }
}

/**
 * Get the subdirectory for a V2 entity type within mlspec/.
 */
export function getEntityDirV2(entityType: EntityTypeV2): string {
  switch (entityType) {
    case 'recipe':
      return 'recipes';
    case 'experiment':
      return 'experiments';
    case 'finding':
      return 'findings';
  }
}