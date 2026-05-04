/**
 * MLSpec Reference Resolver (V2)
 *
 * Validates cross-entity references within the MLSpec V2 workspace.
 * V2 uses recipes/ instead of baselines/candidates/ and resolution.md instead of decision.md.
 */

import path from 'node:path';
import * as fs from 'node:fs';
import { resolveMlspecPath } from './utils.js';
import type {
  ExperimentMetadata,
  RecipeMetadata,
  ProtocolMetadata,
  PrepareMetadata,
  EvidenceRung,
} from './entity-types.js';
import { parse as parseYaml } from 'yaml';

/**
 * Check if a recipe exists.
 */
export function recipeExists(projectPath: string, recipeId: string): boolean {
  const recipePath = resolveMlspecPath(projectPath, 'recipes', recipeId, 'recipe.yaml');
  return fs.existsSync(recipePath);
}

/**
 * Load recipe metadata.
 */
export function loadRecipeMetadata(projectPath: string, recipeId: string): RecipeMetadata | null {
  const recipePath = resolveMlspecPath(projectPath, 'recipes', recipeId, 'recipe.yaml');
  if (!fs.existsSync(recipePath)) {
    return null;
  }
  try {
    const content = fs.readFileSync(recipePath, 'utf-8');
    return parseYaml(content) as RecipeMetadata;
  } catch {
    return null;
  }
}

/**
 * List all recipes.
 */
export function listRecipes(projectPath: string): string[] {
  const recipesDir = resolveMlspecPath(projectPath, 'recipes');
  if (!fs.existsSync(recipesDir)) {
    return [];
  }
  return fs.readdirSync(recipesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

/**
 * List all unique tags across all recipes.
 */
export function listRecipeTags(projectPath: string): string[] {
  const recipes = listRecipes(projectPath);
  const tags = new Set<string>();
  for (const recipeId of recipes) {
    const meta = loadRecipeMetadata(projectPath, recipeId);
    if (meta?.tags) {
      for (const tag of meta.tags) {
        tags.add(tag);
      }
    }
  }
  return Array.from(tags);
}

/**
 * Load all recipes into a Map for efficient access.
 */
export function loadAllRecipes(projectPath: string): Map<string, RecipeMetadata> {
  const recipes = listRecipes(projectPath);
  const result = new Map<string, RecipeMetadata>();
  for (const recipeId of recipes) {
    const meta = loadRecipeMetadata(projectPath, recipeId);
    if (meta) {
      result.set(recipeId, meta);
    }
  }
  return result;
}

/**
 * Check if an experiment exists.
 */
export function experimentExists(projectPath: string, experimentName: string): boolean {
  const experimentPath = resolveMlspecPath(projectPath, 'experiments', experimentName, 'experiment.yaml');
  return fs.existsSync(experimentPath);
}

/**
 * Load experiment metadata.
 */
export function loadExperimentMetadata(projectPath: string, experimentName: string): ExperimentMetadata | null {
  const experimentPath = resolveMlspecPath(projectPath, 'experiments', experimentName, 'experiment.yaml');
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
 * V2 Protocol state for an experiment.
 */
export type ProtocolStateV2 = 'needs evidence' | 'running' | 'needs resolution' | 'resolved';

/**
 * Get the protocol state for an experiment (V2).
 *
 * Determines what step in the experiment protocol an experiment is at
 * based on the files that exist and their content.
 */
export function getProtocolStateV2(projectPath: string, experiment: string): ProtocolStateV2 {
  const experimentDir = resolveMlspecPath(projectPath, 'experiments', experiment);
  const experimentPath = path.join(experimentDir, 'experiment.yaml');
  const evidenceDir = path.join(experimentDir, 'evidence');
  const resolutionPath = path.join(experimentDir, 'resolution.md');

  // Load experiment to check status
  if (!fs.existsSync(experimentPath)) {
    return 'needs evidence';
  }

  try {
    const content = fs.readFileSync(experimentPath, 'utf-8');
    const meta = parseYaml(content) as ExperimentMetadata;
    if (meta.status === 'resolved') {
      return 'resolved';
    }
    if (meta.status === 'running') {
      // Check if has evidence
      const hasEvidence = fs.existsSync(evidenceDir) &&
        fs.readdirSync(evidenceDir).filter((f: string) => f.endsWith('.md')).length > 0;
      return hasEvidence ? 'needs resolution' : 'running';
    }
    return 'needs evidence';
  } catch {
    return 'needs evidence';
  }
}

/**
 * Detect cycles in recipe parent chain.
 * Returns true if a cycle is detected.
 */
export function detectCycleInParentChain(projectPath: string, recipeId: string, visited: Set<string> = new Set()): boolean {
  if (visited.has(recipeId)) {
    return true; // Cycle detected
  }
  visited.add(recipeId);

  const meta = loadRecipeMetadata(projectPath, recipeId);
  if (!meta?.parent_recipe) {
    return false; // No parent, no cycle
  }

  return detectCycleInParentChain(projectPath, meta.parent_recipe, visited);
}

/**
 * Get the ancestry chain of a recipe.
 */
export function getRecipeAncestry(projectPath: string, recipeId: string): string[] {
  const ancestry: string[] = [recipeId];
  let currentId: string | null = recipeId;

  while (currentId) {
    const meta = loadRecipeMetadata(projectPath, currentId);
    if (!meta?.parent_recipe) {
      break;
    }
    ancestry.push(meta.parent_recipe);
    currentId = meta.parent_recipe;
  }

  return ancestry.reverse();
}

// ============================================================================
// V3 Reference Resolver Functions
// ============================================================================

/**
 * Check if protocol.md exists for an experiment.
 */
export function protocolExists(projectPath: string, experiment: string): boolean {
  const protocolPath = resolveMlspecPath(projectPath, 'experiments', experiment, 'protocol.md');
  return fs.existsSync(protocolPath);
}

/**
 * Parse YAML frontmatter from markdown content.
 */
function parseFrontmatter(content: string): Record<string, unknown> | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  try {
    return parseYaml(match[1]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Load protocol metadata.
 */
export function loadProtocolMetadata(projectPath: string, experiment: string): ProtocolMetadata | null {
  const protocolPath = resolveMlspecPath(projectPath, 'experiments', experiment, 'protocol.md');
  if (!fs.existsSync(protocolPath)) {
    return null;
  }
  try {
    const content = fs.readFileSync(protocolPath, 'utf-8');
    const parsed = parseFrontmatter(content);
    if (!parsed) return null;
    return parsed as ProtocolMetadata;
  } catch {
    return null;
  }
}

/**
 * Check if prepare.md exists for an experiment.
 */
export function prepareExists(projectPath: string, experiment: string): boolean {
  const preparePath = resolveMlspecPath(projectPath, 'experiments', experiment, 'prepare.md');
  return fs.existsSync(preparePath);
}

/**
 * Load prepare metadata.
 */
export function loadPrepareMetadata(projectPath: string, experiment: string): PrepareMetadata | null {
  const preparePath = resolveMlspecPath(projectPath, 'experiments', experiment, 'prepare.md');
  if (!fs.existsSync(preparePath)) {
    return null;
  }
  try {
    const content = fs.readFileSync(preparePath, 'utf-8');
    const parsed = parseFrontmatter(content);
    if (!parsed) return null;
    return parsed as PrepareMetadata;
  } catch {
    return null;
  }
}

/**
 * Get the evidence ladder for an experiment.
 */
export function getEvidenceLadder(projectPath: string, experiment: string): EvidenceRung[] {
  const protocol = loadProtocolMetadata(projectPath, experiment);
  return protocol?.evidence_ladder ?? [];
}

/**
 * Get the evidence path for a specific rung.
 */
export function getRungEvidencePath(projectPath: string, experiment: string, rung: string): string {
  return resolveMlspecPath(projectPath, 'experiments', experiment, 'evidence', `${rung}.md`);
}

/**
 * V3 Protocol state for an experiment.
 */
export type ProtocolStateV3 = 'needs prepare' | 'needs evidence' | 'running' | 'needs resolution' | 'resolved';

/**
 * Get the protocol state for an experiment (V3).
 *
 * Determines what step in the experiment protocol an experiment is at
 * based on the files that exist and their content.
 */
export function getProtocolStateV3(projectPath: string, experiment: string): ProtocolStateV3 {
  const experimentPath = resolveMlspecPath(projectPath, 'experiments', experiment, 'experiment.yaml');
  const evidenceDir = resolveMlspecPath(projectPath, 'experiments', experiment, 'evidence');
  const resolutionPath = resolveMlspecPath(projectPath, 'experiments', experiment, 'resolution.md');

  // Load experiment to check status
  if (!fs.existsSync(experimentPath)) {
    return 'needs prepare';
  }

  try {
    const content = fs.readFileSync(experimentPath, 'utf-8');
    const meta = parseYaml(content) as ExperimentMetadata;
    if (meta.status === 'resolved') {
      return 'resolved';
    }

    // Check if prepare is done
    const prepare = loadPrepareMetadata(projectPath, experiment);
    if (!prepare || prepare.status !== 'ready') {
      return 'needs prepare';
    }

    // Check if has evidence
    const hasEvidence = fs.existsSync(evidenceDir) &&
      fs.readdirSync(evidenceDir).filter((f: string) => f.endsWith('.md')).length > 0;

    if (!hasEvidence) {
      return 'needs evidence';
    }

    if (meta.status === 'running') {
      // Check if can_resolve rung has evidence
      const ladder = getEvidenceLadder(projectPath, experiment);
      const canResolveRung = ladder.find((r) => r.can_resolve);
      if (canResolveRung) {
        const evidencePath = getRungEvidencePath(projectPath, experiment, canResolveRung.id);
        if (fs.existsSync(evidencePath)) {
          return 'needs resolution';
        }
      }
      return 'running';
    }

    return 'needs evidence';
  } catch {
    return 'needs prepare';
  }
}