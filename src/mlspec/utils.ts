/**
 * MLSpec Utilities
 *
 * Shared utilities for MLSpec operations.
 */

import path from 'node:path';
import * as fs from 'node:fs';
import { promises as fsp } from 'node:fs';

/**
 * MLSpec workspace directory name.
 */
export const MLSPEC_DIR = 'mlspec';

/**
 * Archive subdirectories by decision outcome.
 */
export const ARCHIVE_SUBDIRS = {
  promote: 'promoted',
  reject: 'rejected',
  inconclusive: 'inconclusive',
  hold: 'held',
  retry: 'retry',
} as const;

export type ArchiveDecision = keyof typeof ARCHIVE_SUBDIRS;

/**
 * Check if a path is within the MLSpec workspace.
 */
export function isInMlspecWorkspace(projectPath: string, targetPath: string): boolean {
  const mlspecPath = path.join(projectPath, MLSPEC_DIR);
  const normalizedTarget = path.normalize(targetPath);
  return normalizedTarget.startsWith(mlspecPath + path.sep) || normalizedTarget === mlspecPath;
}

/**
 * Resolve MLSpec workspace path.
 */
export function resolveMlspecPath(projectPath: string, ...segments: string[]): string {
  return path.join(projectPath, MLSPEC_DIR, ...segments);
}

/**
 * Check if MLSpec workspace exists.
 */
export function mlspecWorkspaceExists(projectPath: string): boolean {
  return fs.existsSync(path.join(projectPath, MLSPEC_DIR));
}

/**
 * Create MLSpec V2 workspace directory structure.
 */
export async function createMlspecWorkspace(projectPath: string): Promise<void> {
  // V2 uses recipes/ instead of baselines/candidates/, no archive/
  const subdirs = ['recipes', 'experiments', 'findings'];

  for (const subdir of subdirs) {
    const dirPath = resolveMlspecPath(projectPath, subdir);
    await fsp.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Get the current date in ISO format.
 */
export function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get a slug-safe name from a user-provided name.
 */
export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Validate an entity name.
 * Names must be non-empty and contain only alphanumeric, dash, and underscore.
 */
export function isValidEntityName(name: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(name) && name.length > 0;
}
