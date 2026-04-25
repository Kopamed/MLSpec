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
  const cliEntry = path.join(projectRoot, 'dist', 'index.js');

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
    await runMlspec(['ml', 'init'], { cwd: tmpDir });
  });

  afterEach(async () => {
    try {
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('validate does not crash on missing comparison_ref', () => {
    it('should warn but not crash when experiment has no comparison_ref', async () => {
      // Create a baseline
      await runMlspec(['ml', 'new', 'baseline', 'baseline-v1'], { cwd: tmpDir });

      // Create experiment without updating comparison_ref
      await runMlspec(['ml', 'new', 'experiment', 'exp-no-ref'], { cwd: tmpDir });

      // Run validate - should not crash
      const result = await runMlspec(['ml', 'validate'], { cwd: tmpDir });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('warning');
      expect(result.stdout).toContain('missing comparison_ref');
    });
  });

  describe('promote fails without decision.md', () => {
    it('should fail when experiment has no decision.md', async () => {
      // Create a baseline and candidate
      await runMlspec(['ml', 'new', 'baseline', 'baseline-2'], { cwd: tmpDir });
      await runMlspec(['ml', 'new', 'candidate', 'candidate-b'], { cwd: tmpDir });

      // Create experiment with evidence but no decision
      await runMlspec(['ml', 'new', 'experiment', 'exp-no-decision'], { cwd: tmpDir });
      await runMlspec(['ml', 'add-evidence', 'exp-no-decision', '--level', 'E1'], { cwd: tmpDir });

      // Try to promote - should fail
      const result = await runMlspec(['ml', 'promote', 'exp-no-decision', '--to', 'candidate-b'], { cwd: tmpDir });

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('decision.md not found');
    });
  });

  describe('promote fails when decision is not promote', () => {
    it('should fail when decision is reject', async () => {
      // Create baseline and candidate
      await runMlspec(['ml', 'new', 'baseline', 'baseline-3'], { cwd: tmpDir });
      await runMlspec(['ml', 'new', 'candidate', 'candidate-c'], { cwd: tmpDir });

      // Create experiment with reject decision
      await runMlspec(['ml', 'new', 'experiment', 'exp-rejected'], { cwd: tmpDir });
      await runMlspec(['ml', 'add-evidence', 'exp-rejected', '--level', 'E1'], { cwd: tmpDir });
      await runMlspec(['ml', 'decide', 'exp-rejected', '--decision', 'reject'], { cwd: tmpDir });

      // Try to promote - should fail
      const result = await runMlspec(['ml', 'promote', 'exp-rejected', '--to', 'candidate-c'], { cwd: tmpDir });

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain("decision 'reject'");
    });
  });

  describe('promote fails when target_candidate mismatches --to', () => {
    it('should fail when decision target_candidate differs from --to argument', async () => {
      // Create baselines and two candidates
      await runMlspec(['ml', 'new', 'baseline', 'baseline-4'], { cwd: tmpDir });
      await runMlspec(['ml', 'new', 'candidate', 'candidate-d'], { cwd: tmpDir });
      await runMlspec(['ml', 'new', 'candidate', 'candidate-e'], { cwd: tmpDir });

      // Create experiment with promote decision to candidate-d
      await runMlspec(['ml', 'new', 'experiment', 'exp-mismatch'], { cwd: tmpDir });
      await runMlspec(['ml', 'add-evidence', 'exp-mismatch', '--level', 'E1'], { cwd: tmpDir });
      await runMlspec(['ml', 'decide', 'exp-mismatch', '--decision', 'promote', '--target-candidate', 'candidate-d'], { cwd: tmpDir });

      // Try to promote to candidate-e - should fail
      const result = await runMlspec(['ml', 'promote', 'exp-mismatch', '--to', 'candidate-e'], { cwd: tmpDir });

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('target_candidate');
      expect(result.stderr).toContain('candidate-d');
      expect(result.stderr).toContain('candidate-e');
    });
  });

  describe('evidence frontmatter preserves commands/artifacts', () => {
    it('should preserve commands and artifacts in evidence', async () => {
      const expName = `exp-artifacts-${Date.now()}`;

      // Create baseline and experiment
      await runMlspec(['ml', 'new', 'baseline', 'baseline-artifacts'], { cwd: tmpDir });
      await runMlspec(['ml', 'new', 'experiment', expName], { cwd: tmpDir });

      // Manually create evidence directory and file with commands and artifacts
      const evidenceDir = path.join(tmpDir, 'mlspec', 'experiments', expName, 'evidence');
      await fs.promises.mkdir(evidenceDir, { recursive: true });
      const experimentPath = path.join(evidenceDir, 'E1.md');
      const evidenceContent = `---
evidence_level: E1
recommendation: promote
comparison_ref:
  entity_type: baseline
  name: baseline-artifacts
metrics:
  auc_delta: 0.02
compute:
  epochs: 10
commands:
  planned: "python train.py --epochs 10"
  executed: "python train.py --epochs 10 --seed 42"
artifacts:
  metrics_file: outputs/exp/E1/metrics.json
  checkpoint: outputs/exp/E1/model.pt
  changed_files:
    - "src/model.py"
---

# Evidence

Results show improvement.
`;
      await fs.promises.writeFile(experimentPath, evidenceContent);

      // Validation should pass
      const result = await runMlspec(['ml', 'validate'], { cwd: tmpDir });
      expect(result.exitCode).toBe(0);
    });
  });

  describe('validate warns on missing commands.executed', () => {
    it('should warn when evidence has no actual command recorded', async () => {
      const expName = `exp-no-cmd-${Date.now()}`;
      const baselineName = `baseline-no-cmd-${Date.now()}`;

      await runMlspec(['ml', 'new', 'baseline', baselineName], { cwd: tmpDir });
      await runMlspec(['ml', 'new', 'experiment', expName], { cwd: tmpDir });

      // Create evidence without commands.executed
      const evidenceDir = path.join(tmpDir, 'mlspec', 'experiments', expName, 'evidence');
      await fs.promises.mkdir(evidenceDir, { recursive: true });
      const evidencePath = path.join(evidenceDir, 'E1.md');
      const evidenceContent = `---
evidence_level: E1
recommendation: none
comparison_ref:
  entity_type: baseline
  name: ${baselineName}
metrics:
  auc_delta: 0.0
compute:
  epochs: 10
commands:
  planned: "python train.py"
artifacts:
  metrics_file: outputs/metrics.json
---

# Evidence
`;
      await fs.promises.writeFile(evidencePath, evidenceContent);

      const result = await runMlspec(['ml', 'validate'], { cwd: tmpDir });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('actual command');
    });
  });

  describe('validate warns on missing artifacts', () => {
    it('should warn when evidence has no artifact paths', async () => {
      const expName = `exp-no-artifacts-${Date.now()}`;
      const baselineName = `baseline-no-artifacts-${Date.now()}`;

      await runMlspec(['ml', 'new', 'baseline', baselineName], { cwd: tmpDir });
      await runMlspec(['ml', 'new', 'experiment', expName], { cwd: tmpDir });

      // Create evidence without artifact paths
      const evidenceDir = path.join(tmpDir, 'mlspec', 'experiments', expName, 'evidence');
      await fs.promises.mkdir(evidenceDir, { recursive: true });
      const evidencePath = path.join(evidenceDir, 'E1.md');
      const evidenceContent = `---
evidence_level: E1
recommendation: none
comparison_ref:
  entity_type: baseline
  name: ${baselineName}
metrics:
  auc_delta: 0.0
compute:
  epochs: 10
commands:
  executed: "python train.py"
artifacts: {}
---

# Evidence
`;
      await fs.promises.writeFile(evidencePath, evidenceContent);

      const result = await runMlspec(['ml', 'validate'], { cwd: tmpDir });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('artifact paths');
    });
  });

  describe('validate errors on evidence without hypothesis', () => {
    it('should error when evidence exists but no hypothesis.md', async () => {
      const expName = `exp-no-hypothesis-${Date.now()}`;

      // Create experiment directory manually without hypothesis
      const expDir = path.join(tmpDir, 'mlspec', 'experiments', expName);
      await fs.promises.mkdir(expDir, { recursive: true });

      // Create .experiment.yaml
      const metaContent = `entity_type: experiment
schema: ml-experiment
comparison_ref: null
created: ${new Date().toISOString()}
`;
      await fs.promises.writeFile(path.join(expDir, '.experiment.yaml'), metaContent);

      // Create evidence without hypothesis
      const evidenceDir = path.join(expDir, 'evidence');
      await fs.promises.mkdir(evidenceDir, { recursive: true });
      const evidencePath = path.join(evidenceDir, 'E1.md');
      const evidenceContent = `---
evidence_level: E1
recommendation: none
comparison_ref:
  entity_type: baseline
  name: baseline
metrics:
  auc_delta: 0.0
---

# Evidence
`;
      await fs.promises.writeFile(evidencePath, evidenceContent);

      const result = await runMlspec(['ml', 'validate'], { cwd: tmpDir });
      expect(result.exitCode).not.toBe(0);
      expect(result.stdout).toContain('has evidence but no hypothesis');
    });
  });

  describe('protocol state detection', () => {
    it('should show protocol state in status output', async () => {
      const expName = `exp-state-${Date.now()}`;
      const baselineName = `baseline-state-${Date.now()}`;

      await runMlspec(['ml', 'new', 'baseline', baselineName], { cwd: tmpDir });
      await runMlspec(['ml', 'new', 'experiment', expName], { cwd: tmpDir });

      const result = await runMlspec(['ml', 'status'], { cwd: tmpDir });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('needs evidence');
      expect(result.stdout).toContain(expName);
    });
  });

  describe('AGENTS.md created on init', () => {
    it('should create AGENTS.md when initializing workspace', async () => {
      const agentsPath = path.join(tmpDir, 'mlspec', 'AGENTS.md');
      expect(fs.existsSync(agentsPath)).toBe(true);
      const content = await fs.promises.readFile(agentsPath, 'utf-8');
      expect(content).toContain('MLSpec Agent Experiment Protocol');
    });
  });

  describe('enhanced templates have controlled variables section', () => {
    it('should have controlled variables in hypothesis template', async () => {
      const expName = `exp-template-${Date.now()}`;
      const baselineName = `baseline-template-${Date.now()}`;

      await runMlspec(['ml', 'new', 'baseline', baselineName], { cwd: tmpDir });
      await runMlspec(['ml', 'new', 'experiment', expName], { cwd: tmpDir });

      const hypothesisPath = path.join(tmpDir, 'mlspec', 'experiments', expName, 'hypothesis.md');
      const content = await fs.promises.readFile(hypothesisPath, 'utf-8');
      expect(content).toContain('Controlled Variables');
      expect(content).toContain('Success Criteria');
      expect(content).toContain('Abort Criteria');
      expect(content).toContain('Evidence Level Plan');
    });
  });
});