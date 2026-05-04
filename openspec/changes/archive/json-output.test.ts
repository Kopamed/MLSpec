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

function parseJson(str: string): unknown {
  return JSON.parse(str);
}

describe('MLSpec JSON Output', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `mlspec-json-test-${Date.now()}-${Math.random()}`);
    await fs.mkdir(path.join(tmpDir, 'mlspec'), { recursive: true });
    await fs.mkdir(path.join(tmpDir, 'mlspec', 'recipes'), { recursive: true });
    await fs.mkdir(path.join(tmpDir, 'mlspec', 'experiments'), { recursive: true });
    await fs.writeFile(path.join(tmpDir, 'mlspec', '.workspace.yaml'), 'workspace_version: 2\n');
    await fs.writeFile(path.join(tmpDir, 'mlspec', 'evaluation.md'), '# Evaluation\n');
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('mlspec next --json', () => {
    it('should output valid JSON with workspace_state and actions', async () => {
      const result = await runMlspec(['next', '--json'], tmpDir);
      expect(result.exitCode).toBe(0);

      const json = parseJson(result.stdout) as Record<string, unknown>;
      expect(json).toHaveProperty('workspace_state');
      expect(json).toHaveProperty('actions');
      expect(Array.isArray(json.actions)).toBe(true);

      const workspaceState = json.workspace_state as Record<string, unknown>;
      expect(workspaceState).toHaveProperty('recipes_count');
      expect(workspaceState).toHaveProperty('experiments_count');
      expect(workspaceState).toHaveProperty('current_best_recipes');
      expect(workspaceState).toHaveProperty('current_best_recipe');
    });

    it('should return bootstrap action in empty workspace (no recipes)', async () => {
      const result = await runMlspec(['next', '--json'], tmpDir);
      expect(result.exitCode).toBe(0);

      const json = parseJson(result.stdout) as {
        actions: Array<{ action_type: string }>;
        workspace_state: { recipes_count: number };
      };
      // Empty workspace should have bootstrap action
      expect(json.workspace_state.recipes_count).toBe(0);
      expect(json.actions.length).toBeGreaterThan(0);
      expect(json.actions[0].action_type).toBe('bootstrap');
    });

    it('should include bootstrap action in empty workspace', async () => {
      const result = await runMlspec(['next', '--json'], tmpDir);
      expect(result.exitCode).toBe(0);

      const json = parseJson(result.stdout) as {
        actions: Array<{ action_type: string; suggested_command: string }>;
        workspace_state: { recipes_count: number };
      };
      expect(json.workspace_state.recipes_count).toBe(0);
      expect(json.actions.length).toBeGreaterThan(0);
      const bootstrapAction = json.actions.find(a => a.action_type === 'bootstrap');
      expect(bootstrapAction).toBeDefined();
    });

    it('should return error JSON when workspace not found', async () => {
      // Use a valid directory that is not an MLSpec workspace
      const result = await runMlspec(['next', '--json'], '/tmp');
      expect(result.exitCode).toBe(1);

      const json = parseJson(result.stdout) as { error: string };
      expect(json).toHaveProperty('error');
    });

    it('should have actions sorted by ascending priority', async () => {
      // Create a recipe and experiment
      await fs.mkdir(path.join(tmpDir, 'mlspec', 'recipes', 'baseline'), { recursive: true });
      await fs.writeFile(path.join(tmpDir, 'mlspec', 'recipes', 'baseline', 'recipe.yaml'),
        'entity_type: recipe\nschema: ml-experiment-v2\nid: baseline\nname: Baseline\ntags:\n  - baseline\n  - current-best\ncreated: "2024-01-01T00:00:00Z"\n');

      await fs.mkdir(path.join(tmpDir, 'mlspec', 'experiments', 'test-exp'), { recursive: true });
      await fs.writeFile(path.join(tmpDir, 'mlspec', 'experiments', 'test-exp', 'experiment.yaml'),
        'entity_type: experiment\nschema: ml-experiment-v2\nid: test-exp\nstatus: draft\nbase_recipe: baseline\nproposed_recipe: test-exp-v1\nproposed_change: Test change\ncreated: "2024-01-01T00:00:00Z"\n');

      const result = await runMlspec(['next', '--json'], tmpDir);
      expect(result.exitCode).toBe(0);

      const json = parseJson(result.stdout) as { actions: Array<{ priority: number }> };
      const priorities = json.actions.map(a => a.priority);
      expect(priorities).toEqual([...priorities].sort((a, b) => a - b));
    });

    it('should have valid action_type values', async () => {
      const result = await runMlspec(['next', '--json'], tmpDir);
      expect(result.exitCode).toBe(0);

      const json = parseJson(result.stdout) as { actions: Array<{ action_type: string }> };
      const validTypes = ['explore', 'propose', 'run', 'resolve', 'bootstrap', 'none'];
      for (const action of json.actions) {
        expect(validTypes).toContain(action.action_type);
      }
    });
  });

  describe('mlspec status --json', () => {
    it('should output valid JSON with recipes and experiments', async () => {
      const result = await runMlspec(['status', '--json'], tmpDir);
      expect(result.exitCode).toBe(0);

      const json = parseJson(result.stdout) as Record<string, unknown>;
      expect(json).toHaveProperty('recipes');
      expect(json).toHaveProperty('experiments');
      expect(json).toHaveProperty('current_best_recipes');
      expect(json).toHaveProperty('current_best_recipe');
    });

    it('should include recipes array with id, tags, has_metrics', async () => {
      const result = await runMlspec(['status', '--json'], tmpDir);
      expect(result.exitCode).toBe(0);

      const json = parseJson(result.stdout) as { recipes: Array<Record<string, unknown>> };
      expect(Array.isArray(json.recipes)).toBe(true);
    });

    it('should have experiments with total and by_status', async () => {
      const result = await runMlspec(['status', '--json'], tmpDir);
      expect(result.exitCode).toBe(0);

      const json = parseJson(result.stdout) as {
        experiments: {
          total: number;
          by_status: { draft: string[]; running: string[]; resolved: string[] };
        };
      };
      expect(json.experiments).toHaveProperty('total');
      expect(json.experiments).toHaveProperty('by_status');
      expect(json.experiments.by_status).toHaveProperty('draft');
      expect(json.experiments.by_status).toHaveProperty('running');
      expect(json.experiments.by_status).toHaveProperty('resolved');
    });

    it('should output human-readable when --json is omitted (backward compatibility)', async () => {
      const result = await runMlspec(['status'], tmpDir);
      expect(result.exitCode).toBe(0);
      // Human-readable output should contain markdown formatting
      expect(result.stdout).toContain('# MLSpec Status');
    });
  });

  // V2 tests - skipped for V3 clean break
  describe.skip('mlspec status --experiment <id> --json (V2)', () => {
    it('should output valid JSON for existing experiment', async () => {
      // Create experiment
      await fs.mkdir(path.join(tmpDir, 'mlspec', 'experiments', 'test-exp'), { recursive: true });
      await fs.writeFile(path.join(tmpDir, 'mlspec', 'experiments', 'test-exp', 'experiment.yaml'),
        'entity_type: experiment\nschema: ml-experiment-v2\nid: test-exp\nstatus: running\nbase_recipe: baseline\nproposed_recipe: test-exp-v1\nproposed_change: Test change\ncreated: "2024-01-01T00:00:00Z"\n');

      const result = await runMlspec(['status', '--experiment', 'test-exp', '--json'], tmpDir);
      expect(result.exitCode).toBe(0);

      const json = parseJson(result.stdout) as Record<string, unknown>;
      expect(json).toHaveProperty('experiment_id');
      expect(json).toHaveProperty('status');
      expect(json).toHaveProperty('base_recipe');
      expect(json).toHaveProperty('proposed_recipe');
      expect(json).toHaveProperty('evidence_stages');
      expect(json).toHaveProperty('missing_stages');
      expect(json).toHaveProperty('ready_to_resolve');
    });

    it('should include evidence_stages with smoke, validation, final keys', async () => {
      await fs.mkdir(path.join(tmpDir, 'mlspec', 'experiments', 'test-exp'), { recursive: true });
      await fs.writeFile(path.join(tmpDir, 'mlspec', 'experiments', 'test-exp', 'experiment.yaml'),
        'entity_type: experiment\nschema: ml-experiment-v2\nid: test-exp\nstatus: running\nbase_recipe: baseline\nproposed_recipe: test-exp-v1\nproposed_change: Test change\ncreated: "2024-01-01T00:00:00Z"\n');

      const result = await runMlspec(['status', '--experiment', 'test-exp', '--json'], tmpDir);
      expect(result.exitCode).toBe(0);

      const json = parseJson(result.stdout) as {
        evidence_stages: Record<string, unknown>;
      };
      expect(json.evidence_stages).toHaveProperty('smoke');
      expect(json.evidence_stages).toHaveProperty('validation');
      expect(json.evidence_stages).toHaveProperty('final');
    });

    it('should error with JSON when experiment does not exist', async () => {
      const result = await runMlspec(['status', '--experiment', 'nonexistent', '--json'], tmpDir);
      expect(result.exitCode).toBe(1);

      const json = parseJson(result.stdout) as { error: string; experiment_id: string };
      expect(json).toHaveProperty('error');
      expect(json.experiment_id).toBe('nonexistent');
    });

    it('should error when --json is omitted', async () => {
      await fs.mkdir(path.join(tmpDir, 'mlspec', 'experiments', 'test-exp'), { recursive: true });
      await fs.writeFile(path.join(tmpDir, 'mlspec', 'experiments', 'test-exp', 'experiment.yaml'),
        'entity_type: experiment\nschema: ml-experiment-v2\nid: test-exp\nstatus: running\nbase_recipe: baseline\nproposed_recipe: test-exp-v1\nproposed_change: Test change\ncreated: "2024-01-01T00:00:00Z"\n');

      const result = await runMlspec(['status', '--experiment', 'test-exp'], tmpDir);
      expect(result.exitCode).toBe(1);

      const json = parseJson(result.stdout) as { error: string };
      expect(json).toHaveProperty('error');
    });
  });

  describe('mlspec show recipe <id> --json', () => {
    it('should output valid JSON for existing recipe', async () => {
      await fs.mkdir(path.join(tmpDir, 'mlspec', 'recipes', 'baseline'), { recursive: true });
      await fs.writeFile(path.join(tmpDir, 'mlspec', 'recipes', 'baseline', 'recipe.yaml'),
        'entity_type: recipe\nschema: ml-experiment-v2\nid: baseline\nname: Baseline\ntags:\n  - baseline\n  - current-best\ncreated: "2024-01-01T00:00:00Z"\n');

      const result = await runMlspec(['show', 'recipe', 'baseline', '--json'], tmpDir);
      expect(result.exitCode).toBe(0);

      const json = parseJson(result.stdout) as Record<string, unknown>;
      expect(json).toHaveProperty('id');
      expect(json).toHaveProperty('name');
      expect(json).toHaveProperty('tags');
      expect(json).toHaveProperty('parent_recipe');
      expect(json).toHaveProperty('created');
    });

    it('should error with JSON when recipe does not exist', async () => {
      const result = await runMlspec(['show', 'recipe', 'nonexistent', '--json'], tmpDir);
      expect(result.exitCode).toBe(1);

      const json = parseJson(result.stdout) as { error: string };
      expect(json).toHaveProperty('error');
    });

    it('should output human-readable when --json is omitted (backward compatibility)', async () => {
      await fs.mkdir(path.join(tmpDir, 'mlspec', 'recipes', 'baseline'), { recursive: true });
      await fs.writeFile(path.join(tmpDir, 'mlspec', 'recipes', 'baseline', 'recipe.yaml'),
        'entity_type: recipe\nschema: ml-experiment-v2\nid: baseline\nname: Baseline\ntags:\n  - baseline\ncreated: "2024-01-01T00:00:00Z"\n');

      const result = await runMlspec(['show', 'recipe', 'baseline'], tmpDir);
      expect(result.exitCode).toBe(0);
      // Human-readable output should contain markdown formatting
      expect(result.stdout).toContain('# Recipe: baseline');
    });
  });

  // V2 tests - skipped for V3 clean break
  describe.skip('mlspec show evidence <experiment> --json (V2)', () => {
    it('should output valid JSON with stages object', async () => {
      await fs.mkdir(path.join(tmpDir, 'mlspec', 'experiments', 'test-exp'), { recursive: true });
      await fs.writeFile(path.join(tmpDir, 'mlspec', 'experiments', 'test-exp', 'experiment.yaml'),
        'entity_type: experiment\nschema: ml-experiment-v2\nid: test-exp\nstatus: running\nbase_recipe: baseline\nproposed_recipe: test-exp-v1\nproposed_change: Test change\ncreated: "2024-01-01T00:00:00Z"\n');

      const result = await runMlspec(['show', 'evidence', 'test-exp', '--json'], tmpDir);
      expect(result.exitCode).toBe(0);

      const json = parseJson(result.stdout) as Record<string, unknown>;
      expect(json).toHaveProperty('experiment_id');
      expect(json).toHaveProperty('stages');
    });

    it('should always include smoke, validation, final keys', async () => {
      await fs.mkdir(path.join(tmpDir, 'mlspec', 'experiments', 'test-exp'), { recursive: true });
      await fs.writeFile(path.join(tmpDir, 'mlspec', 'experiments', 'test-exp', 'experiment.yaml'),
        'entity_type: experiment\nschema: ml-experiment-v2\nid: test-exp\nstatus: running\nbase_recipe: baseline\nproposed_recipe: test-exp-v1\nproposed_change: Test change\ncreated: "2024-01-01T00:00:00Z"\n');

      const result = await runMlspec(['show', 'evidence', 'test-exp', '--json'], tmpDir);
      expect(result.exitCode).toBe(0);

      const json = parseJson(result.stdout) as { stages: Record<string, unknown> };
      expect(json.stages).toHaveProperty('smoke');
      expect(json.stages).toHaveProperty('validation');
      expect(json.stages).toHaveProperty('final');
    });

    it('should have exists: false for missing stages', async () => {
      await fs.mkdir(path.join(tmpDir, 'mlspec', 'experiments', 'test-exp'), { recursive: true });
      await fs.writeFile(path.join(tmpDir, 'mlspec', 'experiments', 'test-exp', 'experiment.yaml'),
        'entity_type: experiment\nschema: ml-experiment-v2\nid: test-exp\nstatus: running\nbase_recipe: baseline\nproposed_recipe: test-exp-v1\nproposed_change: Test change\ncreated: "2024-01-01T00:00:00Z"\n');

      const result = await runMlspec(['show', 'evidence', 'test-exp', '--json'], tmpDir);
      expect(result.exitCode).toBe(0);

      const json = parseJson(result.stdout) as {
        stages: {
          smoke: { exists: boolean; runs: unknown[] | null; aggregate: unknown | null; summary: string | null; recommendation: string | null };
          validation: { exists: boolean };
          final: { exists: boolean };
        };
      };
      expect(json.stages.smoke.exists).toBe(false);
      expect(json.stages.smoke.runs).toBe(null);
      expect(json.stages.smoke.aggregate).toBe(null);
      expect(json.stages.smoke.summary).toBe(null);
      expect(json.stages.smoke.recommendation).toBe(null);
      expect(json.stages.validation.exists).toBe(false);
      expect(json.stages.final.exists).toBe(false);
    });

    it('should have exists: true and populated fields when evidence exists', async () => {
      await fs.mkdir(path.join(tmpDir, 'mlspec', 'experiments', 'test-exp'), { recursive: true });
      await fs.mkdir(path.join(tmpDir, 'mlspec', 'experiments', 'test-exp', 'evidence'), { recursive: true });
      await fs.writeFile(path.join(tmpDir, 'mlspec', 'experiments', 'test-exp', 'experiment.yaml'),
        'entity_type: experiment\nschema: ml-experiment-v2\nid: test-exp\nstatus: running\nbase_recipe: baseline\nproposed_recipe: test-exp-v1\nproposed_change: Test change\ncreated: "2024-01-01T00:00:00Z"\n');
      await fs.writeFile(path.join(tmpDir, 'mlspec', 'experiments', 'test-exp', 'evidence', 'smoke.md'),
        '---\nentity_type: evidence\nexperiment_id: test-exp\nstage: smoke\nruns:\n  - seed: 42\n    command: python train.py\n    completed: "2024-01-01T00:00:00Z"\n    metrics:\n      accuracy: 0.945\nrecommendation: accept\ncreated: "2024-01-01T00:00:00Z"\n---\n');

      const result = await runMlspec(['show', 'evidence', 'test-exp', '--json'], tmpDir);
      expect(result.exitCode).toBe(0);

      const json = parseJson(result.stdout) as {
        stages: {
          smoke: { exists: boolean; runs: unknown[] | null; recommendation: string | null };
        };
      };
      expect(json.stages.smoke.exists).toBe(true);
      expect(json.stages.smoke.runs).not.toBe(null);
      expect(json.stages.smoke.recommendation).toBe('accept');
    });

    it('should output human-readable when --json is omitted (backward compatibility)', async () => {
      await fs.mkdir(path.join(tmpDir, 'mlspec', 'experiments', 'test-exp'), { recursive: true });
      await fs.writeFile(path.join(tmpDir, 'mlspec', 'experiments', 'test-exp', 'experiment.yaml'),
        'entity_type: experiment\nschema: ml-experiment-v2\nid: test-exp\nstatus: running\nbase_recipe: baseline\nproposed_recipe: test-exp-v1\nproposed_change: Test change\ncreated: "2024-01-01T00:00:00Z"\n');

      const result = await runMlspec(['show', 'evidence', 'test-exp'], tmpDir);
      expect(result.exitCode).toBe(0);
      // Human-readable output should contain markdown formatting
      expect(result.stdout).toContain('# Evidence:');
    });

    it('should error with JSON when experiment does not exist', async () => {
      const result = await runMlspec(['show', 'evidence', 'nonexistent', '--json'], tmpDir);
      expect(result.exitCode).toBe(1);

      const json = parseJson(result.stdout) as { error: string; experiment_id: string };
      expect(json).toHaveProperty('error');
      expect(json.experiment_id).toBe('nonexistent');
    });
  });

  describe('JSON format conventions', () => {
    it('should output pretty-printed JSON with 2-space indent', async () => {
      const result = await runMlspec(['next', '--json'], tmpDir);
      expect(result.exitCode).toBe(0);

      // Check for 2-space indentation (lines should start with 2 spaces for nested objects)
      const lines = result.stdout.split('\n');
      const hasTwoSpaceIndent = lines.some(line => line.match(/^  "[^"]+":/));
      expect(hasTwoSpaceIndent || result.stdout.includes('{\n  "')).toBe(true);
    });

    it('should output clean stdout in JSON mode (no extra logs)', async () => {
      const result = await runMlspec(['next', '--json'], tmpDir);
      expect(result.exitCode).toBe(0);

      // stdout should be valid JSON starting with {
      expect(result.stdout.trim().startsWith('{')).toBe(true);
    });

    it('should parse as valid JSON', async () => {
      const result = await runMlspec(['next', '--json'], tmpDir);
      expect(result.exitCode).toBe(0);

      expect(() => parseJson(result.stdout)).not.toThrow();
    });
  });

  // V2 tests - skipped for V3 clean break
  describe.skip('ready_to_resolve computation (V2)', () => {
    it('should be true when experiment is not resolved and has recommendation', async () => {
      await fs.mkdir(path.join(tmpDir, 'mlspec', 'experiments', 'test-exp'), { recursive: true });
      await fs.mkdir(path.join(tmpDir, 'mlspec', 'experiments', 'test-exp', 'evidence'), { recursive: true });
      await fs.writeFile(path.join(tmpDir, 'mlspec', 'experiments', 'test-exp', 'experiment.yaml'),
        'entity_type: experiment\nschema: ml-experiment-v2\nid: test-exp\nstatus: running\nbase_recipe: baseline\nproposed_recipe: test-exp-v1\nproposed_change: Test change\ncreated: "2024-01-01T00:00:00Z"\n');
      await fs.writeFile(path.join(tmpDir, 'mlspec', 'experiments', 'test-exp', 'evidence', 'smoke.md'),
        '---\nentity_type: evidence\nexperiment_id: test-exp\nstage: smoke\nruns:\n  - seed: 42\n    command: python train.py\n    completed: "2024-01-01T00:00:00Z"\n    metrics:\n      accuracy: 0.945\nrecommendation: accept\ncreated: "2024-01-01T00:00:00Z"\n---\n');

      const result = await runMlspec(['status', '--experiment', 'test-exp', '--json'], tmpDir);
      expect(result.exitCode).toBe(0);

      const json = parseJson(result.stdout) as { ready_to_resolve: boolean; has_recommendation: boolean };
      expect(json.ready_to_resolve).toBe(true);
      expect(json.has_recommendation).toBe(true);
    });

    it('should be false when experiment is already resolved', async () => {
      await fs.mkdir(path.join(tmpDir, 'mlspec', 'experiments', 'test-exp'), { recursive: true });
      await fs.mkdir(path.join(tmpDir, 'mlspec', 'experiments', 'test-exp', 'evidence'), { recursive: true });
      await fs.writeFile(path.join(tmpDir, 'mlspec', 'experiments', 'test-exp', 'experiment.yaml'),
        'entity_type: experiment\nschema: ml-experiment-v2\nid: test-exp\nstatus: resolved\nbase_recipe: baseline\nproposed_recipe: test-exp-v1\nproposed_change: Test change\ncreated: "2024-01-01T00:00:00Z"\n');
      await fs.writeFile(path.join(tmpDir, 'mlspec', 'experiments', 'test-exp', 'evidence', 'smoke.md'),
        '---\nentity_type: evidence\nexperiment_id: test-exp\nstage: smoke\nruns:\n  - seed: 42\n    command: python train.py\n    completed: "2024-01-01T00:00:00Z"\n    metrics:\n      accuracy: 0.945\nrecommendation: accept\ncreated: "2024-01-01T00:00:00Z"\n---\n');

      const result = await runMlspec(['status', '--experiment', 'test-exp', '--json'], tmpDir);
      expect(result.exitCode).toBe(0);

      const json = parseJson(result.stdout) as { ready_to_resolve: boolean };
      expect(json.ready_to_resolve).toBe(false);
    });
  });
});
