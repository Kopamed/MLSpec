/**
 * MLSpec Entity Types
 *
 * These types define the structure of MLSpec entities stored in the mlspec/ workspace.
 */

import { z } from 'zod';

/**
 * Recipe tags for categorizing recipes.
 */
export const RecipeTagSchema = z.enum(['baseline', 'candidate', 'current-best', 'variant', 'archived']);
export type RecipeTag = z.infer<typeof RecipeTagSchema>;

/**
 * Resolution types for experiment outcomes.
 */
export const ResolutionTypeSchema = z.enum(['accept', 'reject', 'retry', 'hold']);
export type ResolutionType = z.infer<typeof ResolutionTypeSchema>;

/**
 * Experiment status transitions.
 */
export const ExperimentStatusSchema = z.enum(['draft', 'running', 'resolved']);
export type ExperimentStatus = z.infer<typeof ExperimentStatusSchema>;

// ============================================================================
// V3 Schemas (ml-experiment-v3)
// ============================================================================

/**
 * Compute agreement for resource allocation.
 */
export const ComputeAgreementSchema = z.object({
  cpu_cores: z.number().optional().describe('Number of CPU cores required'),
  gpu_devices: z.number().optional().describe('Number of GPU devices required'),
  gpu_memory_gb: z.number().optional().describe('GPU memory in GB required'),
  wall_time_max_hours: z.number().optional().describe('Maximum wall time in hours'),
  token_budget: z.number().optional().describe('Token budget for training'),
});
export type ComputeAgreement = z.infer<typeof ComputeAgreementSchema>;

/**
 * Budget for an evidence rung.
 */
export const RungBudgetSchema = z.object({
  model_params: z.number().optional().describe('Model parameter count'),
  training_tokens: z.number().optional().describe('Training tokens'),
  eval_tokens: z.number().optional().describe('Evaluation tokens'),
  max_wall_time_hours: z.number().optional().describe('Max wall time in hours'),
});
export type RungBudget = z.infer<typeof RungBudgetSchema>;

/**
 * Arm configuration within an evidence rung.
 */
export const RungArmSchema = z.object({
  id: z.literal('baseline').describe('Arm identifier'),
  recipe_ref: z.string().nullable().describe('Recipe reference or null for new'),
  config_overrides: z.record(z.string(), z.any()).optional().describe('Config overrides'),
  train_from_scratch: z.boolean().optional().describe('Whether to train from scratch'),
}).or(z.object({
  id: z.literal('treatment'),
  recipe_ref: z.string().describe('Base recipe ID'),
  config_overrides: z.record(z.string(), z.any()).optional().describe('Intervention applied here'),
}));
export type RungArm = z.infer<typeof RungArmSchema>;

/**
 * Benchmark configuration for an evidence rung.
 */
export const RungBenchmarkSchema = z.object({
  dataset: z.string().describe('Benchmark dataset name'),
  metrics: z.array(z.string()).describe('Metrics to evaluate'),
});
export type RungBenchmark = z.infer<typeof RungBenchmarkSchema>;

/**
 * Comparison configuration for an evidence rung.
 */
export const RungComparisonSchema = z.object({
  comparison_required: z.boolean().describe('Whether comparison is required'),
  comparison_metric: z.string().optional().describe('Metric to compare'),
  comparison_direction: z.enum(['higher_is_better', 'lower_is_better']).optional().describe('Direction for success'),
  success_threshold: z.number().optional().describe('Threshold for success'),
});
export type RungComparison = z.infer<typeof RungComparisonSchema>;

/**
 * Abort criterion for early termination.
 */
export const AbortCriterionSchema = z.object({
  metric: z.string().describe('Metric to check'),
  condition: z.enum(['gt', 'lt', 'gte', 'lte', 'eq']).describe('Comparison condition'),
  threshold: z.number().describe('Threshold value'),
});
export type AbortCriterion = z.infer<typeof AbortCriterionSchema>;

/**
 * A single rung in the evidence ladder.
 */
export const EvidenceRungSchema = z.object({
  id: z.string().describe('Unique rung identifier (e.g., pilot, validation)'),
  purpose: z.string().describe('Human-readable purpose description'),
  budget: RungBudgetSchema.optional().describe('Compute budget for this rung'),
  arms: z.object({
    baseline_arm: z.object({
      id: z.literal('baseline'),
      recipe_ref: z.string().nullable().describe('Recipe reference or null'),
      config_overrides: z.record(z.string(), z.any()).optional(),
      train_from_scratch: z.boolean().optional(),
    }),
    treatment_arm: z.object({
      id: z.literal('treatment'),
      recipe_ref: z.string().describe('Base recipe ID'),
      config_overrides: z.record(z.string(), z.any()).optional(),
    }),
  }),
  benchmark: RungBenchmarkSchema.optional().describe('Benchmark configuration'),
  comparison: RungComparisonSchema.optional().describe('Comparison configuration'),
  abort_criteria: z.array(AbortCriterionSchema).optional().describe('Early termination conditions'),
  can_resolve: z.boolean().default(false).describe('Whether this rung can resolve the experiment'),
});
export type EvidenceRung = z.infer<typeof EvidenceRungSchema>;

/**
 * Baseline requirements for a specific rung.
 */
export const BaselineRequirementSchema = z.object({
  required: z.boolean().describe('Whether baseline is required'),
  recipe_ref: z.string().nullable().optional().describe('Recipe reference or null'),
  train_from_scratch: z.boolean().optional().describe('Whether to train from scratch'),
  required_config_match: z.object({
    model_params: z.number().optional(),
    training_tokens: z.number().optional(),
    config_hash: z.string().optional(),
  }).optional().describe('Required configuration match'),
});
export type BaselineRequirement = z.infer<typeof BaselineRequirementSchema>;

/**
 * Protocol metadata schema (protocol.md).
 */
export const ProtocolMetadataSchema = z.object({
  entity_type: z.literal('protocol'),
  schema: z.literal('ml-experiment-v3'),
  experiment_id: z.string().describe('Parent experiment ID'),
  compute_agreement: ComputeAgreementSchema.describe('Compute resource requirements (required for V3)'),
  evidence_ladder: z.array(EvidenceRungSchema).describe('Evidence ladder with user-defined rungs'),
  baseline_requirements: z.record(z.string(), BaselineRequirementSchema).optional().describe('Per-rung baseline requirements'),
});
export type ProtocolMetadata = z.infer<typeof ProtocolMetadataSchema>;

/**
 * Prepare check result.
 */
export const PrepareCheckSchema = z.object({
  id: z.string().describe('Check identifier'),
  name: z.string().describe('Check name'),
  status: z.enum(['pass', 'fail', 'skip']).describe('Check status'),
  notes: z.string().optional().describe('Check notes'),
});
export type PrepareCheck = z.infer<typeof PrepareCheckSchema>;

/**
 * Blocking issue found during prepare.
 */
export const BlockingIssueSchema = z.object({
  type: z.string().describe('Issue type'),
  location: z.string().optional().describe('Issue location'),
  description: z.string().describe('Issue description'),
  can_fix_in_prepare: z.boolean().describe('Whether can be fixed in prepare stage'),
  suggested_fix: z.string().optional().describe('Suggested fix'),
});
export type BlockingIssue = z.infer<typeof BlockingIssueSchema>;

/**
 * Protocol issue found during prepare.
 */
export const ProtocolIssueSchema = z.object({
  type: z.string().describe('Issue type'),
  description: z.string().describe('Issue description'),
  recommendation: z.string().optional().describe('Recommendation'),
});
export type ProtocolIssue = z.infer<typeof ProtocolIssueSchema>;

/**
 * Baseline availability for a rung.
 */
export const BaselineAvailabilitySchema = z.object({
  available: z.boolean().describe('Whether baseline is available'),
  source: z.enum(['existing', 'will_train', 'unavailable']).describe('Source of baseline'),
  recipe_ref: z.string().nullable().optional().describe('Recipe reference'),
  notes: z.string().optional().describe('Notes'),
});
export type BaselineAvailability = z.infer<typeof BaselineAvailabilitySchema>;

/**
 * Prepare metadata schema (prepare.md).
 */
export const PrepareMetadataSchema = z.object({
  entity_type: z.literal('prepare'),
  schema: z.literal('ml-experiment-v3'),
  experiment_id: z.string().describe('Parent experiment ID'),
  status: z.enum(['ready', 'needs_work', 'protocol_change_required']).describe('Prepare status'),
  completed: z.string().describe('ISO timestamp'),
  checks: z.array(PrepareCheckSchema).describe('List of checks performed'),
  blocking_issues: z.array(BlockingIssueSchema).optional().describe('Fixable engineering issues'),
  protocol_issues: z.array(ProtocolIssueSchema).optional().describe('Semantic mismatches'),
  baseline_availability: z.record(z.string(), BaselineAvailabilitySchema).describe('Per-rung baseline availability'),
});
export type PrepareMetadata = z.infer<typeof PrepareMetadataSchema>;

/**
 * Mechanistic outcome result.
 */
export const MechanisticOutcomeResultSchema = z.enum(['success', 'failure', 'inconclusive']);
export type MechanisticOutcomeResult = z.infer<typeof MechanisticOutcomeResultSchema>;

/**
 * Practical outcome result.
 */
export const PracticalOutcomeResultSchema = z.enum(['positive', 'negative', 'inconclusive', 'variant_accepted']);
export type PracticalOutcomeResult = z.infer<typeof PracticalOutcomeResultSchema>;

/**
 * Mechanistic outcome assessment.
 */
export const MechanisticOutcomeSchema = z.object({
  hypothesis: z.string().describe('Mechanistic hypothesis'),
  result: MechanisticOutcomeResultSchema.describe('Outcome result'),
  evidence_ref: z.string().optional().describe('Reference to evidence'),
  notes: z.string().optional().describe('Assessment notes'),
});
export type MechanisticOutcome = z.infer<typeof MechanisticOutcomeSchema>;

/**
 * Practical outcome assessment.
 */
export const PracticalOutcomeSchema = z.object({
  hypothesis: z.string().describe('Practical hypothesis'),
  result: PracticalOutcomeResultSchema.describe('Outcome result'),
  evidence_ref: z.string().optional().describe('Reference to evidence'),
  notes: z.string().optional().describe('Assessment notes'),
});
export type PracticalOutcome = z.infer<typeof PracticalOutcomeSchema>;

/**
 * Supporting evidence reference.
 */
export const SupportingEvidenceSchema = z.object({
  rung: z.string().describe('Rung ID'),
  comparison_metric: z.string().optional().describe('Comparison metric'),
  baseline_value: z.number().optional().describe('Baseline value'),
  treatment_value: z.number().optional().describe('Treatment value'),
  delta: z.number().optional().describe('Delta between values'),
});
export type SupportingEvidence = z.infer<typeof SupportingEvidenceSchema>;

/**
 * Evidence run result within a rung.
 */
export const RungEvidenceRunSchema = z.object({
  seed: z.number().describe('Random seed used'),
  command: z.string().describe('Actual command executed'),
  completed: z.string().describe('ISO timestamp'),
  duration_minutes: z.number().optional().describe('Execution time in minutes'),
  metrics: z.record(z.string(), z.number()).describe('Metric values'),
  artifacts: z.record(z.string(), z.string()).optional().describe('Artifact paths'),
}).passthrough();
export type RungEvidenceRun = z.infer<typeof RungEvidenceRunSchema>;

/**
 * Aggregated arm results.
 */
export const RungArmResultSchema = z.object({
  recipe_ref: z.string().describe('Recipe reference'),
  runs: z.array(RungEvidenceRunSchema).describe('Individual run results'),
});
export type RungArmResult = z.infer<typeof RungArmResultSchema>;

/**
 * Aggregated statistics for a metric.
 */
export const RungAggregateMetricSchema = z.object({
  mean: z.number().nullable().describe('Mean value'),
  std: z.number().nullable().describe('Standard deviation'),
});
export type RungAggregateMetric = z.infer<typeof RungAggregateMetricSchema>;

/**
 * Aggregated results for an arm.
 */
export const RungAggregateArmSchema = z.object({
  baseline: z.record(z.string(), RungAggregateMetricSchema).optional().describe('Baseline aggregated metrics'),
  treatment: z.record(z.string(), RungAggregateMetricSchema).optional().describe('Treatment aggregated metrics'),
});
export type RungAggregateArm = z.infer<typeof RungAggregateArmSchema>;

/**
 * Comparison result between arms.
 */
export const RungComparisonResultSchema = z.object({
  comparison_metric: z.string().describe('Metric compared'),
  baseline_value: z.number().nullable().describe('Baseline value'),
  treatment_value: z.number().nullable().describe('Treatment value'),
  delta: z.number().nullable().describe('Delta value'),
  delta_percent: z.number().nullable().describe('Delta as percentage'),
  success: z.boolean().describe('Whether comparison succeeded'),
});
export type RungComparisonResult = z.infer<typeof RungComparisonResultSchema>;

/**
 * Abort criterion evaluation result.
 */
export const AbortCriterionEvaluationSchema = z.object({
  criterion: AbortCriterionSchema.describe('The abort criterion'),
  metric: z.string().describe('Metric evaluated'),
  condition: z.enum(['gt', 'lt', 'gte', 'lte', 'eq']).describe('Condition used'),
  threshold: z.number().describe('Threshold value'),
  triggered: z.boolean().describe('Whether criterion was triggered'),
  actual_value: z.number().nullable().describe('Actual metric value'),
});
export type AbortCriterionEvaluation = z.infer<typeof AbortCriterionEvaluationSchema>;

/**
 * Rung evidence schema (evidence/<rung>.md) - replaces EvidenceFrontmatterSchema.
 */
export const RungEvidenceSchema = z.object({
  entity_type: z.literal('evidence'),
  schema: z.literal('ml-experiment-v3'),
  experiment_id: z.string().describe('Parent experiment ID'),
  rung: z.string().describe('Rung ID (not stage)'),
  budget: RungBudgetSchema.optional().describe('Budget used'),
  baseline_arm: RungArmResultSchema.describe('Baseline arm results'),
  treatment_arm: RungArmResultSchema.describe('Treatment arm results'),
  aggregate: RungAggregateArmSchema.optional().describe('Aggregated results'),
  comparison: RungComparisonResultSchema.nullable().optional().describe('Comparison result (null if comparison not required)'),
  abort_criteria_evaluation: z.array(AbortCriterionEvaluationSchema).optional().describe('Abort criterion evaluations'),
});
export type RungEvidence = z.infer<typeof RungEvidenceSchema>;

/**
 * Resolution frontmatter schema (resolution.md) - V3 with separated outcomes.
 */
export const ResolutionFrontmatterSchema = z.object({
  entity_type: z.literal('resolution'),
  schema: z.literal('ml-experiment-v3'),
  experiment_id: z.string().describe('Parent experiment ID'),
  resolution: ResolutionTypeSchema.describe('Resolution type'),
  mechanistic_outcome: MechanisticOutcomeSchema.describe('Mechanistic hypothesis outcome'),
  practical_outcome: PracticalOutcomeSchema.describe('Practical utility outcome'),
  decision_rationale: z.string().describe('Explanation of decision'),
  supporting_evidence: z.array(SupportingEvidenceSchema).optional().describe('Supporting evidence references'),
  created: z.string().describe('ISO timestamp'),
});
export type ResolutionFrontmatter = z.infer<typeof ResolutionFrontmatterSchema>;

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
  schema: z.literal('ml-experiment-v3'),
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
  schema: z.literal('ml-experiment-v3'),
  id: z.string().min(1).describe('Experiment identifier'),
  status: ExperimentStatusSchema.default('draft').describe('Experiment status'),
  base_recipe: z.string().describe('Reference to recipe being modified'),
  proposed_recipe: z.string().describe('Proposed recipe ID (not yet created)'),
  proposed_change: z.string().describe('Description of what changes from base'),
  controlled_variables: z.array(z.string()).optional().describe('What stays fixed'),
  success_criteria: z.array(z.string()).optional().describe('Metric thresholds for acceptance'),
  abort_criteria: z.array(z.string()).optional().describe('Conditions for early termination'),
  // V3: evidence_plan removed - replaced by protocol.md with evidence_ladder
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

// ============================================================================
// Finding Entity
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
// Workspace Entity
// ============================================================================

/**
 * Evaluation (workspace) metadata (.workspace.yaml).
 */
export const WorkspaceMetadataSchema = z.object({
  entity_type: z.literal('evaluation'),
  schema: z.literal('ml-experiment-v3'),
  workspace_version: z.number().default(3),
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

// ============================================================================
// V3 Entity Type Utilities
// ============================================================================

/**
 * Entity type literal union for V3 artifacts.
 */
export type EntityTypeV3 = 'protocol' | 'prepare' | 'evidence' | 'resolution';

/**
 * Get the artifact file name for a V3 entity type.
 */
export function getArtifactFileNameV3(entityType: EntityTypeV3): string {
  switch (entityType) {
    case 'protocol':
      return 'protocol.md';
    case 'prepare':
      return 'prepare.md';
    case 'evidence':
      return 'evidence.md';
    case 'resolution':
      return 'resolution.md';
  }
}

/**
 * Get the subdirectory for a V3 entity type within an experiment/.
 */
export function getArtifactDirV3(entityType: EntityTypeV3): string | null {
  switch (entityType) {
    case 'protocol':
    case 'prepare':
    case 'resolution':
      return null; // These are at experiment root
    case 'evidence':
      return 'evidence';
  }
}