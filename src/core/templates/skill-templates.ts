/**
 * Agent Skill Templates
 *
 * Re-exports split workflow template modules.
 */

export type { SkillTemplate, CommandTemplate } from './types.js';

export { getExploreSkillTemplate, getOpsxExploreCommandTemplate } from './workflows/explore.js';
export { getNewChangeSkillTemplate, getOpsxNewCommandTemplate } from './workflows/new-change.js';
export { getContinueChangeSkillTemplate, getOpsxContinueCommandTemplate } from './workflows/continue-change.js';
export { getApplyChangeSkillTemplate, getOpsxApplyCommandTemplate } from './workflows/apply-change.js';
export { getFfChangeSkillTemplate, getOpsxFfCommandTemplate } from './workflows/ff-change.js';
export { getSyncSpecsSkillTemplate, getOpsxSyncCommandTemplate } from './workflows/sync-specs.js';
export { getArchiveChangeSkillTemplate, getOpsxArchiveCommandTemplate } from './workflows/archive-change.js';
export { getBulkArchiveChangeSkillTemplate, getOpsxBulkArchiveCommandTemplate } from './workflows/bulk-archive-change.js';
export { getVerifyChangeSkillTemplate, getOpsxVerifyCommandTemplate } from './workflows/verify-change.js';
export { getOnboardSkillTemplate, getOpsxOnboardCommandTemplate } from './workflows/onboard.js';
export { getOpsxProposeSkillTemplate, getOpsxProposeCommandTemplate } from './workflows/propose.js';
export { getFeedbackSkillTemplate } from './workflows/feedback.js';

// MLSpec V2 Skills (replacing V1)
export { getMlspecExploreSkillTemplate, getMlspecExploreCommandTemplate } from './workflows/mlspec-explore.js';
export { getMlspecProposeSkillTemplate, getMlspecProposeCommandTemplate } from './workflows/mlspec-propose.js';
export { getMlspecRunSkillTemplate, getMlspecRunCommandTemplate } from './workflows/mlspec-run.js';
export { getMlspecResolveSkillTemplate, getMlspecResolveCommandTemplate } from './workflows/mlspec-resolve.js';
export { getMlspecNextSkillTemplate, getMlspecNextCommandTemplate } from './workflows/mlspec-next.js';