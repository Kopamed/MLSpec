/**
 * MLSpec Workflow Constants
 *
 * Defines the MLSpec-specific workflow IDs for filtering skill/command generation.
 */

export const MLSPEC_WORKFLOWS = [
  'mlspec-explore',
  'mlspec-propose-experiment',
  'mlspec-run-evidence',
  'mlspec-decide',
  'mlspec-promote',
  'mlspec-archive',
] as const;

export type MlspecWorkflowId = (typeof MLSPEC_WORKFLOWS)[number];
