import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import { promises as fs } from 'fs';
import os from 'os';
import { spawn } from 'child_process';

const projectRoot = path.resolve(__dirname, '../..');

async function runMlspec(args: string[], cwd?: string): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const cliEntry = path.join(projectRoot, 'dist', 'mlspec', 'index.js');
  const workingDir = cwd || projectRoot;

  return new Promise((resolve) => {
    const child = spawn(process.execPath, [cliEntry, ...args], {
      cwd: workingDir,
      env: { ...process.env, OPEN_SPEC_INTERACTIVE: '0' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (chunk) => { stdout += chunk; });
    child.stderr?.on('data', (chunk) => { stderr += chunk; });

    child.on('close', (code) => {
      resolve({ exitCode: code ?? 0, stdout, stderr });
    });

    child.on('error', () => {
      resolve({ exitCode: 1, stdout, stderr });
    });
  });
}

describe('MLSpec V2 Integration Tests', () => {

  describe('5.2.1 mlspec new recipe creates recipes/ structure', () => {
    let tmpDir: string;

    beforeEach(async () => {
      tmpDir = path.join(os.tmpdir(), `mlspec-test-${Date.now()}-${Math.random()}`);
      await fs.mkdir(tmpDir, { recursive: true });
    });

    afterEach(async () => {
      await fs.rm(tmpDir, { recursive: true, force: true });
    });

    it('should create recipes/ directory structure', async () => {
      await runMlspec(['init', '--tools', 'none'], tmpDir);

      const result = await runMlspec(['new', 'recipe', 'my-recipe', '--tag', 'baseline'], tmpDir);
      expect(result.exitCode).toBe(0);

      const recipePath = path.join(tmpDir, 'mlspec', 'recipes', 'my-recipe');
      expect(await fs.stat(recipePath).then(() => true).catch(() => false)).toBe(true);
    });
  });

  describe('5.2.2 mlspec new experiment --from X --proposes Y', () => {
    let tmpDir: string;

    beforeEach(async () => {
      tmpDir = path.join(os.tmpdir(), `mlspec-test-${Date.now()}-${Math.random()}`);
      await fs.mkdir(tmpDir, { recursive: true });
      await runMlspec(['init', '--tools', 'none'], tmpDir);
      await runMlspec(['new', 'recipe', 'baseline', '--tag', 'baseline'], tmpDir);
    });

    afterEach(async () => {
      await fs.rm(tmpDir, { recursive: true, force: true });
    });

    it('should create experiment with base_recipe and proposed_recipe', async () => {
      const result = await runMlspec([
        'new', 'experiment', 'test-exp',
        '--from', 'baseline',
        '--proposes', 'test-exp',
      ], tmpDir);
      expect(result.exitCode).toBe(0);

      const expYaml = path.join(tmpDir, 'mlspec', 'experiments', 'test-exp', 'experiment.yaml');
      const content = await fs.readFile(expYaml, 'utf-8');
      expect(content).toContain('base_recipe: baseline');
      expect(content).toContain('proposed_recipe: test-exp');
    });
  });

  describe('5.2.3 mlspec add-evidence --stage smoke', () => {
    let tmpDir: string;

    beforeEach(async () => {
      tmpDir = path.join(os.tmpdir(), `mlspec-test-${Date.now()}-${Math.random()}`);
      await fs.mkdir(tmpDir, { recursive: true });
      await runMlspec(['init', '--tools', 'none'], tmpDir);
      await runMlspec(['new', 'recipe', 'baseline', '--tag', 'baseline'], tmpDir);
      await runMlspec([
        'new', 'experiment', 'test-exp',
        '--from', 'baseline',
        '--proposes', 'test-exp',
      ], tmpDir);
    });

    afterEach(async () => {
      await fs.rm(tmpDir, { recursive: true, force: true });
    });

    it('should create evidence file in evidence/ subdirectory', async () => {
      const result = await runMlspec([
        'add-evidence', 'test-exp', '--stage', 'smoke',
      ], tmpDir);
      expect(result.exitCode).toBe(0);

      const evidencePath = path.join(tmpDir, 'mlspec', 'experiments', 'test-exp', 'evidence', 'smoke.md');
      expect(await fs.stat(evidencePath).then(() => true).catch(() => false)).toBe(true);
    });
  });

  describe('5.2.4 mlspec accept creates recipe node', () => {
    let tmpDir: string;

    beforeEach(async () => {
      tmpDir = path.join(os.tmpdir(), `mlspec-test-${Date.now()}-${Math.random()}`);
      await fs.mkdir(tmpDir, { recursive: true });
      await runMlspec(['init', '--tools', 'none'], tmpDir);
      await runMlspec(['new', 'recipe', 'baseline', '--tag', 'baseline'], tmpDir);
      await runMlspec([
        'new', 'experiment', 'test-exp',
        '--from', 'baseline',
        '--proposes', 'test-exp',
      ], tmpDir);
      await runMlspec(['add-evidence', 'test-exp', '--stage', 'smoke'], tmpDir);
    });

    afterEach(async () => {
      await fs.rm(tmpDir, { recursive: true, force: true });
    });

    it('should create recipe when accepting', async () => {
      const result = await runMlspec(['accept', 'test-exp', '--as', 'new-recipe'], tmpDir);
      expect(result.exitCode).toBe(0);

      const recipePath = path.join(tmpDir, 'mlspec', 'recipes', 'new-recipe');
      expect(await fs.stat(recipePath).then(() => true).catch(() => false)).toBe(true);
    });
  });

  describe('5.2.5 mlspec graph shows recipe-experiment graph', () => {
    let tmpDir: string;

    beforeEach(async () => {
      tmpDir = path.join(os.tmpdir(), `mlspec-test-${Date.now()}-${Math.random()}`);
      await fs.mkdir(tmpDir, { recursive: true });
      await runMlspec(['init', '--tools', 'none'], tmpDir);
      await runMlspec(['new', 'recipe', 'baseline', '--tag', 'baseline'], tmpDir);
      await runMlspec([
        'new', 'experiment', 'test-exp',
        '--from', 'baseline',
        '--proposes', 'test-exp',
      ], tmpDir);
    });

    afterEach(async () => {
      await fs.rm(tmpDir, { recursive: true, force: true });
    });

    it('should show graph output', async () => {
      const result = await runMlspec(['graph'], tmpDir);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Recipes');
    });
  });

  describe('5.2.6 mlspec next outputs recommendation', () => {
    let tmpDir: string;

    beforeEach(async () => {
      tmpDir = path.join(os.tmpdir(), `mlspec-test-${Date.now()}-${Math.random()}`);
      await fs.mkdir(tmpDir, { recursive: true });
      await runMlspec(['init', '--tools', 'none'], tmpDir);
      await runMlspec(['new', 'recipe', 'baseline', '--tag', 'baseline'], tmpDir);
      await runMlspec([
        'new', 'experiment', 'test-exp',
        '--from', 'baseline',
        '--proposes', 'test-exp',
      ], tmpDir);
    });

    afterEach(async () => {
      await fs.rm(tmpDir, { recursive: true, force: true });
    });

    it('should output next recommended action', async () => {
      const result = await runMlspec(['next'], tmpDir);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Next');
    });
  });

  describe('5.1.6 parent chain traversal', () => {
    let tmpDir: string;

    beforeEach(async () => {
      tmpDir = path.join(os.tmpdir(), `mlspec-test-${Date.now()}-${Math.random()}`);
      await fs.mkdir(tmpDir, { recursive: true });
      await runMlspec(['init', '--tools', 'none'], tmpDir);
    });

    afterEach(async () => {
      await fs.rm(tmpDir, { recursive: true, force: true });
    });

    it('should traverse parent chain correctly', async () => {
      await runMlspec(['new', 'recipe', 'baseline', '--tag', 'baseline'], tmpDir);
      await runMlspec([
        'new', 'experiment', 'exp1',
        '--from', 'baseline',
        '--proposes', 'v1',
      ], tmpDir);
      await runMlspec(['add-evidence', 'exp1', '--stage', 'final'], tmpDir);
      await runMlspec(['accept', 'exp1', '--as', 'v1'], tmpDir);

      const result = await runMlspec(['lineage', 'v1'], tmpDir);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('baseline');
    });
  });

  describe('5.1.7 cycle detection', () => {
    let tmpDir: string;

    beforeEach(async () => {
      tmpDir = path.join(os.tmpdir(), `mlspec-test-${Date.now()}-${Math.random()}`);
      await fs.mkdir(tmpDir, { recursive: true });
      await runMlspec(['init', '--tools', 'none'], tmpDir);
    });

    afterEach(async () => {
      await fs.rm(tmpDir, { recursive: true, force: true });
    });

    it('should warn and reject cycle creation', async () => {
      // Create: baseline -> exp1 -> v1 -> exp2 -> v2
      await runMlspec(['new', 'recipe', 'baseline', '--tag', 'baseline'], tmpDir);
      await runMlspec(['new', 'experiment', 'exp1', '--from', 'baseline', '--proposes', 'v1'], tmpDir);
      await runMlspec(['add-evidence', 'exp1', '--stage', 'final'], tmpDir);
      await runMlspec(['accept', 'exp1', '--as', 'v1', '--tag', 'variant'], tmpDir);

      await runMlspec(['new', 'experiment', 'exp2', '--from', 'v1', '--proposes', 'v2'], tmpDir);
      await runMlspec(['add-evidence', 'exp2', '--stage', 'final'], tmpDir);
      await runMlspec(['accept', 'exp2', '--as', 'v2', '--tag', 'variant'], tmpDir);

      // Attempt to create experiment with cycle: v2 -> baseline (would create baseline -> v1 -> v2 -> baseline)
      const result = await runMlspec(
        ['new', 'experiment', 'exp3', '--from', 'v2', '--proposes', 'baseline'],
        tmpDir
      );

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toMatch(/cycle.*detected/i);
    });
  });

  describe('5.2.7 acceptance warning matrix', () => {
    let tmpDir: string;

    beforeEach(async () => {
      tmpDir = path.join(os.tmpdir(), `mlspec-test-${Date.now()}-${Math.random()}`);
      await fs.mkdir(tmpDir, { recursive: true });
      await runMlspec(['init', '--tools', 'none'], tmpDir);
      await runMlspec(['new', 'recipe', 'baseline', '--tag', 'baseline'], tmpDir);
    });

    afterEach(async () => {
      await fs.rm(tmpDir, { recursive: true, force: true });
    });

    it('should warn when evidence stages are missing', async () => {
      // Create experiment with only smoke evidence
      await runMlspec(['new', 'experiment', 'exp1', '--from', 'baseline', '--proposes', 'v1'], tmpDir);
      await runMlspec(['add-evidence', 'exp1', '--stage', 'smoke'], tmpDir);

      const result = await runMlspec(['accept', 'exp1', '--as', 'v1', '--tag', 'variant'], tmpDir);

      expect(result.exitCode).toBe(0); // acceptance still succeeds
      expect(result.stdout).toMatch(/evidence gaps.*missing/i);
    });
  });
});
