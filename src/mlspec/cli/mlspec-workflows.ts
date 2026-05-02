/**
 * MLSpec V2 Workflow Constants
 *
 * Defines the MLSpec-specific workflow IDs for filtering skill/command generation.
 * V2 replaces the old 6-skill model with 5 new skills.
 */

export const MLSPEC_WORKFLOWS = [
  'mlspec-explore',
  'mlspec-propose',
  'mlspec-run',
  'mlspec-resolve',
  'mlspec-next',
] as const;

export type MlspecWorkflowId = (typeof MLSPEC_WORKFLOWS)[number];