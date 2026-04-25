import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { Command } from 'commander';
import { MlspecInitCommand } from '../../src/mlspec/cli/mlspec-init.js';
import { MlspecUpdateCommand } from '../../src/mlspec/cli/mlspec-update.js';
import { MLSPEC_WORKFLOWS } from '../../src/mlspec/cli/mlspec-workflows.js';
import { registerMlspecCommands, registerMlspecSubcommand } from '../../src/mlspec/cli/index.js';

const { searchableMultiSelectMock } = vi.hoisted(() => ({
  searchableMultiSelectMock: vi.fn(),
}));

vi.mock('../../src/prompts/searchable-multi-select.js', () => ({
  searchableMultiSelect: searchableMultiSelectMock,
}));

const { showMlspecWelcomeMock } = vi.hoisted(() => ({
  showMlspecWelcomeMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/mlspec/ui/welcome-banner.js', () => ({
  showMlspecWelcome: showMlspecWelcomeMock,
}));

vi.mock('../../src/utils/interactive.js', () => ({
  isInteractive: vi.fn().mockReturnValue(true),
}));

describe('MLSpec CLI registration', () => {
  describe('registerMlspecCommands (for standalone mlspec binary)', () => {
    it('should register init, update, status, validate, new, add-evidence, decide, promote, archive as top-level commands', () => {
      const program = new Command();
      registerMlspecCommands(program);

      const commandNames = program.commands.map(c => c.name());

      // These are the expected top-level commands
      expect(commandNames).toContain('init');
      expect(commandNames).toContain('update');
      expect(commandNames).toContain('status');
      expect(commandNames).toContain('validate');
      expect(commandNames).toContain('new');
      expect(commandNames).toContain('add-evidence');
      expect(commandNames).toContain('decide');
      expect(commandNames).toContain('promote');
      expect(commandNames).toContain('archive');
    });

    it('should NOT register an "ml" subcommand as the only command', () => {
      const program = new Command();
      registerMlspecCommands(program);

      const commandNames = program.commands.map(c => c.name());

      // Should NOT be structured as "ml init, ml update, etc"
      // If there's an "ml" subcommand, then "init" would not be a top-level command
      if (commandNames.includes('ml')) {
        // If "ml" exists, then "init" should NOT be a direct child
        const mlCmd = program.commands.find(c => c.name() === 'ml');
        const mlSubCommands = mlCmd?.commands.map(c => c.name()) || [];
        expect(mlSubCommands).not.toContain('init');
      }
    });

    it('should have "new" command with baseline, candidate, experiment sub-commands', () => {
      const program = new Command();
      registerMlspecCommands(program);

      const newCmd = program.commands.find(c => c.name() === 'new');
      expect(newCmd).toBeDefined();

      const subCommands = newCmd?.commands.map(c => c.name()) || [];
      expect(subCommands).toContain('baseline');
      expect(subCommands).toContain('candidate');
      expect(subCommands).toContain('experiment');
    });
  });

  describe('registerMlspecSubcommand (for openspec ml compatibility)', () => {
    it('should register an "ml" subcommand', () => {
      const program = new Command();
      registerMlspecSubcommand(program);

      const commandNames = program.commands.map(c => c.name());
      expect(commandNames).toContain('ml');
    });

    it('should have init, update, status, etc under the ml subcommand', () => {
      const program = new Command();
      registerMlspecSubcommand(program);

      const mlCmd = program.commands.find(c => c.name() === 'ml');
      expect(mlCmd).toBeDefined();

      const mlSubCommands = mlCmd?.commands.map(c => c.name()) || [];
      expect(mlSubCommands).toContain('init');
      expect(mlSubCommands).toContain('update');
      expect(mlSubCommands).toContain('status');
      expect(mlSubCommands).toContain('validate');
    });
  });
});

describe('MLSPEC_WORKFLOWS', () => {
  it('should have 6 MLSpec workflows', () => {
    expect(MLSPEC_WORKFLOWS).toHaveLength(6);
  });

  it('should contain mlspec-* workflows only', () => {
    for (const workflow of MLSPEC_WORKFLOWS) {
      expect(workflow).toMatch(/^mlspec-/);
    }
  });

  it('should include all expected MLSpec workflows', () => {
    const expected = [
      'mlspec-explore',
      'mlspec-propose-experiment',
      'mlspec-run-evidence',
      'mlspec-decide',
      'mlspec-promote',
      'mlspec-archive',
    ];
    expect(MLSPEC_WORKFLOWS).toEqual(expected);
  });
});

describe('MlspecInitCommand', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `mlspec-init-test-${Date.now()}-${Math.random()}`);
    await fs.mkdir(testDir, { recursive: true });
    vi.spyOn(console, 'log').mockImplementation(() => { });
    vi.spyOn(console, 'warn').mockImplementation(() => { });
    showMlspecWelcomeMock.mockClear();
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe('welcome banner', () => {
    it('should show MLSpec welcome banner in interactive mode', async () => {
      const initCmd = new MlspecInitCommand({ noTools: true });
      await initCmd.execute(testDir);

      expect(showMlspecWelcomeMock).toHaveBeenCalled();
    });

    it('should NOT show welcome banner when --tools is specified (non-interactive)', async () => {
      const initCmd = new MlspecInitCommand({ tools: 'opencode' });
      await initCmd.execute(testDir);

      expect(showMlspecWelcomeMock).not.toHaveBeenCalled();
    });

    it('should NOT show welcome banner when toolsArg is provided', async () => {
      const initCmd = new MlspecInitCommand({ tools: 'claude' });
      await initCmd.execute(testDir);

      expect(showMlspecWelcomeMock).not.toHaveBeenCalled();
    });
  });

  describe('mlspec init --no-tools', () => {
    it('should create mlspec/ workspace directory', async () => {
      const initCmd = new MlspecInitCommand({ noTools: true });
      await initCmd.execute(testDir);

      const mlspecPath = path.join(testDir, 'mlspec');
      expect(await directoryExists(mlspecPath)).toBe(true);
    });

    it('should create mlspec/evaluation.md', async () => {
      const initCmd = new MlspecInitCommand({ noTools: true });
      await initCmd.execute(testDir);

      const evaluationPath = path.join(testDir, 'mlspec', 'evaluation.md');
      expect(await fileExists(evaluationPath)).toBe(true);

      const content = await fs.readFile(evaluationPath, 'utf-8');
      expect(content).toContain('MLSpec Evaluation');
    });

    it('should create mlspec/AGENTS.md', async () => {
      const initCmd = new MlspecInitCommand({ noTools: true });
      await initCmd.execute(testDir);

      const agentsPath = path.join(testDir, 'mlspec', 'AGENTS.md');
      expect(await fileExists(agentsPath)).toBe(true);

      const content = await fs.readFile(agentsPath, 'utf-8');
      expect(content).toContain('MLSpec Agent Experiment Protocol');
    });

    it('should create mlspec/.workspace.yaml', async () => {
      const initCmd = new MlspecInitCommand({ noTools: true });
      await initCmd.execute(testDir);

      const workspacePath = path.join(testDir, 'mlspec', '.workspace.yaml');
      expect(await fileExists(workspacePath)).toBe(true);

      const content = await fs.readFile(workspacePath, 'utf-8');
      expect(content).toContain('workspace_version');
    });

    it('should create required subdirectories', async () => {
      const initCmd = new MlspecInitCommand({ noTools: true });
      await initCmd.execute(testDir);

      const subdirs = ['baselines', 'experiments', 'candidates', 'findings', 'archive'];
      for (const subdir of subdirs) {
        const subdirPath = path.join(testDir, 'mlspec', subdir);
        expect(await directoryExists(subdirPath)).toBe(true);
      }
    });

    it('should NOT install OpenSpec/SWE skills when --no-tools is used', async () => {
      const initCmd = new MlspecInitCommand({ noTools: true });
      await initCmd.execute(testDir);

      // Check that .claude/skills/openspec-* do NOT exist
      const claudeSkillsPath = path.join(testDir, '.claude', 'skills');
      if (await directoryExists(claudeSkillsPath)) {
        const entries = await fs.readdir(claudeSkillsPath);
        const openspecSkills = entries.filter(e => e.startsWith('openspec-'));
        expect(openspecSkills).toHaveLength(0);
      }
    });

    it('should NOT create openspec/ directory when using --no-tools', async () => {
      const initCmd = new MlspecInitCommand({ noTools: true });
      await initCmd.execute(testDir);

      // openspec dir should NOT be created with --no-tools (only MLSpec workspace)
      const openspecPath = path.join(testDir, 'openspec');
      expect(await directoryExists(openspecPath)).toBe(false);
    });
  });

  describe('mlspec init --tools opencode', () => {
    it('should create mlspec/ workspace', async () => {
      const initCmd = new MlspecInitCommand({ tools: 'opencode' });
      await initCmd.execute(testDir);

      const mlspecPath = path.join(testDir, 'mlspec');
      expect(await directoryExists(mlspecPath)).toBe(true);
    });

    it('should create mlspec/evaluation.md', async () => {
      const initCmd = new MlspecInitCommand({ tools: 'opencode' });
      await initCmd.execute(testDir);

      const evaluationPath = path.join(testDir, 'mlspec', 'evaluation.md');
      expect(await fileExists(evaluationPath)).toBe(true);
    });

    it('should create mlspec/AGENTS.md', async () => {
      const initCmd = new MlspecInitCommand({ tools: 'opencode' });
      await initCmd.execute(testDir);

      const agentsPath = path.join(testDir, 'mlspec', 'AGENTS.md');
      expect(await fileExists(agentsPath)).toBe(true);
    });

    it('should install MLSpec skills to .opencode/skills/', async () => {
      const initCmd = new MlspecInitCommand({ tools: 'opencode' });
      await initCmd.execute(testDir);

      for (const workflow of MLSPEC_WORKFLOWS) {
        const skillDir = workflow.replace('mlspec-', '');
        const skillPath = path.join(testDir, '.opencode', 'skills', `mlspec-${skillDir}`, 'SKILL.md');
        expect(await fileExists(skillPath)).toBe(true);

        const content = await fs.readFile(skillPath, 'utf-8');
        expect(content).toContain('---');
        expect(content).toContain('name:');
      }
    });

    it('should install MLSpec commands to .opencode/commands/', async () => {
      const initCmd = new MlspecInitCommand({ tools: 'opencode' });
      await initCmd.execute(testDir);

      const commandsDir = path.join(testDir, '.opencode', 'commands');
      expect(await directoryExists(commandsDir)).toBe(true);

      // Check for MLSpec command files (mlspec-*.md)
      const files = await fs.readdir(commandsDir);
      const mlspecCommands = files.filter(f => f.startsWith('mlspec-') && f.endsWith('.md'));
      expect(mlspecCommands.length).toBeGreaterThan(0);
    });

    it('should NOT install OpenSpec/SWE skills when using mlspec init', async () => {
      const initCmd = new MlspecInitCommand({ tools: 'opencode' });
      await initCmd.execute(testDir);

      // Check that .opencode/skills/openspec-* do NOT exist
      const skillsPath = path.join(testDir, '.opencode', 'skills');
      if (await directoryExists(skillsPath)) {
        const entries = await fs.readdir(skillsPath);
        const openspecSkills = entries.filter(e => e.startsWith('openspec-'));
        expect(openspecSkills).toHaveLength(0);
      }
    });

    it('should NOT install OpenSpec/SWE commands when using mlspec init', async () => {
      const initCmd = new MlspecInitCommand({ tools: 'opencode' });
      await initCmd.execute(testDir);

      // Check that .opencode/commands/opsx-* do NOT exist
      const commandsPath = path.join(testDir, '.opencode', 'commands');
      if (await directoryExists(commandsPath)) {
        const files = await fs.readdir(commandsPath);
        const opsxCommands = files.filter(f => f.startsWith('opsx-'));
        expect(opsxCommands).toHaveLength(0);
      }
    });
  });
});

describe('MlspecUpdateCommand', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `mlspec-update-test-${Date.now()}-${Math.random()}`);
    await fs.mkdir(testDir, { recursive: true });
    vi.spyOn(console, 'log').mockImplementation(() => { });
    vi.spyOn(console, 'warn').mockImplementation(() => { });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('should fail when mlspec/ workspace does not exist', async () => {
    const updateCmd = new MlspecUpdateCommand({});
    await expect(updateCmd.execute(testDir)).rejects.toThrow("No mlspec/ workspace found");
  });

  it('should refresh MLSpec skills when mlspec/ workspace exists', async () => {
    // First init
    const initCmd = new MlspecInitCommand({ tools: 'opencode' });
    await initCmd.execute(testDir);

    // Now update
    const updateCmd = new MlspecUpdateCommand({ force: true });
    await updateCmd.execute(testDir);

    // Skills should still exist
    for (const workflow of MLSPEC_WORKFLOWS) {
      const skillDir = workflow.replace('mlspec-', '');
      const skillPath = path.join(testDir, '.opencode', 'skills', `mlspec-${skillDir}`, 'SKILL.md');
      expect(await fileExists(skillPath)).toBe(true);
    }
  });
});

// Helper functions
async function directoryExists(p: string): Promise<boolean> {
  try {
    const stat = await fs.stat(p);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function fileExists(p: string): Promise<boolean> {
  try {
    const stat = await fs.stat(p);
    return stat.isFile();
  } catch {
    return false;
  }
}
