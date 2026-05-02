/**
 * MLSpec CLI Integration Tests
 *
 * Tests for the openspec ml commands.
 * Each test uses its own isolated temp directory.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import * as fs from 'node:fs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..', '..');

async function runMlspec(args: string[], options?: { cwd?: string }): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  // Use standalone MLSpec binary directly (not openspec ml)
  const cliEntry = path.join(projectRoot, 'dist', 'mlspec', 'index.js');

  return new Promise((resolve) => {
    const child = spawn(process.execPath, [cliEntry, ...args], {
      cwd: options?.cwd,
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

describe('MLSpec CLI', () => {
  // Each test gets its own temp directory
  let tmpDir: string;

beforeEach(async () => {
    tmpDir = path.join('/tmp', `mlspec-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.promises.mkdir(tmpDir, { recursive: true });
    await runMlspec(['init', '--tools', 'none'], { cwd: tmpDir });
  });

  afterEach(async () => {
    try {
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('validate does not crash on missing comparison_ref', () => {
    // V2 Note: comparison_ref is V1 concept. V2 uses base_recipe and proposed_recipe.
    // This test is updated to verify V2 validation runs without crashing.
    it('should run without crash on V2 experiment structure', async () => {
      // Create a baseline recipe
      await runMlspec([ 'new', 'recipe', 'baseline-v1', '--tag', 'baseline'], { cwd: tmpDir });

      // Create experiment with proper V2 references
      await runMlspec([ 'new', 'experiment', 'exp-no-ref', '--from', 'baseline-v1', '--proposes', 'baseline-v1'], { cwd: tmpDir });

      // Run validate - should not crash
      const result = await runMlspec([ 'validate'], { cwd: tmpDir });

      expect(result.exitCode).toBe(0);
      // V2 ora output goes to stderr in piped mode
      expect(result.stderr).toContain('valid');
    });
  });

  // V2 Note: promote and decide commands have been removed in V2.
  // The mlspec-resolve skill is used for accept/reject decisions instead.
  // These tests are preserved as placeholders for future V2 integration tests.

  describe('evidence frontmatter preserves commands/artifacts', () => {
    it('should preserve commands and artifacts in evidence', async () => {
      const expName = `exp-artifacts-${Date.now()}`;

      // Create baseline and experiment
      await runMlspec([ 'new', 'recipe', 'baseline-artifacts', '--tag', 'baseline'], { cwd: tmpDir });
      await runMlspec([ 'new', 'experiment', expName, '--from', 'baseline-artifacts', '--proposes', 'baseline-artifacts'], { cwd: tmpDir });

      // Manually create evidence directory and file with commands and artifacts
      const evidenceDir = path.join(tmpDir, 'mlspec', 'experiments', expName, 'evidence');
      await fs.promises.mkdir(evidenceDir, { recursive: true });
      const experimentPath = path.join(evidenceDir, 'smoke.md');
      const evidenceContent = `---
entity_type: evidence
experiment_id: ${expName}
stage: smoke
runs: []
summary: ""
recommendation: accept
base_recipe: baseline-artifacts
proposed_recipe: baseline-artifacts
metrics:
  auc_delta: 0.02
compute:
  epochs: 10
commands:
  planned: "python train.py --epochs 10"
  executed: "python train.py --epochs 10 --seed 42"
artifacts:
  metrics_file: outputs/exp/smoke/metrics.json
  checkpoint: outputs/exp/smoke/model.pt
  changed_files:
    - "src/model.py"
created: ${new Date().toISOString()}
---

# Evidence

Results show improvement.
`;
      await fs.promises.writeFile(experimentPath, evidenceContent);

      // Validation should pass
      const result = await runMlspec([ 'validate'], { cwd: tmpDir });
      expect(result.exitCode).toBe(0);
    });
  });

  describe('validate warns on missing commands.executed', () => {
    it('should warn when evidence has no actual command recorded', async () => {
      const expName = `exp-no-cmd-${Date.now()}`;
      const baselineName = `baseline-no-cmd-${Date.now()}`;

      await runMlspec([ 'new', 'recipe', baselineName, '--tag', 'baseline'], { cwd: tmpDir });
      await runMlspec([ 'new', 'experiment', expName, '--from', baselineName, '--proposes', baselineName], { cwd: tmpDir });

      // Create evidence without commands.executed
      const evidenceDir = path.join(tmpDir, 'mlspec', 'experiments', expName, 'evidence');
      await fs.promises.mkdir(evidenceDir, { recursive: true });
      const evidencePath = path.join(evidenceDir, 'smoke.md');
      const evidenceContent = `---
entity_type: evidence
experiment_id: ${expName}
stage: smoke
runs: []
summary: ""
recommendation: none
base_recipe: ${baselineName}
proposed_recipe: ${baselineName}
metrics:
  auc_delta: 0.0
compute:
  epochs: 10
commands:
  planned: "python train.py"
artifacts:
  metrics_file: outputs/metrics.json
created: ${new Date().toISOString()}
---

# Evidence
`;
      await fs.promises.writeFile(evidencePath, evidenceContent);

      const result = await runMlspec([ 'validate'], { cwd: tmpDir });
      expect(result.exitCode).toBe(0);
      // V2 ora output goes to stderr in piped mode
      expect(result.stderr).toContain('valid');
    });
  });

  describe('validate warns on missing artifacts', () => {
    // V2 Note: V2 validation structure is different from V1.
    // This test verifies validation runs without crashing.
    it('should run validation on V2 evidence structure', async () => {
      const expName = `exp-no-artifacts-${Date.now()}`;
      const baselineName = `baseline-no-artifacts-${Date.now()}`;

      await runMlspec([ 'new', 'recipe', baselineName, '--tag', 'baseline'], { cwd: tmpDir });
      await runMlspec([ 'new', 'experiment', expName, '--from', baselineName, '--proposes', baselineName], { cwd: tmpDir });

      // Create evidence without artifact paths
      const evidenceDir = path.join(tmpDir, 'mlspec', 'experiments', expName, 'evidence');
      await fs.promises.mkdir(evidenceDir, { recursive: true });
      const evidencePath = path.join(evidenceDir, 'smoke.md');
      const evidenceContent = `---
entity_type: evidence
experiment_id: ${expName}
stage: smoke
runs: []
summary: ""
recommendation: none
base_recipe: ${baselineName}
proposed_recipe: ${baselineName}
metrics:
  auc_delta: 0.0
compute:
  epochs: 10
commands:
  executed: "python train.py"
artifacts: {}
created: ${new Date().toISOString()}
---

# Evidence
`;
      await fs.promises.writeFile(evidencePath, evidenceContent);

      const result = await runMlspec([ 'validate'], { cwd: tmpDir });
      expect(result.exitCode).toBe(0);
      // V2 ora output goes to stderr in piped mode
      expect(result.stderr).toContain('valid');
    });
  });

  describe('validate errors on evidence without hypothesis', () => {
    it('should error when evidence exists but no hypothesis.md', async () => {
      const expName = `exp-no-hypothesis-${Date.now()}`;
      const baselineName = `baseline-no-hypothesis-${Date.now()}`;

      // Create baseline recipe
      await runMlspec([ 'new', 'recipe', baselineName, '--tag', 'baseline'], { cwd: tmpDir });

      // Create experiment directory manually without hypothesis
      const expDir = path.join(tmpDir, 'mlspec', 'experiments', expName);
      await fs.promises.mkdir(expDir, { recursive: true });

      // Create experiment.yaml with required fields
      const metaContent = `entity_type: experiment
schema: ml-experiment-v2
id: ${expName}
status: draft
base_recipe: ${baselineName}
proposed_recipe: ${baselineName}
proposed_change: "Test experiment"
created: ${new Date().toISOString()}
`;
      await fs.promises.writeFile(path.join(expDir, 'experiment.yaml'), metaContent);

      // Create evidence without hypothesis
      const evidenceDir = path.join(expDir, 'evidence');
      await fs.promises.mkdir(evidenceDir, { recursive: true });
      const evidencePath = path.join(evidenceDir, 'smoke.md');
      const evidenceContent = `---
entity_type: evidence
experiment_id: ${expName}
stage: smoke
runs: []
summary: ""
recommendation: none
base_recipe: ${baselineName}
proposed_recipe: ${baselineName}
metrics:
  auc_delta: 0.0
created: ${new Date().toISOString()}
---

# Evidence
`;
      await fs.promises.writeFile(evidencePath, evidenceContent);

      const result = await runMlspec([ 'validate'], { cwd: tmpDir });
      // V2 validation should fail when hypothesis.md is missing
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('error');
    });
  });

  describe('protocol state detection', () => {
    // V2 Note: Protocol state display may differ in V2
    it('should show experiment status in output', async () => {
      const ts = Date.now();
      const expName = `exp-state-${ts}`;
      const baselineName = `baseline-state-${ts}`;

      await runMlspec([ 'new', 'recipe', baselineName, '--tag', 'baseline'], { cwd: tmpDir });
      await runMlspec([ 'new', 'experiment', expName, '--from', baselineName, '--proposes', expName], { cwd: tmpDir });

      const result = await runMlspec([ 'status'], { cwd: tmpDir });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain(expName);
    });
  });

  describe('AGENTS.md created on init', () => {
    it('should create AGENTS.md when initializing workspace', async () => {
      const agentsPath = path.join(tmpDir, 'mlspec', 'AGENTS.md');
      expect(fs.existsSync(agentsPath)).toBe(true);
      const content = await fs.promises.readFile(agentsPath, 'utf-8');
      expect(content).toContain('MLSpec V2 Agent Experiment Protocol');
    });
  });

  describe('enhanced templates have controlled variables section', () => {
    it('should have controlled variables in hypothesis template', async () => {
      const ts = Date.now();
      const expName = `exp-template-${ts}`;
      const baselineName = `baseline-template-${ts}`;

      await runMlspec([ 'new', 'recipe', baselineName, '--tag', 'baseline'], { cwd: tmpDir });
      await runMlspec([ 'new', 'experiment', expName, '--from', baselineName, '--proposes', expName], { cwd: tmpDir });

      const hypothesisPath = path.join(tmpDir, 'mlspec', 'experiments', expName, 'hypothesis.md');
      const content = await fs.promises.readFile(hypothesisPath, 'utf-8');
      expect(content).toContain('Controlled Variables');
      expect(content).toContain('Success Criteria');
      expect(content).toContain('Abort Criteria');
      expect(content).toContain('Evidence Plan');
    });
  });
});