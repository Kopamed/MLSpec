/**
 * MLSpec V3 Workflow Constants
 *
 * Defines the MLSpec-specific workflow IDs for filtering skill/command generation.
 * V3 adds mlspec-prepare skill for engineering readiness verification.
 */

export const MLSPEC_WORKFLOWS = [
  'mlspec-explore',
  'mlspec-propose',
  'mlspec-prepare',
  'mlspec-run',
  'mlspec-resolve',
  'mlspec-next',
] as const;

export type MlspecWorkflowId = (typeof MLSPEC_WORKFLOWS)[number];