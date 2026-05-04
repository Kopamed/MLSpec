/**
 * MLSpec Update Command
 *
 * Refreshes MLSpec skills, commands, and protocol files for configured tools.
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
} from '../../core/config.js';
import {
  generateCommands,
  CommandAdapterRegistry,
} from '../../core/command-generation/index.js';
import {
  getToolVersionStatus,
  getSkillTemplates,
  getCommandContents,
  generateSkillContent,
  getToolsWithSkillsDir,
} from '../../core/shared/index.js';
import { MLSPEC_WORKFLOWS } from './mlspec-workflows.js';
import {
  MLSPEC_DIR,
  mlspecWorkspaceExists,
} from '../utils.js';
import { AGENTS_CONTENT } from '../protocol.js';
import { stringify } from 'yaml';

const require = createRequire(import.meta.url);
const { version: MLSPEC_VERSION } = require('../../../package.json');

type MlspecUpdateOptions = {
  tools?: string;
  force?: boolean;
};

export class MlspecUpdateCommand {
  private readonly toolsArg?: string;
  private readonly force: boolean;

  constructor(options: MlspecUpdateOptions = {}) {
    this.toolsArg = options.tools;
    this.force = options.force ?? false;
  }

  async execute(projectPath: string): Promise<void> {
    const resolvedProjectPath = path.resolve(projectPath);
    const mlspecPath = path.join(resolvedProjectPath, MLSPEC_DIR);

    // Check that mlspec workspace exists
    if (!mlspecWorkspaceExists(resolvedProjectPath)) {
      throw new Error(`No mlspec/ workspace found. Run 'mlspec init' first.`);
    }

    // Determine which tools to update
    const toolsToUpdate = this.resolveToolsArg();

    // Get MLSpec skill and command templates (only MLSpec workflows)
    const skillTemplates = getSkillTemplates(MLSPEC_WORKFLOWS);
    const commandContents = getCommandContents(MLSPEC_WORKFLOWS);

    const updatedTools: string[] = [];
    const failedTools: Array<{ name: string; error: string }> = [];

    for (const toolId of toolsToUpdate) {
      const tool = AI_TOOLS.find((t) => t.value === toolId);
      if (!tool?.skillsDir) continue;

      const spinner = ora(`Updating ${tool.name} MLSpec skills...`).start();

      try {
        const skillsDir = path.join(resolvedProjectPath, tool.skillsDir, 'skills');

        // Generate skill files for MLSpec workflows only
        for (const { template, dirName } of skillTemplates) {
          const skillDir = path.join(skillsDir, dirName);
          const skillFile = path.join(skillDir, 'SKILL.md');

          const transformer = (tool.value === 'opencode' || tool.value === 'pi') ? transformToHyphenCommands : undefined;
          const skillContent = generateSkillContent(template, MLSPEC_VERSION, transformer);

          await FileSystemUtils.createDirectory(skillDir);
          await FileSystemUtils.writeFile(skillFile, skillContent);
        }

        // Generate command files
        const adapter = CommandAdapterRegistry.get(tool.value);
        if (adapter) {
          const generatedCommands = generateCommands(commandContents, adapter);

          for (const cmd of generatedCommands) {
            const commandFile = path.isAbsolute(cmd.path) ? cmd.path : path.join(resolvedProjectPath, cmd.path);
            await FileSystemUtils.writeFile(commandFile, cmd.fileContent);
          }
        }

        // Update MLSpec protocol files
        await this.updateProtocolFiles(resolvedProjectPath);

        spinner.succeed(`Updated ${tool.name} MLSpec skills`);
        updatedTools.push(tool.name);
      } catch (error) {
        spinner.fail(`Failed to update ${tool.name}`);
        failedTools.push({
          name: tool.name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Display summary
    console.log();
    if (updatedTools.length > 0) {
      console.log(chalk.green(`✓ Updated: ${updatedTools.join(', ')} (v${MLSPEC_VERSION})`));
    }
    if (failedTools.length > 0) {
      console.log(chalk.red(`✗ Failed: ${failedTools.map((f) => `${f.name} (${f.error})`).join(', ')}`));
    }

    if (updatedTools.length === 0 && failedTools.length === 0) {
      console.log(chalk.green('All MLSpec skills are up to date'));
    }

    console.log();
    console.log(chalk.dim('Restart your IDE for changes to take effect.'));
  }

  private resolveToolsArg(): string[] {
    const availableTools = getToolsWithSkillsDir();

    if (typeof this.toolsArg === 'undefined') {
      // No tools specified - update all tools that have MLSpec skills installed
      const toolsWithMlspecSkills: string[] = [];

      for (const toolId of availableTools) {
        const tool = AI_TOOLS.find((t) => t.value === toolId);
        if (!tool?.skillsDir) continue;

        const skillsDir = path.join(process.cwd(), tool.skillsDir, 'skills');

        // Check if any MLSpec skill exists
        for (const workflow of MLSPEC_WORKFLOWS) {
          const skillDir = path.join(skillsDir, `mlspec-${workflow.replace('mlspec-', '')}`);
          const skillFile = path.join(skillDir, 'SKILL.md');
          if (fs.existsSync(skillFile)) {
            toolsWithMlspecSkills.push(toolId);
            break;
          }
        }
      }

      return toolsWithMlspecSkills;
    }

    const raw = this.toolsArg.trim();
    if (raw.length === 0) {
      return [];
    }

    const lowerRaw = raw.toLowerCase();
    if (lowerRaw === 'all') {
      return availableTools;
    }

    const tokens = raw.split(',').map((token) => token.trim()).filter((token) => token.length > 0);
    const normalizedTokens = tokens.map((token) => token.toLowerCase());

    const availableSet = new Set(availableTools);
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

  private async updateProtocolFiles(projectPath: string): Promise<void> {
    // Update .workspace.yaml if needed
    const workspacePath = path.join(projectPath, MLSPEC_DIR, '.workspace.yaml');
    if (fs.existsSync(workspacePath)) {
      const content = fs.readFileSync(workspacePath, 'utf-8');
      // Just refresh the file with current structure (preserve existing data)
      const workspaceMeta = {
        entity_type: 'evaluation',
        schema: 'ml-experiment-v3',
        workspace_version: 3,
      };
      await FileSystemUtils.writeFile(workspacePath, `# MLSpec Workspace\n\n${stringify(workspaceMeta)}`);
    }

    // Update AGENTS.md
    const agentsPath = path.join(projectPath, MLSPEC_DIR, 'AGENTS.md');
    await FileSystemUtils.writeFile(agentsPath, AGENTS_CONTENT);
  }
}
