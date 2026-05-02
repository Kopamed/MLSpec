/**
 * MLSpec Init Command
 *
 * Sets up MLSpec workspace and optionally installs MLSpec skills/commands for AI tools.
 */

import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import { createRequire } from 'module';
import { FileSystemUtils } from '../../utils/file-system.js';
import { transformToHyphenCommands } from '../../utils/command-references.js';
import {
  AI_TOOLS,
  OPENSPEC_DIR_NAME,
  AIToolOption,
} from '../../core/config.js';
import { PALETTE } from '../../core/styles/palette.js';
import { isInteractive } from '../../utils/interactive.js';
import {
  generateCommands,
  CommandAdapterRegistry,
} from '../../core/command-generation/index.js';
import {
  getToolsWithSkillsDir,
  getToolSkillStatus,
  getToolStates,
  getSkillTemplates,
  getCommandContents,
  generateSkillContent,
  type ToolSkillStatus,
} from '../../core/shared/index.js';
import { getAvailableTools } from '../../core/available-tools.js';
import { MLSPEC_WORKFLOWS } from './mlspec-workflows.js';
import {
  MLSPEC_DIR,
  resolveMlspecPath,
  createMlspecWorkspace,
  mlspecWorkspaceExists,
  getCurrentDate,
} from '../utils.js';
import { AGENTS_CONTENT } from '../protocol.js';
import { showMlspecWelcome } from '../ui/welcome-banner.js';
import { stringify } from 'yaml';

const require = createRequire(import.meta.url);
const { version: MLSPEC_VERSION } = require('../../../package.json');

const PROGRESS_SPINNER = {
  interval: 80,
  frames: ['░░░', '▒░░', '▒▒░', '▒▒▒', '▓▒▒', '▓▓▒', '▓▓▓', '▒▓▓', '░▒▓'],
};

type MlspecInitOptions = {
  tools?: string | false;
  noTools?: boolean;
  interactive?: boolean;
  force?: boolean;
};

export class MlspecInitCommand {
  private readonly toolsArg?: string;
  private readonly noTools: boolean;
  private readonly interactiveOption?: boolean;
  private readonly force: boolean;

  constructor(options: MlspecInitOptions = {}) {
    // Commander --no-tools sets tools to false instead of leaving it undefined
    // We treat tools === false as "no tools requested"
    this.toolsArg = options.tools === false ? undefined : options.tools;
    this.noTools = options.noTools ?? (options.tools === false);
    this.interactiveOption = options.interactive;
    this.force = options.force ?? false;
  }

  async execute(targetPath: string): Promise<void> {
    const projectPath = path.resolve(targetPath);
    const mlspecDir = MLSPEC_DIR;
    const mlspecPath = path.join(projectPath, mlspecDir);

    const extendMode = mlspecWorkspaceExists(projectPath);

    // Show MLSpec welcome screen in interactive mode
    const canPrompt = this.canPromptInteractively();
    if (canPrompt) {
      await showMlspecWelcome();
    }

    // Handle workspace creation
    await this.createOrRefreshWorkspace(projectPath, extendMode);

    // Handle tool installation
    if (!this.noTools) {
      const detectedTools = getAvailableTools(projectPath);
      const toolStates = getToolStates(projectPath);
      const selectedToolIds = await this.getSelectedTools(toolStates, detectedTools, projectPath);
      const validatedTools = this.validateTools(selectedToolIds, toolStates);
      await this.installToolIntegrations(projectPath, validatedTools);
    }

    this.displaySuccessMessage(extendMode);
  }

  private canPromptInteractively(): boolean {
    if (this.interactiveOption === false) return false;
    if (this.toolsArg !== undefined) return false;
    return isInteractive({ interactive: this.interactiveOption });
  }

  private async createOrRefreshWorkspace(projectPath: string, extendMode: boolean): Promise<void> {
    const spinner = ora('Setting up MLSpec workspace...').start();

    try {
      // Ensure mlspec directory exists
      const mlspecPath = resolveMlspecPath(projectPath);
      await FileSystemUtils.createDirectory(mlspecPath);

      // Create or refresh workspace.yaml
      const workspaceMeta = {
        entity_type: 'evaluation',
        schema: 'ml-experiment-v2',
        workspace_version: 2,
      };
      const workspaceFilePath = resolveMlspecPath(projectPath, '.workspace.yaml');
      await FileSystemUtils.writeFile(
        workspaceFilePath,
        `# MLSpec Workspace\n\n${stringify(workspaceMeta)}`
      );

      // Create or refresh evaluation.md
      const evaluationContent = `# MLSpec V2 Evaluation

## Overview

_Describe the purpose and scope of this ML experimentation workspace._

## Current Best Recipe

_No current-best recipe defined yet._

## Recipes

| ID | Name | Tags | Parent | Created |
|----|------|------|--------|---------|
| | | | | |

## Active Experiments

| ID | Base → Proposed | Status | Evidence |
|----|-----------------|--------|----------|
| | | | |

## Key Findings

_Summarize notable findings from experiments._

## Recommendations

_Next steps and priorities for the ML experimentation effort._
`;
      const evaluationPath = resolveMlspecPath(projectPath, 'evaluation.md');
      await FileSystemUtils.writeFile(evaluationPath, evaluationContent);

      // Create or refresh AGENTS.md
      const agentsPath = resolveMlspecPath(projectPath, 'AGENTS.md');
      await FileSystemUtils.writeFile(agentsPath, AGENTS_CONTENT);

      // Create required subdirectories (V2 uses recipes/ instead of baselines/candidates/)
      const subdirs = ['recipes', 'experiments', 'findings'];
      for (const subdir of subdirs) {
        const subdirPath = resolveMlspecPath(projectPath, subdir);
        await FileSystemUtils.createDirectory(subdirPath);
      }

      spinner.stopAndPersist({
        symbol: PALETTE.white('▌'),
        text: PALETTE.white('MLSpec workspace ready'),
      });
    } catch (error) {
      spinner.fail('Failed to setup MLSpec workspace');
      throw error;
    }
  }

  private async getSelectedTools(
    toolStates: Map<string, ToolSkillStatus>,
    detectedTools: AIToolOption[],
    projectPath: string
  ): Promise<string[]> {
    const nonInteractiveSelection = this.resolveToolsArg();
    if (nonInteractiveSelection !== null) {
      return nonInteractiveSelection;
    }

    const validTools = getToolsWithSkillsDir();
    const detectedToolIds = new Set(detectedTools.map((t) => t.value));
    const canPrompt = this.canPromptInteractively();

    if (!canPrompt) {
      if (detectedToolIds.size > 0) {
        return [...detectedToolIds];
      }
      throw new Error(
        `No tools detected and no --tools flag provided. Valid tools:\n  ${validTools.join('\n  ')}\n\nUse --tools all, --tools none, or --tools claude,cursor,...`
      );
    }

    if (validTools.length === 0) {
      throw new Error('No tools available for skill generation.');
    }

    const { searchableMultiSelect } = await import('../../prompts/searchable-multi-select.js');

    const sortedChoices = validTools.map((toolId) => {
      const tool = AI_TOOLS.find((t) => t.value === toolId);
      const status = toolStates.get(toolId);
      const configured = status?.configured ?? false;
      const detected = detectedToolIds.has(toolId);

      return {
        name: tool?.name || toolId,
        value: toolId,
        configured,
        detected: detected && !configured,
        preSelected: configured || detected,
      };
    }).sort((a, b) => {
      if (a.configured && !b.configured) return -1;
      if (!a.configured && b.configured) return 1;
      if (a.detected && !b.detected) return -1;
      if (!a.detected && b.detected) return 1;
      return 0;
    });

    const selectedTools = await searchableMultiSelect({
      message: `Select tools to set up MLSpec skills (${validTools.length} available)`,
      pageSize: 15,
      choices: sortedChoices,
      validate: (selected: string[]) => selected.length > 0 || 'Select at least one tool',
    });

    if (selectedTools.length === 0) {
      throw new Error('At least one tool must be selected');
    }

    return selectedTools;
  }

  private resolveToolsArg(): string[] | null {
    if (typeof this.toolsArg === 'undefined') {
      return null;
    }

    const raw = this.toolsArg.trim();
    if (raw.length === 0) {
      throw new Error('The --tools option requires a value. Use "all", "none", or a comma-separated list of tool IDs.');
    }

    const availableTools = getToolsWithSkillsDir();
    const availableSet = new Set(availableTools);

    const lowerRaw = raw.toLowerCase();
    if (lowerRaw === 'all') {
      return availableTools;
    }

    if (lowerRaw === 'none') {
      return [];
    }

    const tokens = raw.split(',').map((token) => token.trim()).filter((token) => token.length > 0);

    if (tokens.length === 0) {
      throw new Error('The --tools option requires at least one tool ID when not using "all" or "none".');
    }

    const normalizedTokens = tokens.map((token) => token.toLowerCase());

    if (normalizedTokens.some((token) => token === 'all' || token === 'none')) {
      throw new Error('Cannot combine reserved values "all" or "none" with specific tool IDs.');
    }

    const invalidTokens = tokens.filter((_token, index) => !availableSet.has(normalizedTokens[index]));

    if (invalidTokens.length > 0) {
      throw new Error(`Invalid tool(s): ${invalidTokens.join(', ')}. Available values: ${availableTools.join(', ')}`);
    }

    const deduped: string[] = [];
    for (const token of normalizedTokens) {
      if (!deduped.includes(token)) {
        deduped.push(token);
      }
    }

    return deduped;
  }

  private validateTools(
    toolIds: string[],
    toolStates: Map<string, ToolSkillStatus>
  ): Array<{ value: string; name: string; skillsDir: string; wasConfigured: boolean }> {
    const validatedTools: Array<{ value: string; name: string; skillsDir: string; wasConfigured: boolean }> = [];

    for (const toolId of toolIds) {
      const tool = AI_TOOLS.find((t) => t.value === toolId);
      if (!tool) {
        const validToolIds = getToolsWithSkillsDir();
        throw new Error(`Unknown tool '${toolId}'. Valid tools:\n  ${validToolIds.join('\n  ')}`);
      }

      if (!tool.skillsDir) {
        const validToolsWithSkills = getToolsWithSkillsDir();
        throw new Error(`Tool '${toolId}' does not support skill generation.\nTools with skill generation support:\n  ${validToolsWithSkills.join('\n  ')}`);
      }

      const preState = toolStates.get(tool.value);
      validatedTools.push({
        value: tool.value,
        name: tool.name,
        skillsDir: tool.skillsDir,
        wasConfigured: preState?.configured ?? false,
      });
    }

    return validatedTools;
  }

  private async installToolIntegrations(
    projectPath: string,
    tools: Array<{ value: string; name: string; skillsDir: string; wasConfigured: boolean }>
  ): Promise<void> {
    if (tools.length === 0) return;

    // Get MLSpec skill and command templates (only MLSpec workflows)
    const skillTemplates = getSkillTemplates(MLSPEC_WORKFLOWS);
    const commandContents = getCommandContents(MLSPEC_WORKFLOWS);

    for (const tool of tools) {
      const spinner = ora(`Setting up ${tool.name} for MLSpec...`).start();

      try {
        // Ensure tool's skills directory exists
        const skillsBaseDir = path.join(projectPath, tool.skillsDir);
        const skillsDir = path.join(skillsBaseDir, 'skills');

        // Create skill files for MLSpec workflows only
        for (const { template, dirName } of skillTemplates) {
          const skillDir = path.join(skillsDir, dirName);
          const skillFile = path.join(skillDir, 'SKILL.md');

          const transformer = (tool.value === 'opencode' || tool.value === 'pi') ? transformToHyphenCommands : undefined;
          const skillContent = generateSkillContent(template, MLSPEC_VERSION, transformer);

          await FileSystemUtils.createDirectory(skillDir);
          await FileSystemUtils.writeFile(skillFile, skillContent);
        }

        // Create command files for MLSpec workflows
        const adapter = CommandAdapterRegistry.get(tool.value);
        if (adapter) {
          const generatedCommands = generateCommands(commandContents, adapter);

          for (const cmd of generatedCommands) {
            const commandFile = path.isAbsolute(cmd.path) ? cmd.path : path.join(projectPath, cmd.path);
            await FileSystemUtils.writeFile(commandFile, cmd.fileContent);
          }
        }

        spinner.succeed(`MLSpec skills installed for ${tool.name}`);
      } catch (error) {
        spinner.fail(`Failed for ${tool.name}`);
        throw error;
      }
    }
  }

  private displaySuccessMessage(extendMode: boolean): void {
    console.log();
    console.log(chalk.bold('MLSpec Setup Complete'));
    console.log();
    console.log(`Workspace: ${chalk.cyan('mlspec/')}`);

    if (!this.noTools) {
      console.log(chalk.dim('Restart your IDE for MLSpec commands to take effect.'));
    }

    console.log();
    console.log(chalk.dim('Learn more: https://github.com/Fission-AI/OpenSpec'));
    console.log();
  }
}
