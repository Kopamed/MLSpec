/**
 * MLSpec CLI Command Registration (V2)
 *
 * Provides two registration functions:
 * - registerMlspecCommands(program): Registers commands directly on program (for standalone mlspec binary)
 * - registerMlspecSubcommand(program): Registers 'ml' subcommand (for openspec ml compatibility)
 *
 * V2 Commands:
 * - Recipe: new recipe, tag, untag, list recipes, show recipe, diff
 * - Experiment: new experiment (--from, --proposes required), set-status
 * - Evidence: add-evidence (--stage), show evidence
 * - Resolution: accept, reject, retry, hold, inconclusive
 * - Graph: graph, lineage, next
 * - Validation: validate (V2 structure)
 */

import { Command } from 'commander';
import path from 'path';
import {
  MLSPEC_DIR,
  resolveMlspecPath,
  createMlspecWorkspace,
  mlspecWorkspaceExists,
  getCurrentDate,
  isValidEntityName,
} from '../utils.js';
import {
  RecipeMetadataSchema,
  ExperimentMetadataSchema,
  ExperimentStatusSchema,
  EvidenceFrontmatterSchema,
  ResolutionFrontmatterSchema,
  EvidenceStageSchema,
  ResolutionTypeSchema,
  RecipeTagSchema,
  type RecipeMetadata,
  type ExperimentMetadata,
  type EvidenceFrontmatter,
  type ResolutionFrontmatter,
  type EvidenceStage,
  type RecipeTag,
} from '../entity-types.js';
import {
  experimentExists,
  recipeExists,
  loadExperimentMetadata,
  loadRecipeMetadata,
  listExperiments,
  listRecipes,
  listRecipeTags,
  loadAllRecipes,
} from '../reference-resolver.js';
import { parse as parseYaml, stringify } from 'yaml';
import ora from 'ora';
import * as fs from 'fs';
import { promises as fsp } from 'fs';
import { MlspecInitCommand } from './mlspec-init.js';
import { MlspecUpdateCommand } from './mlspec-update.js';

type MlspecCommandOptions = {
  tools?: string;
  noTools?: boolean;
  interactive?: boolean;
  force?: boolean;
};

// ============================================================================
// Command Registration
// ============================================================================

/**
 * Register MLSpec commands directly on a program (for standalone mlspec binary).
 * Commands appear as: mlspec init, mlspec status, etc.
 */
export function registerMlspecCommands(program: Command): void {
  // ml init
  const initCmd = program
    .command('init')
    .description('Initialize MLSpec workspace in the current project');

  initCmd.option('--tools <tools>', 'Configure AI tools non-interactively (comma-separated)');
  initCmd.option('--no-tools', 'Create workspace only without tool integrations');
  initCmd.option('--interactive', 'Enable interactive prompts');
  initCmd.option('--force', 'Auto-cleanup existing files without prompting');

  initCmd.action(async (options: MlspecCommandOptions) => {
    try {
      const projectPath = process.cwd();
      const initCmdInstance = new MlspecInitCommand({
        tools: options.tools,
        noTools: options.noTools,
        interactive: options.interactive,
        force: options.force,
      });
      await initCmdInstance.execute(projectPath);
    } catch (error) {
      ora().fail(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

  // ml update
  const updateCmd = program
    .command('update')
    .description('Update MLSpec skills and commands for configured tools');

  updateCmd.option('--tools <tools>', 'Update specific AI tools (comma-separated)');
  updateCmd.option('--force', 'Force update even when tools are up to date');

  updateCmd.action(async (options: { tools?: string; force?: boolean }) => {
    try {
      const projectPath = process.cwd();
      const updateCmdInstance = new MlspecUpdateCommand({
        tools: options.tools,
        force: options.force,
      });
      await updateCmdInstance.execute(projectPath);
    } catch (error) {
      ora().fail(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

  // ==========================================================================
  // Recipe Commands (2.1)
  // ==========================================================================

  const recipeCmd = program.command('new').description('Create new MLSpec entities');

  // ml new recipe <id> [--tag <tag>]
  recipeCmd
    .command('recipe <id>')
    .description('Create a new recipe entity')
    .option('--tag <tag>', 'Initial tag for the recipe (baseline, candidate, current-best, variant)')
    .action(async (id: string, options: { tag?: string }) => {
      try {
        const projectPath = process.cwd();

        if (!mlspecWorkspaceExists(projectPath)) {
          ora().fail('MLSpec workspace not found. Run "mlspec init" first.');
          process.exit(1);
        }

        if (!isValidEntityName(id)) {
          ora().fail('Invalid recipe ID. Use only alphanumeric characters, dashes, and underscores.');
          process.exit(1);
        }

        const recipeDir = resolveMlspecPath(projectPath, 'recipes', id);
        if (fs.existsSync(recipeDir)) {
          ora().fail(`Recipe '${id}' already exists`);
          process.exit(1);
        }

        const tags: RecipeTag[] = [];
        if (options.tag) {
          const tagResult = RecipeTagSchema.safeParse(options.tag);
          if (!tagResult.success) {
            ora().fail(`Invalid tag '${options.tag}'. Must be one of: ${RecipeTagSchema.options.join(', ')}`);
            process.exit(1);
          }
          tags.push(tagResult.data);
        }

        await fsp.mkdir(recipeDir, { recursive: true });

        const metadata: Record<string, unknown> = {
          entity_type: 'recipe',
          schema: 'ml-experiment-v2',
          id,
          name: id,
          tags,
          parent_recipe: null,
          created_by_experiment: null,
          created: getCurrentDate(),
        };

        await fsp.writeFile(
          path.join(recipeDir, 'recipe.yaml'),
          `# Recipe: ${id}\n\n${stringify(metadata)}`
        );

        await fsp.writeFile(
          path.join(recipeDir, 'recipe.md'),
          `# Recipe: ${id}

## Purpose

_Describe what this recipe is and what it represents._

## Configuration

\`\`\`yaml
# Recipe configuration here
\`\`\`

## Metrics Summary

| Metric | Value |
|--------|-------|
| | |

## Notes

_Additional context about this recipe._

---

_Created: ${getCurrentDate()}_
`
        );

        ora().succeed(`Created recipe '${id}'`);
      } catch (error) {
        ora().fail(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // ml tag recipe <id> <tag>
  program
    .command('tag')
    .description('Tag operations for recipes')
    .command('recipe <id> <tag>')
    .description('Add a tag to a recipe')
    .action(async (id: string, tag: string) => {
      try {
        const projectPath = process.cwd();

        if (!mlspecWorkspaceExists(projectPath)) {
          ora().fail('MLSpec workspace not found. Run "mlspec init" first.');
          process.exit(1);
        }

        const recipePath = resolveMlspecPath(projectPath, 'recipes', id, 'recipe.yaml');
        if (!fs.existsSync(recipePath)) {
          ora().fail(`Recipe '${id}' not found`);
          process.exit(1);
        }

        const tagResult = RecipeTagSchema.safeParse(tag);
        if (!tagResult.success) {
          ora().fail(`Invalid tag '${tag}'. Must be one of: ${RecipeTagSchema.options.join(', ')}`);
          process.exit(1);
        }

        const content = fs.readFileSync(recipePath, 'utf-8');
        const parsed = parseYaml(content) as RecipeMetadata;

        if (parsed.tags && parsed.tags.includes(tagResult.data)) {
          ora().fail(`Recipe '${id}' already has tag '${tag}'`);
          process.exit(1);
        }

        parsed.tags = [...(parsed.tags || []), tagResult.data];

        await fsp.writeFile(recipePath, `# Recipe: ${id}\n\n${stringify(parsed)}`);

        ora().succeed(`Added tag '${tag}' to recipe '${id}'`);
      } catch (error) {
        ora().fail(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // ml untag recipe <id> <tag>
  program
    .command('untag')
    .description('Remove tags from recipes')
    .command('recipe <id> <tag>')
    .description('Remove a tag from a recipe')
    .action(async (id: string, tag: string) => {
      try {
        const projectPath = process.cwd();

        if (!mlspecWorkspaceExists(projectPath)) {
          ora().fail('MLSpec workspace not found. Run "mlspec init" first.');
          process.exit(1);
        }

        const recipePath = resolveMlspecPath(projectPath, 'recipes', id, 'recipe.yaml');
        if (!fs.existsSync(recipePath)) {
          ora().fail(`Recipe '${id}' not found`);
          process.exit(1);
        }

        const tagResult = RecipeTagSchema.safeParse(tag);
        if (!tagResult.success) {
          ora().fail(`Invalid tag '${tag}'. Must be one of: ${RecipeTagSchema.options.join(', ')}`);
          process.exit(1);
        }

        const content = fs.readFileSync(recipePath, 'utf-8');
        const parsed = parseYaml(content) as RecipeMetadata;

        if (!parsed.tags || !parsed.tags.includes(tagResult.data)) {
          ora().fail(`Recipe '${id}' does not have tag '${tag}'`);
          process.exit(1);
        }

        parsed.tags = parsed.tags.filter((t: RecipeTag) => t !== tagResult.data);

        await fsp.writeFile(recipePath, `# Recipe: ${id}\n\n${stringify(parsed)}`);

        ora().succeed(`Removed tag '${tag}' from recipe '${id}'`);
      } catch (error) {
        ora().fail(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // ml list recipes [--tag <tag>]
  const listCmd = program
    .command('list')
    .description('List entities');
  listCmd
    .command('recipes')
    .description('List all recipes')
    .option('--tag <tag>', 'Filter by tag')
    .action(async (options: { tag?: string }) => {
      try {
        const projectPath = process.cwd();

        if (!mlspecWorkspaceExists(projectPath)) {
          ora().fail('MLSpec workspace not found. Run "mlspec init" first.');
          process.exit(1);
        }

        let recipes = listRecipes(projectPath);

        if (options.tag) {
          const tagResult = RecipeTagSchema.safeParse(options.tag);
          if (!tagResult.success) {
            ora().fail(`Invalid tag '${options.tag}'. Must be one of: ${RecipeTagSchema.options.join(', ')}`);
            process.exit(1);
          }
          recipes = recipes.filter((id) => {
            const meta = loadRecipeMetadata(projectPath, id);
            return meta?.tags?.includes(tagResult.data) ?? false;
          });
        }

        console.log(`\n# Recipes (${recipes.length})\n`);

        if (recipes.length === 0) {
          console.log('  (none)');
        } else {
          for (const recipeId of recipes) {
            const meta = loadRecipeMetadata(projectPath, recipeId);
            const tagsStr = meta?.tags?.length ? ` [${meta.tags.join(', ')}]` : '';
            const parentStr = meta?.parent_recipe ? ` (from: ${meta.parent_recipe})` : '';
            console.log(`  - ${recipeId}${tagsStr}${parentStr}`);
          }
        }
        console.log();
      } catch (error) {
        ora().fail(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // ml list experiments [--status <status>]
  listCmd
    .command('experiments')
    .description('List all experiments')
    .option('--status <status>', 'Filter by status (draft, running, resolved)')
    .action(async (options: { status?: string }) => {
      try {
        const projectPath = process.cwd();

        if (!mlspecWorkspaceExists(projectPath)) {
          ora().fail('MLSpec workspace not found. Run "mlspec init" first.');
          process.exit(1);
        }

        let experiments = listExperiments(projectPath);

        if (options.status) {
          const statusResult = ExperimentStatusSchema.safeParse(options.status);
          if (!statusResult.success) {
            ora().fail(`Invalid status '${options.status}'. Must be one of: ${ExperimentStatusSchema.options.join(', ')}`);
            process.exit(1);
          }
          experiments = experiments.filter((id) => {
            const meta = loadExperimentMetadata(projectPath, id);
            return meta?.status === statusResult.data;
          });
        }

        console.log(`\n# Experiments (${experiments.length})\n`);

        if (experiments.length === 0) {
          console.log('  (none)');
        } else {
          for (const expId of experiments) {
            const meta = loadExperimentMetadata(projectPath, expId);
            const statusStr = meta?.status || 'unknown';
            console.log(`  - ${expId} [${statusStr}]`);
            if (meta?.base_recipe && meta?.proposed_recipe) {
              console.log(`    Base: ${meta.base_recipe} → Proposed: ${meta.proposed_recipe}`);
            }
          }
        }
        console.log();
      } catch (error) {
        ora().fail(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // ml show recipe <id>
  const showCmd = program
    .command('show')
    .description('Show entity details');
  showCmd
    .command('recipe <id>')
    .description('Show recipe details')
    .option('--json', 'Output machine-readable JSON')
    .action(async (id: string, options: { json?: boolean }) => {
      try {
        const projectPath = process.cwd();

        if (!mlspecWorkspaceExists(projectPath)) {
          if (options.json) {
            console.log(JSON.stringify({ error: 'MLSpec workspace not found. Run "mlspec init" first.' }, null, 2));
            process.exit(1);
          }
          ora().fail('MLSpec workspace not found. Run "mlspec init" first.');
          process.exit(1);
        }

        const recipePath = resolveMlspecPath(projectPath, 'recipes', id, 'recipe.yaml');
        if (!fs.existsSync(recipePath)) {
          if (options.json) {
            console.log(JSON.stringify({ error: `Recipe '${id}' not found` }, null, 2));
            process.exit(1);
          }
          ora().fail(`Recipe '${id}' not found`);
          process.exit(1);
        }

        const content = fs.readFileSync(recipePath, 'utf-8');
        const parsed = parseYaml(content) as RecipeMetadata;
        const summaryPath = path.join(path.dirname(recipePath), 'summary.md');

        if (options.json) {
          const output = {
            id,
            name: parsed.name,
            tags: parsed.tags || [],
            parent_recipe: parsed.parent_recipe || null,
            created_by_experiment: parsed.created_by_experiment || null,
            config: parsed.config || null,
            metrics: parsed.metrics || null,
            summary_path: fs.existsSync(summaryPath) ? summaryPath : null,
            created: parsed.created,
          };
          console.log(JSON.stringify(output, null, 2));
          return;
        }

        // Human-readable output (default)
        console.log(`\n# Recipe: ${id}\n`);
        console.log(`**Name:** ${parsed.name}`);
        console.log(`**Tags:** ${parsed.tags?.join(', ') || '(none)'}`);
        console.log(`**Parent Recipe:** ${parsed.parent_recipe || '(root)'}`);
        console.log(`**Created by Experiment:** ${parsed.created_by_experiment || '(manual)'}`);
        console.log(`**Created:** ${parsed.created}`);

        if (parsed.metrics && Object.keys(parsed.metrics).length > 0) {
          console.log('\n## Metrics\n');
          for (const [metric, value] of Object.entries(parsed.metrics)) {
            console.log(`  - ${metric}: ${value}`);
          }
        }

        // Show lineage
        if (parsed.parent_recipe) {
          const lineage: string[] = [id];
          let current = parsed;
          while (current.parent_recipe) {
            lineage.push(current.parent_recipe);
            const parentMeta = loadRecipeMetadata(projectPath, current.parent_recipe);
            if (!parentMeta) break;
            current = parentMeta;
          }
          console.log('\n**Lineage:** ' + lineage.reverse().join(' → '));
        }

        console.log();
      } catch (error) {
        if (options.json) {
          console.log(JSON.stringify({ error: (error as Error).message }, null, 2));
          process.exit(1);
        }
        ora().fail(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // ml diff <recipe-a> <recipe-b>
  program
    .command('diff <recipeA> <recipeB>')
    .description('Compare two recipes')
    .action(async (recipeA: string, recipeB: string) => {
      try {
        const projectPath = process.cwd();

        if (!mlspecWorkspaceExists(projectPath)) {
          ora().fail('MLSpec workspace not found. Run "mlspec init" first.');
          process.exit(1);
        }

        const pathA = resolveMlspecPath(projectPath, 'recipes', recipeA, 'recipe.yaml');
        const pathB = resolveMlspecPath(projectPath, 'recipes', recipeB, 'recipe.yaml');

        if (!fs.existsSync(pathA)) {
          ora().fail(`Recipe '${recipeA}' not found`);
          process.exit(1);
        }
        if (!fs.existsSync(pathB)) {
          ora().fail(`Recipe '${recipeB}' not found`);
          process.exit(1);
        }

        const contentA = fs.readFileSync(pathA, 'utf-8');
        const contentB = fs.readFileSync(pathB, 'utf-8');
        const metaA = parseYaml(contentA) as RecipeMetadata;
        const metaB = parseYaml(contentB) as RecipeMetadata;

        console.log(`\n# Recipe Diff: ${recipeA} vs ${recipeB}\n`);

        // Compare tags
        const tagsA = metaA.tags || [];
        const tagsB = metaB.tags || [];
        const onlyA = tagsA.filter((t: RecipeTag) => !tagsB.includes(t));
        const onlyB = tagsB.filter((t: RecipeTag) => !tagsA.includes(t));
        console.log('## Tags');
        if (onlyA.length) console.log(`  ${recipeA} only: ${onlyA.join(', ')}`);
        if (onlyB.length) console.log(`  ${recipeB} only: ${onlyB.join(', ')}`);
        if (!onlyA.length && !onlyB.length) console.log('  (same)');

        // Compare parent
        console.log('\n## Parent Recipe');
        console.log(`  ${recipeA}: ${metaA.parent_recipe || '(root)'}`);
        console.log(`  ${recipeB}: ${metaB.parent_recipe || '(root)'}`);

        // Compare metrics
        const metricsA = (metaA.metrics ?? {}) as Record<string, number>;
        const metricsB = (metaB.metrics ?? {}) as Record<string, number>;
        const allMetrics = new Set([...Object.keys(metricsA), ...Object.keys(metricsB)]);
        if (allMetrics.size > 0) {
          console.log('\n## Metrics');
          for (const metric of allMetrics) {
            const valA = metricsA[metric];
            const valB = metricsB[metric];
            if (valA !== valB) {
              console.log(`  ${metric}:`);
              console.log(`    ${recipeA}: ${valA ?? '(none)'}`);
              console.log(`    ${recipeB}: ${valB ?? '(none)'}`);
            } else {
              console.log(`  ${metric}: ${valA}`);
            }
          }
        }

        console.log();
      } catch (error) {
        ora().fail(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // ==========================================================================
  // Experiment Commands (2.2)
  // ==========================================================================

  // ml new experiment <id> --from <base-recipe> --proposes <proposed-recipe>
  recipeCmd
    .command('experiment <id>')
    .description('Create a new experiment entity')
    .requiredOption('--from <recipe>', 'Base recipe ID to compare against')
    .requiredOption('--proposes <recipe>', 'Proposed recipe ID to evaluate')
    .option('--change <description>', 'Description of what changes from base')
    .option('--controlled <variables...>', 'Controlled variables that stay fixed')
    .option('--success <criteria...>', 'Success criteria for acceptance')
    .option('--abort <criteria...>', 'Abort criteria for early termination')
    .option('--plan <stages...>', 'Evidence plan stages (smoke, validation, final)')
    .action(async (id: string, options: {
      from: string;
      proposes: string;
      change?: string;
      controlled?: string[];
      success?: string[];
      abort?: string[];
      plan?: string[];
    }) => {
      try {
        const projectPath = process.cwd();

        if (!mlspecWorkspaceExists(projectPath)) {
          ora().fail('MLSpec workspace not found. Run "mlspec init" first.');
          process.exit(1);
        }

        if (!isValidEntityName(id)) {
          ora().fail('Invalid experiment ID. Use only alphanumeric characters, dashes, and underscores.');
          process.exit(1);
        }

        // Validate base_recipe exists
        const baseRecipePath = resolveMlspecPath(projectPath, 'recipes', options.from, 'recipe.yaml');
        if (!fs.existsSync(baseRecipePath)) {
          ora().fail(`Base recipe '${options.from}' not found`);
          process.exit(1);
        }

        // Cycle detection: check if proposed_recipe is in base_recipe's lineage
        // Note: proposed == base is a valid "null experiment" (reproducibility check)
        if (options.proposes !== options.from) {
          const lineage: string[] = [];
          let currentId: string | null = options.from;
          while (currentId) {
            lineage.push(currentId);
            const meta = loadRecipeMetadata(projectPath, currentId);
            if (!meta || !meta.parent_recipe) break;
            currentId = meta.parent_recipe;
          }

          if (lineage.includes(options.proposes)) {
            const cyclePath = [...lineage.slice().reverse(), options.proposes].join(' → ');
            ora().fail(`Cycle detected: ${cyclePath}`);
            process.exit(1);
          }
        }

        const experimentDir = resolveMlspecPath(projectPath, 'experiments', id);
        if (fs.existsSync(experimentDir)) {
          ora().fail(`Experiment '${id}' already exists`);
          process.exit(1);
        }

        await fsp.mkdir(experimentDir, { recursive: true });
        await fsp.mkdir(path.join(experimentDir, 'evidence'), { recursive: true });

        const metadata: Record<string, unknown> = {
          entity_type: 'experiment',
          schema: 'ml-experiment-v2',
          id,
          status: 'draft',
          base_recipe: options.from,
          proposed_recipe: options.proposes,
          proposed_change: options.change || '_Describe what changes from base_',
          controlled_variables: options.controlled || [],
          success_criteria: options.success || [],
          abort_criteria: options.abort || [],
          evidence_plan: options.plan || ['smoke', 'validation', 'final'],
          created: getCurrentDate(),
        };

        await fsp.writeFile(
          path.join(experimentDir, 'experiment.yaml'),
          `# Experiment: ${id}\n\n${stringify(metadata)}`
        );

        await fsp.writeFile(
          path.join(experimentDir, 'hypothesis.md'),
          `# Hypothesis: ${id}

## Experiment

- **Base Recipe**: ${options.from}
- **Proposed Recipe**: ${options.proposes}
- **Proposed Change**: ${options.change || '_Describe what changes from base_'}

## Hypothesis

_What are we trying to test? State the hypothesis clearly._

## Controlled Variables

${(options.controlled || []).map((v: string) => `- ${v}`).join('\n') || '_What stays the same during this experiment?_'}

## Success Criteria

${(options.success || []).map((c: string) => `- ${c}`).join('\n') || '_What metric improvements justify acceptance?_'}
- Metric 1 delta > +0.005

## Abort Criteria

${(options.abort || []).map((c: string) => `- ${c}`).join('\n') || '_What results would indicate this experiment should be stopped early?_'}
- Metric delta < -0.010

## Evidence Plan

${(options.plan || ['smoke', 'validation', 'final']).map((s: string) => `- [ ] ${s.charAt(0).toUpperCase() + s.slice(1)}: _description_`).join('\n')}

## Expected Output Location

\`\`\`
outputs/${id}/
\`\`\`
`
        );

        ora().succeed(`Created experiment '${id}' with hypothesis.md`);
        console.log('\nNext steps:');
        console.log(`1. Edit ${path.join(experimentDir, 'hypothesis.md')} to refine your hypothesis`);
        console.log(`2. Add evidence with 'mlspec add-evidence ${id} --stage <smoke|validation|final>'`);
      } catch (error) {
        ora().fail(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // ml set-status <experiment> <status>
  program
    .command('set-status <experiment> <status>')
    .description('Set experiment status (draft, running, resolved)')
    .action(async (experiment: string, status: string) => {
      try {
        const projectPath = process.cwd();

        if (!mlspecWorkspaceExists(projectPath)) {
          ora().fail('MLSpec workspace not found. Run "mlspec init" first.');
          process.exit(1);
        }

        if (!experimentExists(projectPath, experiment)) {
          ora().fail(`Experiment '${experiment}' not found`);
          process.exit(1);
        }

        const validStatuses = ['draft', 'running', 'resolved'];
        if (!validStatuses.includes(status)) {
          ora().fail(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
          process.exit(1);
        }

        const experimentPath = resolveMlspecPath(projectPath, 'experiments', experiment, 'experiment.yaml');
        const content = fs.readFileSync(experimentPath, 'utf-8');
        const parsed = parseYaml(content) as ExperimentMetadata;

        // Cannot change status of resolved experiment
        if (parsed.status === 'resolved') {
          ora().fail(`Cannot change status of resolved experiment '${experiment}'`);
          process.exit(1);
        }

        parsed.status = status as ExperimentMetadata['status'];

        await fsp.writeFile(experimentPath, `# Experiment: ${experiment}\n\n${stringify(parsed)}`);

        ora().succeed(`Set experiment '${experiment}' status to '${status}'`);
      } catch (error) {
        ora().fail(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // ==========================================================================
  // Evidence Commands (2.3)
  // ==========================================================================

  // ml add-evidence <experiment> --stage <stage> [--metrics <json>] [--seed <number>]
  program
    .command('add-evidence <experiment>')
    .description('Add evidence to an experiment')
    .requiredOption('--stage <stage>', 'Evidence stage (smoke, validation, final)')
    .option('--metrics <json>', 'JSON object of metric values (e.g., \'{"accuracy":0.85}\')')
    .option('--seed <number>', 'Random seed used for reproducibility')
    .action(async (experiment: string, options: { stage: string; metrics?: string; seed?: string }) => {
      try {
        const projectPath = process.cwd();

        if (!mlspecWorkspaceExists(projectPath)) {
          ora().fail('MLSpec workspace not found. Run "mlspec init" first.');
          process.exit(1);
        }

        if (!experimentExists(projectPath, experiment)) {
          ora().fail(`Experiment '${experiment}' not found`);
          process.exit(1);
        }

        const stageResult = EvidenceStageSchema.safeParse(options.stage);
        if (!stageResult.success) {
          ora().fail(`Invalid evidence stage. Must be one of: ${EvidenceStageSchema.options.join(', ')}`);
          process.exit(1);
        }
        const stage = stageResult.data;

        const experimentDir = resolveMlspecPath(projectPath, 'experiments', experiment);
        const evidenceDir = path.join(experimentDir, 'evidence');
        const evidencePath = path.join(evidenceDir, `${stage}.md`);

        if (fs.existsSync(evidencePath)) {
          ora().fail(`Evidence at stage '${stage}' already exists for experiment '${experiment}'`);
          process.exit(1);
        }

        await fsp.mkdir(evidenceDir, { recursive: true });

        const expMeta = loadExperimentMetadata(projectPath, experiment);
        const baseRecipe = expMeta?.base_recipe || 'unknown';
        const proposedRecipe = expMeta?.proposed_recipe || 'unknown';

        // Build runs array based on provided options
        const runs: Record<string, unknown>[] = [];
        if (options.metrics || options.seed) {
          const run: Record<string, unknown> = {
            seed: options.seed ? parseInt(options.seed, 10) : undefined,
            command: '_Command used to generate this run_',
            completed: getCurrentDate(),
            duration_minutes: undefined,
            metrics: {},
          };

          // Parse metrics if provided
          if (options.metrics) {
            try {
              run.metrics = JSON.parse(options.metrics);
            } catch {
              ora().warn('Invalid --metrics JSON, ignoring');
            }
          }

          runs.push(run);
        }

        // Compute aggregate from runs
        const aggregate: Record<string, { mean: number | null; std: number | null }> = {};
        if (runs.length > 0) {
          for (const run of runs) {
            if (run.metrics && typeof run.metrics === 'object') {
              for (const [key, value] of Object.entries(run.metrics)) {
                if (typeof value === 'number') {
                  if (!aggregate[key]) {
                    aggregate[key] = { mean: null, std: null };
                  }
                  // For single run: mean = value, std = null
                  // For multi-run: mean = average, std = stddev
                  aggregate[key].mean = value;
                }
              }
            }
          }
        }

        const frontmatter: Record<string, unknown> = {
          entity_type: 'evidence',
          experiment_id: experiment,
          stage,
          runs,
          aggregate,
          summary: '',
          recommendation: 'none',
          created: getCurrentDate(),
        };

        await fsp.writeFile(
          evidencePath,
          `---\n${stringify(frontmatter)}---\n\n# Evidence: ${experiment} (${stage})\n\n## What Was Done\n\n_Describe the experiment setup and what was executed._\n\n## Changed Files\n\n_List the files actually modified for this experiment:_\n- \`file1.py\`: Description of change\n- \`file2.yaml\`: Description of change\n\n## Run Results\n\n### Run 1\n\n| Metric | ${baseRecipe} | ${proposedRecipe} | Delta |\n|--------|---------------|-------------------|-------|\n| <metric> | <base_value> | <proposed_value> | <delta> |\n\n### Aggregate\n\n| Metric | Mean Delta | Std |\n|--------|-----------|-----|\n| <metric> | <mean_delta> | <std> |\n\n## Interpretation\n\n_What do these results mean? Is there a signal?\nConsider: metric delta, seed/fold stability, per-class regressions, compute tradeoff._\n\n## Recommendation\n\n- [ ] **continue**: Run the next evidence stage\n- [ ] **accept**: Resolve experiment as accepted\n- [ ] **reject**: Resolve experiment as rejected\n- [ ] **retry**: Re-run with modifications\n- [ ] **hold**: Pause for later\n- [ ] **inconclusive**: Evidence is not strong enough\n`
        );

        // Set experiment status to running when first evidence is added
        if (expMeta && expMeta.status === 'draft') {
          expMeta.status = 'running';
          await fsp.writeFile(
            path.join(experimentDir, 'experiment.yaml'),
            `# Experiment: ${experiment}\n\n${stringify(expMeta)}`
          );
        }

        ora().succeed(`Created ${stage} evidence for experiment '${experiment}'`);
      } catch (error) {
        ora().fail(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // ml show evidence <experiment>
  showCmd
    .command('evidence <experiment>')
    .description('Show evidence summary for an experiment')
    .option('--json', 'Output machine-readable JSON')
    .action(async (experiment: string, options: { json?: boolean }) => {
      try {
        const projectPath = process.cwd();

        if (!mlspecWorkspaceExists(projectPath)) {
          if (options.json) {
            console.log(JSON.stringify({ error: 'MLSpec workspace not found. Run "mlspec init" first.' }, null, 2));
            process.exit(1);
          }
          ora().fail('MLSpec workspace not found. Run "mlspec init" first.');
          process.exit(1);
        }

        if (!experimentExists(projectPath, experiment)) {
          if (options.json) {
            console.log(JSON.stringify({ error: `Experiment '${experiment}' not found`, experiment_id: experiment }, null, 2));
            process.exit(1);
          }
          ora().fail(`Experiment '${experiment}' not found`);
          process.exit(1);
        }

        const experimentDir = resolveMlspecPath(projectPath, 'experiments', experiment);
        const stages: Record<string, {
          exists: boolean;
          path: string | null;
          runs: unknown[] | null;
          aggregate: Record<string, { mean: number | null; std: number | null }> | null;
          summary: string | null;
          recommendation: string | null;
        }> = {};

        for (const stage of EvidenceStageSchema.options) {
          const evidencePath = path.join(experimentDir, 'evidence', `${stage}.md`);
          if (fs.existsSync(evidencePath)) {
            try {
              const content = fs.readFileSync(evidencePath, 'utf-8');
              const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
              if (frontmatterMatch) {
                const parsed = parseYaml(frontmatterMatch[1]) as EvidenceFrontmatter;
                stages[stage] = {
                  exists: true,
                  path: evidencePath,
                  runs: parsed.runs || null,
                  aggregate: parsed.aggregate || null,
                  summary: parsed.summary || null,
                  recommendation: parsed.recommendation || null,
                };
              } else {
                stages[stage] = { exists: true, path: evidencePath, runs: null, aggregate: null, summary: null, recommendation: null };
              }
            } catch {
              stages[stage] = { exists: true, path: evidencePath, runs: null, aggregate: null, summary: null, recommendation: null };
            }
          } else {
            stages[stage] = { exists: false, path: null, runs: null, aggregate: null, summary: null, recommendation: null };
          }
        }

        if (options.json) {
          const output = { experiment_id: experiment, stages };
          console.log(JSON.stringify(output, null, 2));
          return;
        }

        // Human-readable output (default)
        console.log(`\n# Evidence: ${experiment}\n`);

        let hasEvidence = false;
        for (const stage of EvidenceStageSchema.options) {
          if (stages[stage].exists) {
            hasEvidence = true;
            console.log(`## ${stage.charAt(0).toUpperCase() + stage.slice(1)}`);
            console.log(`  - Runs: ${(stages[stage].runs as unknown[])?.length || 0}`);
            console.log(`  - Recommendation: ${stages[stage].recommendation || 'none'}`);
            if (stages[stage].summary) {
              console.log(`  - Summary: ${stages[stage].summary}`);
            }
          }
        }

        if (!hasEvidence) {
          console.log('  (no evidence yet)');
        }

        console.log();
      } catch (error) {
        if (options.json) {
          console.log(JSON.stringify({ error: (error as Error).message }, null, 2));
          process.exit(1);
        }
        ora().fail(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // ==========================================================================
  // Resolution Commands (2.4)
  // ==========================================================================

  // ml accept <experiment> --as <recipe> [--config <file>] [--tag <tag>]
  program
    .command('accept <experiment>')
    .description('Accept an experiment and create a recipe')
    .requiredOption('--as <recipe>', 'Recipe ID to create')
    .option('--config <file>', 'Config file to use for the accepted recipe (copies base_recipe config if omitted)')
    .option('--tag <tag>', 'Tag for the new recipe (default: candidate)', 'candidate')
    .action(async (experiment: string, options: { as: string; config?: string; tag?: string }) => {
      try {
        const projectPath = process.cwd();
        const spinner = ora('Accepting experiment...').start();

        if (!mlspecWorkspaceExists(projectPath)) {
          ora().fail('MLSpec workspace not found. Run "mlspec init" first.');
          process.exit(1);
        }

        if (!experimentExists(projectPath, experiment)) {
          ora().fail(`Experiment '${experiment}' not found`);
          process.exit(1);
        }

        const recipeId = options.as;
        if (!isValidEntityName(recipeId)) {
          ora().fail('Invalid recipe ID. Use only alphanumeric characters, dashes, and underscores.');
          process.exit(1);
        }

        const recipeDir = resolveMlspecPath(projectPath, 'recipes', recipeId);
        if (fs.existsSync(recipeDir)) {
          ora().fail(`Recipe '${recipeId}' already exists`);
          process.exit(1);
        }

        const tagResult = RecipeTagSchema.safeParse(options.tag || 'candidate');
        if (!tagResult.success) {
          ora().fail(`Invalid tag '${options.tag}'. Must be one of: ${RecipeTagSchema.options.join(', ')}`);
          process.exit(1);
        }

        const expMeta = loadExperimentMetadata(projectPath, experiment);
        if (!expMeta) {
          ora().fail(`Failed to load experiment metadata for '${experiment}'`);
          process.exit(1);
        }

        // Check for evidence gaps - warn if evidence plan stages are missing
        const evidenceDir = resolveMlspecPath(projectPath, 'experiments', experiment, 'evidence');
        const evidencePlan = expMeta.evidence_plan || [];
        const missingStages: string[] = [];

        for (const stage of evidencePlan) {
          const stagePath = path.join(evidenceDir, `${stage}.md`);
          if (!fs.existsSync(stagePath)) {
            missingStages.push(stage);
          }
        }

        // Prevent re-resolving already resolved experiments
        if (expMeta.status === 'resolved') {
          ora().fail(`Experiment '${experiment}' is already resolved. Use 'mlspec retry' to re-run a resolved experiment.`);
          process.exit(1);
        }

        // Create recipe directory and recipe.yaml
        await fsp.mkdir(recipeDir, { recursive: true });

        // Determine config: use --config file, or copy from base_recipe with TODO marker
        let recipeConfig: Record<string, unknown> = {};
        let configSource = '';

        if (options.config) {
          // User provided config file - use it directly
          const configPath = path.resolve(options.config);
          if (!fs.existsSync(configPath)) {
            ora().fail(`Config file '${options.config}' not found`);
            process.exit(1);
          }
          try {
            const configContent = fs.readFileSync(configPath, 'utf-8');
            const parsed = parseYaml(configContent);
            recipeConfig = parsed as Record<string, unknown>;
            configSource = ` (copied from ${options.config})`;
          } catch (error) {
            ora().fail(`Failed to parse config file: ${(error as Error).message}`);
            process.exit(1);
          }
        } else {
          // No config provided - copy from base_recipe and add TODO marker
          const baseRecipePath = resolveMlspecPath(projectPath, 'recipes', expMeta.base_recipe, 'recipe.yaml');
          if (fs.existsSync(baseRecipePath)) {
            try {
              const baseContent = fs.readFileSync(baseRecipePath, 'utf-8');
              const baseParsed = parseYaml(baseContent) as Record<string, unknown>;
              recipeConfig = {
                ...(baseParsed.config || {}),
                // TODO marker - this config was copied from base and needs review
                _TODO_review_required: `This config was copied from ${expMeta.base_recipe}. Update it to match the proposed_change: "${expMeta.proposed_change || 'unknown'}"`,
              };
              configSource = ` (copied from ${expMeta.base_recipe} with TODO - must review)`;
            } catch {
              // Fallback to empty config if base recipe can't be read
              recipeConfig = {
                _TODO_review_required: `Config must be created to match proposed_change: "${expMeta.proposed_change || 'unknown'}"`,
              };
              configSource = ' (TODO - must create config)';
            }
          } else {
            recipeConfig = {
              _TODO_review_required: `Config must be created to match proposed_change: "${expMeta.proposed_change || 'unknown'}"`,
            };
            configSource = ' (TODO - must create config)';
          }
        }

        const recipeFrontmatter = {
          entity_type: 'recipe',
          schema: 'ml-experiment-v2',
          id: recipeId,
          name: recipeId,
          tags: [tagResult.data],
          parent_recipe: expMeta.base_recipe,
          created_by_experiment: experiment,
          config: recipeConfig,
          created: getCurrentDate(),
        };
        await fsp.writeFile(
          path.join(recipeDir, 'recipe.yaml'),
          `# Recipe: ${recipeId}\n\n${stringify(recipeFrontmatter)}`
        );

        // Create summary.md
        await fsp.writeFile(
          path.join(recipeDir, 'summary.md'),
          `# Recipe: ${recipeId}\n\n## Overview\n\n- **Parent**: ${expMeta.base_recipe}\n- **Created from**: ${experiment}\n\n## Summary\n\n_Describe this recipe's purpose and key characteristics._\n`
        );

        // Set experiment status to resolved
        const experimentPath = resolveMlspecPath(projectPath, 'experiments', experiment, 'experiment.yaml');
        expMeta.status = 'resolved';
        await fsp.writeFile(experimentPath, `# Experiment: ${experiment}\n\n${stringify(expMeta)}`);

        // Create resolution.md
        const resolutionPath = resolveMlspecPath(projectPath, 'experiments', experiment, 'resolution.md');
        const resolutionFrontmatter: Record<string, unknown> = {
          entity_type: 'resolution',
          experiment_id: experiment,
          resolution: 'accept',
          accepted_recipe: recipeId,
          accepted_tags: [tagResult.data],
          rationale: '_Explain why this experiment was accepted_',
          created: getCurrentDate(),
        };

        await fsp.writeFile(
          resolutionPath,
          `---\n${stringify(resolutionFrontmatter)}---\n\n# Resolution: ${experiment}\n\n## Decision: Accept\n\n**Created Recipe**: ${recipeId}\n**Tags**: ${tagResult.data}\n\n## Rationale\n\n_Why was this experiment accepted? What evidence supported it?_\n\n## Supporting Evidence\n\n- _List evidence files that informed this decision_\n\n---\n\n_Resolution made on: ${getCurrentDate()}_
`
        );

        spinner.succeed(`Accepted experiment '${experiment}' and created recipe '${recipeId}'`);
        if (missingStages.length > 0) {
          console.log(`  Note: Evidence gaps: missing ${missingStages.join(', ')} stages`);
        }
      } catch (error) {
        ora().fail(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // ml reject <experiment> --reason <reason>
  program
    .command('reject <experiment>')
    .description('Reject an experiment')
    .requiredOption('--reason <reason>', 'Reason for rejection')
    .action(async (experiment: string, options: { reason: string }) => {
      try {
        const projectPath = process.cwd();

        if (!mlspecWorkspaceExists(projectPath)) {
          ora().fail('MLSpec workspace not found. Run "mlspec init" first.');
          process.exit(1);
        }

        if (!experimentExists(projectPath, experiment)) {
          ora().fail(`Experiment '${experiment}' not found`);
          process.exit(1);
        }

        const expMeta = loadExperimentMetadata(projectPath, experiment);
        if (!expMeta) {
          ora().fail(`Failed to load experiment metadata for '${experiment}'`);
          process.exit(1);
        }

        // Check if experiment is already resolved
        if (expMeta.status === 'resolved') {
          ora().fail(`Experiment '${experiment}' is already resolved. Use 'mlspec retry' to re-run a resolved experiment.`);
          process.exit(1);
        }

        // Update experiment status to resolved
        const experimentPath = resolveMlspecPath(projectPath, 'experiments', experiment, 'experiment.yaml');
        expMeta.status = 'resolved';
        await fsp.writeFile(experimentPath, `# Experiment: ${experiment}\n\n${stringify(expMeta)}`);

        // Create resolution.md
        const resolutionPath = resolveMlspecPath(projectPath, 'experiments', experiment, 'resolution.md');
        const resolutionFrontmatter: Record<string, unknown> = {
          entity_type: 'resolution',
          experiment_id: experiment,
          resolution: 'reject',
          rejection_reason: options.reason,
          rationale: '_Explain why this experiment was rejected_',
          created: getCurrentDate(),
        };

        await fsp.writeFile(
          resolutionPath,
          `---\n${stringify(resolutionFrontmatter)}---\n\n# Resolution: ${experiment}\n\n## Decision: Reject\n\n**Reason**: ${options.reason}\n\n## Rationale\n\n_Why was this experiment rejected? What evidence supported it?_\n\n## Supporting Evidence\n\n- _List evidence files that informed this decision_\n\n---\n\n_Resolution made on: ${getCurrentDate()}_
`
        );

        ora().succeed(`Rejected experiment '${experiment}'`);
      } catch (error) {
        ora().fail(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // ml retry <experiment> --plan <plan>
  program
    .command('retry <experiment>')
    .description('Retry an experiment with modifications')
    .requiredOption('--plan <plan>', 'Plan for retry')
    .action(async (experiment: string, options: { plan: string }) => {
      try {
        const projectPath = process.cwd();

        if (!mlspecWorkspaceExists(projectPath)) {
          ora().fail('MLSpec workspace not found. Run "mlspec init" first.');
          process.exit(1);
        }

        if (!experimentExists(projectPath, experiment)) {
          ora().fail(`Experiment '${experiment}' not found`);
          process.exit(1);
        }

        const expMeta = loadExperimentMetadata(projectPath, experiment);
        if (!expMeta) {
          ora().fail(`Failed to load experiment metadata for '${experiment}'`);
          process.exit(1);
        }

        // Prevent re-resolving already resolved experiments
        if (expMeta.status === 'resolved') {
          ora().fail(`Experiment '${experiment}' is already resolved. Use 'mlspec retry' only on running experiments or use 'mlspec new experiment' to create a new experiment.`);
          process.exit(1);
        }

        // Reset experiment status to running for retry
        const experimentPath = resolveMlspecPath(projectPath, 'experiments', experiment, 'experiment.yaml');
        expMeta.status = 'running';
        await fsp.writeFile(experimentPath, `# Experiment: ${experiment}\n\n${stringify(expMeta)}`);

        // Create resolution.md
        const resolutionPath = resolveMlspecPath(projectPath, 'experiments', experiment, 'resolution.md');
        const resolutionFrontmatter: Record<string, unknown> = {
          entity_type: 'resolution',
          experiment_id: experiment,
          resolution: 'retry',
          revisit_condition: options.plan,
          rationale: '_Explain why retrying with these modifications_',
          created: getCurrentDate(),
        };

        await fsp.writeFile(
          resolutionPath,
          `---\n${stringify(resolutionFrontmatter)}---\n\n# Resolution: ${experiment}\n\n## Decision: Retry\n\n**Plan**: ${options.plan}\n\n## Rationale\n\n_Why is this experiment being retried? What will be different?_\n\n## Supporting Evidence\n\n- _List evidence files that informed this decision_\n\n---\n\n_Resolution made on: ${getCurrentDate()}_
`
        );

        ora().succeed(`Marked experiment '${experiment}' for retry`);
      } catch (error) {
        ora().fail(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // ml hold <experiment> --reason <reason>
  program
    .command('hold <experiment>')
    .description('Hold an experiment pending other work')
    .requiredOption('--reason <reason>', 'Blocker reason')
    .action(async (experiment: string, options: { reason: string }) => {
      try {
        const projectPath = process.cwd();

        if (!mlspecWorkspaceExists(projectPath)) {
          ora().fail('MLSpec workspace not found. Run "mlspec init" first.');
          process.exit(1);
        }

        if (!experimentExists(projectPath, experiment)) {
          ora().fail(`Experiment '${experiment}' not found`);
          process.exit(1);
        }

        const expMeta = loadExperimentMetadata(projectPath, experiment);
        if (!expMeta) {
          ora().fail(`Failed to load experiment metadata for '${experiment}'`);
          process.exit(1);
        }

        // Check if experiment is already resolved
        if (expMeta.status === 'resolved') {
          ora().fail(`Experiment '${experiment}' is already resolved. Use 'mlspec retry' to re-run a resolved experiment.`);
          process.exit(1);
        }

        // Create resolution.md
        const resolutionPath = resolveMlspecPath(projectPath, 'experiments', experiment, 'resolution.md');
        const resolutionFrontmatter: Record<string, unknown> = {
          entity_type: 'resolution',
          experiment_id: experiment,
          resolution: 'hold',
          blocker: options.reason,
          revisit_condition: '_When the blocker is resolved_',
          rationale: '_Explain why this experiment is being held_',
          created: getCurrentDate(),
        };

        await fsp.writeFile(
          resolutionPath,
          `---\n${stringify(resolutionFrontmatter)}---\n\n# Resolution: ${experiment}\n\n## Decision: Hold\n\n**Blocker**: ${options.reason}\n\n## Rationale\n\n_Why is this experiment being held?_\n\n## Supporting Evidence\n\n- _List evidence files that informed this decision_\n\n---\n\n_Resolution made on: ${getCurrentDate()}_
`
        );

        ora().succeed(`Marked experiment '${experiment}' as held`);
      } catch (error) {
        ora().fail(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // ml inconclusive <experiment> --reason <reason>
  program
    .command('inconclusive <experiment>')
    .description('Mark an experiment as inconclusive')
    .requiredOption('--reason <reason>', 'Reason for inconclusive')
    .action(async (experiment: string, options: { reason: string }) => {
      try {
        const projectPath = process.cwd();

        if (!mlspecWorkspaceExists(projectPath)) {
          ora().fail('MLSpec workspace not found. Run "mlspec init" first.');
          process.exit(1);
        }

        if (!experimentExists(projectPath, experiment)) {
          ora().fail(`Experiment '${experiment}' not found`);
          process.exit(1);
        }

        const expMeta = loadExperimentMetadata(projectPath, experiment);
        if (!expMeta) {
          ora().fail(`Failed to load experiment metadata for '${experiment}'`);
          process.exit(1);
        }

        // Check if experiment is already resolved
        if (expMeta.status === 'resolved') {
          ora().fail(`Experiment '${experiment}' is already resolved. Use 'mlspec retry' to re-run a resolved experiment.`);
          process.exit(1);
        }

        // Create resolution.md
        const resolutionPath = resolveMlspecPath(projectPath, 'experiments', experiment, 'resolution.md');
        const resolutionFrontmatter: Record<string, unknown> = {
          entity_type: 'resolution',
          experiment_id: experiment,
          resolution: 'inconclusive',
          uncertainty_reason: options.reason,
          rationale: '_Explain why this experiment is inconclusive_',
          created: getCurrentDate(),
        };

        await fsp.writeFile(
          resolutionPath,
          `---\n${stringify(resolutionFrontmatter)}---\n\n# Resolution: ${experiment}\n\n## Decision: Inconclusive\n\n**Reason**: ${options.reason}\n\n## Rationale\n\n_Why is this experiment inconclusive? What additional evidence is needed?_\n\n## Supporting Evidence\n\n- _List evidence files that informed this decision_\n\n---\n\n_Resolution made on: ${getCurrentDate()}_
`
        );

        ora().succeed(`Marked experiment '${experiment}' as inconclusive`);
      } catch (error) {
        ora().fail(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // ==========================================================================
  // Graph Commands (2.5)
  // ==========================================================================

  // ml graph [--format text|mermaid|dot]
  program
    .command('graph')
    .description('Show recipe-experiment graph')
    .option('--format <format>', 'Output format (text, mermaid, dot)', 'text')
    .action(async (options: { format?: string }) => {
      try {
        const projectPath = process.cwd();

        if (!mlspecWorkspaceExists(projectPath)) {
          ora().fail('MLSpec workspace not found. Run "mlspec init" first.');
          process.exit(1);
        }

        const recipes = listRecipes(projectPath);
        const experiments = listExperiments(projectPath);
        const allRecipes = loadAllRecipes(projectPath);

        if (options.format === 'mermaid') {
          console.log('\n```mermaid\ngraph TD\n');
          for (const recipeId of recipes) {
            console.log(`  R_${recipeId}[${recipeId}]`);
          }
          for (const expId of experiments) {
            const expMeta = loadExperimentMetadata(projectPath, expId);
            if (expMeta) {
              console.log(`  E_${expId}[${expId}]`);
              console.log(`  R_${expMeta.base_recipe} --> E_${expId}`);
              console.log(`  E_${expId} --> R_${expMeta.proposed_recipe}`);
            }
          }
          console.log('```\n');
        } else if (options.format === 'dot') {
          console.log('digraph MLSpec {');
          console.log('  rankdir=LR;');
          console.log('  node [shape=box];');
          for (const recipeId of recipes) {
            console.log(`  "${recipeId}" [label="${recipeId}"];`);
          }
          for (const expId of experiments) {
            const expMeta = loadExperimentMetadata(projectPath, expId);
            if (expMeta) {
              console.log(`  "${expId}" [shape=diamond];`);
              console.log(`  "${expMeta.base_recipe}" -> "${expId}";`);
              console.log(`  "${expId}" -> "${expMeta.proposed_recipe}";`);
            }
          }
          console.log('}');
        } else {
          // text format
          console.log('\n# Recipe-Experiment Graph\n');

          console.log('## Recipes\n');
          for (const recipeId of recipes) {
            const meta = allRecipes.get(recipeId);
            const tagsStr = meta?.tags?.length ? ` [${meta.tags.join(', ')}]` : '';
            const parentStr = meta?.parent_recipe ? ` (from: ${meta.parent_recipe})` : ' (root)';
            console.log(`  ${recipeId}${tagsStr}${parentStr}`);
          }

          console.log('\n## Experiments\n');
          for (const expId of experiments) {
            const expMeta = loadExperimentMetadata(projectPath, expId);
            if (expMeta) {
              console.log(`  ${expId}: ${expMeta.base_recipe} → ${expMeta.proposed_recipe} [${expMeta.status}]`);
            }
          }
          console.log();
        }
      } catch (error) {
        ora().fail(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // ml lineage <recipe-id>
  program
    .command('lineage <recipeId>')
    .description('Show recipe ancestry')
    .action(async (recipeId: string) => {
      try {
        const projectPath = process.cwd();

        if (!mlspecWorkspaceExists(projectPath)) {
          ora().fail('MLSpec workspace not found. Run "mlspec init" first.');
          process.exit(1);
        }

        const recipePath = resolveMlspecPath(projectPath, 'recipes', recipeId, 'recipe.yaml');
        if (!fs.existsSync(recipePath)) {
          ora().fail(`Recipe '${recipeId}' not found`);
          process.exit(1);
        }

        const lineage: string[] = [];
        let currentId: string | null = recipeId;

        while (currentId) {
          lineage.push(currentId);
          const meta = loadRecipeMetadata(projectPath, currentId);
          if (!meta || !meta.parent_recipe) break;
          currentId = meta.parent_recipe;
        }

        console.log('\n# Recipe Lineage\n');
        console.log(lineage.reverse().join(' → '));
        console.log();
      } catch (error) {
        ora().fail(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // ml next
  program
    .command('next')
    .description('Read-only router for next action')
    .option('--json', 'Output machine-readable JSON')
    .action(async (options: { json?: boolean }) => {
      try {
        const projectPath = process.cwd();

        if (!mlspecWorkspaceExists(projectPath)) {
          if (options.json) {
            console.log(JSON.stringify({ error: 'MLSpec workspace not found. Run "mlspec init" first.' }, null, 2));
            process.exit(1);
          }
          ora().fail('MLSpec workspace not found. Run "mlspec init" first.');
          process.exit(1);
        }

        const experiments = listExperiments(projectPath);
        const allRecipes = loadAllRecipes(projectPath);
        const currentBestRecipes: string[] = [];

        for (const [recipeId, meta] of allRecipes) {
          if (meta?.tags?.includes('current-best')) {
            currentBestRecipes.push(recipeId);
          }
        }

        const actions: Array<{
          priority: number;
          action_type: 'explore' | 'propose' | 'run' | 'resolve' | 'bootstrap' | 'none';
          suggested_command: string;
          reason: string;
          target?: { type: 'experiment' | 'recipe'; id: string };
        }> = [];

        let priority = 1;

        // Bootstrap detection: empty workspace
        if (experiments.length === 0 && allRecipes.size === 0) {
          actions.push({
            priority,
            action_type: 'bootstrap',
            suggested_command: '/mlspec-explore',
            reason: 'No baseline recipe exists yet. The MLSpec workspace is empty.',
          });
          priority++;
        }

        for (const expId of experiments) {
          const expMeta = loadExperimentMetadata(projectPath, expId);
          if (!expMeta) continue;

          if (expMeta.status === 'draft') {
            actions.push({
              priority,
              action_type: 'none',
              suggested_command: `mlspec set-status ${expId} running`,
              reason: `Experiment '${expId}' is in draft status`,
              target: { type: 'experiment', id: expId },
            });
            priority++;
            continue;
          }

          if (expMeta.status === 'running') {
            // Check abort criteria FIRST (priority per 2.5.6)
            if (expMeta.abort_criteria && expMeta.abort_criteria.length > 0) {
              actions.push({
                priority,
                action_type: 'run',
                suggested_command: `mlspec add-evidence ${expId} --stage smoke`,
                reason: `Experiment '${expId}' has abort criteria that need verification`,
                target: { type: 'experiment', id: expId },
              });
              priority++;
            }

            // Check for missing evidence
            const expDir = resolveMlspecPath(projectPath, 'experiments', expId);
            for (const stage of EvidenceStageSchema.options) {
              const evidencePath = path.join(expDir, 'evidence', `${stage}.md`);
              if (!fs.existsSync(evidencePath)) {
                actions.push({
                  priority,
                  action_type: 'run',
                  suggested_command: `mlspec add-evidence ${expId} --stage ${stage}`,
                  reason: `Experiment '${expId}' needs ${stage} evidence`,
                  target: { type: 'experiment', id: expId },
                });
                priority++;
                break;
              }
            }
          }

          if (expMeta.status === 'resolved') {
            // Check if resolution exists
            const resolutionPath = resolveMlspecPath(projectPath, 'experiments', expId, 'resolution.md');
            if (!fs.existsSync(resolutionPath)) {
              actions.push({
                priority,
                action_type: 'resolve',
                suggested_command: `mlspec resolve ${expId}`,
                reason: `Experiment '${expId}' is resolved but missing resolution.md`,
                target: { type: 'experiment', id: expId },
              });
              priority++;
            }
          }
        }

        // Sort actions by ascending priority
        actions.sort((a, b) => a.priority - b.priority);

        if (options.json) {
          const output = {
            workspace_state: {
              recipes_count: allRecipes.size,
              experiments_count: experiments.length,
              current_best_recipes: currentBestRecipes,
              current_best_recipe: currentBestRecipes.length === 1 ? currentBestRecipes[0] : null,
            },
            actions,
          };
          console.log(JSON.stringify(output, null, 2));
          return;
        }

        // Human-readable output (default)
        console.log('\n# Next Actions\n');
        if (actions.length === 0) {
          console.log('  (no pending actions)');
        } else {
          for (const action of actions) {
            console.log(`  - ${action.suggested_command}: ${action.reason}`);
          }
        }
        console.log();
      } catch (error) {
        if (options.json) {
          console.log(JSON.stringify({ error: (error as Error).message }, null, 2));
          process.exit(1);
        }
        ora().fail(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // ==========================================================================
  // Status Command
  // ==========================================================================

  program
    .command('status')
    .description('Show MLSpec workspace status')
    .option('--json', 'Output machine-readable JSON')
    .option('--experiment <id>', 'Show experiment-specific status (requires --json)')
    .action(async (options: { json?: boolean; experiment?: string }) => {
      try {
        const projectPath = process.cwd();

        if (!mlspecWorkspaceExists(projectPath)) {
          if (options.json) {
            console.log(JSON.stringify({ error: 'MLSpec workspace not found. Run "mlspec init" first.' }, null, 2));
            process.exit(1);
          }
          ora().fail('MLSpec workspace not found. Run "mlspec init" first.');
          process.exit(1);
        }

        // Experiment-specific status (JSON-only)
        if (options.experiment) {
          if (!options.json) {
            console.log(JSON.stringify({ error: 'This command requires --json flag', experiment_id: options.experiment }, null, 2));
            process.exit(1);
          }

          const experimentId = options.experiment;
          if (!experimentExists(projectPath, experimentId)) {
            console.log(JSON.stringify({ error: `Experiment '${experimentId}' not found`, experiment_id: experimentId }, null, 2));
            process.exit(1);
          }

          const expMeta = loadExperimentMetadata(projectPath, experimentId);
          if (!expMeta) {
            console.log(JSON.stringify({ error: `Experiment '${experimentId}' not found`, experiment_id: experimentId }, null, 2));
            process.exit(1);
          }

          const expDir = resolveMlspecPath(projectPath, 'experiments', experimentId);
          const evidenceStages: Record<string, { exists: boolean; path: string | null; recommendation: string | null }> = {};
          const missingStages: string[] = [];

          for (const stage of EvidenceStageSchema.options) {
            const evidencePath = path.join(expDir, 'evidence', `${stage}.md`);
            if (fs.existsSync(evidencePath)) {
              try {
                const content = fs.readFileSync(evidencePath, 'utf-8');
                const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
                if (frontmatterMatch) {
                  const parsed = parseYaml(frontmatterMatch[1]) as EvidenceFrontmatter;
                  evidenceStages[stage] = {
                    exists: true,
                    path: evidencePath,
                    recommendation: parsed.recommendation || null,
                  };
                } else {
                  evidenceStages[stage] = { exists: true, path: evidencePath, recommendation: null };
                }
              } catch {
                evidenceStages[stage] = { exists: true, path: evidencePath, recommendation: null };
              }
            } else {
              evidenceStages[stage] = { exists: false, path: null, recommendation: null };
              missingStages.push(stage);
            }
          }

          const hasRecommendation = Object.values(evidenceStages).some(s => s.exists && s.recommendation);
          const readyToResolve = expMeta.status !== 'resolved' && hasRecommendation;

          const output = {
            experiment_id: experimentId,
            status: expMeta.status,
            base_recipe: expMeta.base_recipe,
            proposed_recipe: expMeta.proposed_recipe,
            evidence_stages: evidenceStages,
            missing_stages: missingStages,
            has_recommendation: hasRecommendation,
            ready_to_resolve: readyToResolve,
          };
          console.log(JSON.stringify(output, null, 2));
          return;
        }

        // General status
        if (options.json) {
          const recipes = listRecipes(projectPath);
          const allRecipes = loadAllRecipes(projectPath);
          const currentBestRecipes: string[] = [];
          for (const [recipeId, meta] of allRecipes) {
            if (meta?.tags?.includes('current-best')) {
              currentBestRecipes.push(recipeId);
            }
          }

          const experiments = listExperiments(projectPath);
          const grouped: Record<string, string[]> = { draft: [], running: [], resolved: [] };
          for (const experiment of experiments) {
            const expMeta = loadExperimentMetadata(projectPath, experiment);
            if (expMeta) {
              grouped[expMeta.status || 'draft'].push(experiment);
            }
          }

          const output = {
            recipes: recipes.map(id => ({
              id,
              tags: allRecipes.get(id)?.tags || [],
              has_metrics: !!allRecipes.get(id)?.metrics && Object.keys(allRecipes.get(id)?.metrics || {}).length > 0,
            })),
            experiments: {
              total: experiments.length,
              by_status: grouped,
            },
            current_best_recipes: currentBestRecipes,
            current_best_recipe: currentBestRecipes.length === 1 ? currentBestRecipes[0] : null,
            warnings: [] as string[],
            errors: [] as string[],
          };
          console.log(JSON.stringify(output, null, 2));
          return;
        }

        // Human-readable output (default)
        console.log('\n# MLSpec Status\n');

        const recipes = listRecipes(projectPath);
        console.log(`## Recipes (${recipes.length})`);
        if (recipes.length === 0) {
          console.log('  (none)');
        } else {
          const allRecipes = loadAllRecipes(projectPath);
          for (const recipeId of recipes) {
            const meta = allRecipes.get(recipeId);
            const superseded = meta?.tags?.includes('archived') ? ' (archived)' : '';
            console.log(`  - ${recipeId}${superseded}`);
          }
        }
        console.log();

        const experiments = listExperiments(projectPath);
        if (experiments.length === 0) {
          console.log('## Experiments (0)');
          console.log('  (none)');
          console.log();
        } else {
          const grouped: Record<string, string[]> = {
            draft: [],
            running: [],
            resolved: [],
          };

          for (const experiment of experiments) {
            const expMeta = loadExperimentMetadata(projectPath, experiment);
            if (expMeta) {
              grouped[expMeta.status || 'draft'].push(experiment);
            }
          }

          console.log(`## Experiments (${experiments.length})\n`);

          for (const [status, exps] of Object.entries(grouped)) {
            if (exps.length > 0) {
              console.log(`${status}:`);
              for (const exp of exps) {
                const expMeta = loadExperimentMetadata(projectPath, exp);
                const evidenceStages: string[] = [];
                const expDir = resolveMlspecPath(projectPath, 'experiments', exp);
                for (const stage of EvidenceStageSchema.options) {
                  if (fs.existsSync(path.join(expDir, 'evidence', `${stage}.md`))) {
                    evidenceStages.push(stage);
                  }
                }
                console.log(`  - ${exp} (${expMeta?.base_recipe || '?'} → ${expMeta?.proposed_recipe || '?'}, evidence: ${evidenceStages.join(', ') || 'none'})`);
              }
              console.log();
            }
          }
        }
      } catch (error) {
        if (options.json) {
          console.log(JSON.stringify({ error: (error as Error).message }, null, 2));
          process.exit(1);
        }
        ora().fail(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // ==========================================================================
  // Validate Command (V2)
  // ==========================================================================

  program
    .command('validate')
    .description('Validate MLSpec workspace structure (V2)')
    .option('--strict', 'Enable strict validation (warnings as errors)')
    .action(async (options: { strict?: boolean }) => {
      try {
        const projectPath = process.cwd();
        const spinner = ora('Validating MLSpec workspace...').start();

        if (!mlspecWorkspaceExists(projectPath)) {
          ora().fail('MLSpec workspace not found. Run "mlspec init" first.');
          process.exit(1);
        }

        const errors: string[] = [];
        const warnings: string[] = [];

        // Check workspace version
        const workspacePath = resolveMlspecPath(projectPath, '.workspace.yaml');
        if (!fs.existsSync(workspacePath)) {
          errors.push('Missing .workspace.yaml');
        } else {
          try {
            const content = fs.readFileSync(workspacePath, 'utf-8');
            const parsed = parseYaml(content);
            if (parsed.workspace_version !== 2) {
              errors.push('Workspace is not V2 (workspace_version must be 2)');
            }
          } catch {
            errors.push('Failed to parse .workspace.yaml');
          }
        }

        // Check evaluation.md
        const evaluationPath = resolveMlspecPath(projectPath, 'evaluation.md');
        if (!fs.existsSync(evaluationPath)) {
          errors.push('Missing evaluation.md');
        }

        // Validate recipes
        const recipes = listRecipes(projectPath);
        const recipeIds = new Set<string>();
        for (const recipeId of recipes) {
          const recipeDir = resolveMlspecPath(projectPath, 'recipes', recipeId);
          const metaPath = path.join(recipeDir, 'recipe.yaml');

          if (!fs.existsSync(metaPath)) {
            errors.push(`Recipe '${recipeId}': missing recipe.yaml`);
          } else {
            try {
              const content = fs.readFileSync(metaPath, 'utf-8');
              const parsed = parseYaml(content);
              const result = RecipeMetadataSchema.safeParse(parsed);
              if (!result.success) {
                errors.push(`Recipe '${recipeId}': invalid recipe.yaml - ${result.error.message}`);
              } else {
                // Check for duplicate IDs
                if (recipeIds.has(result.data.id)) {
                  errors.push(`Recipe '${recipeId}': duplicate recipe ID`);
                }
                recipeIds.add(result.data.id);

                // Check parent exists
                if (result.data.parent_recipe && !recipes.includes(result.data.parent_recipe)) {
                  errors.push(`Recipe '${recipeId}': parent_recipe '${result.data.parent_recipe}' does not exist`);
                }

                // Check for cycle in parent chain
                const visited = new Set<string>();
                let current: string | null | undefined = result.data.parent_recipe;
                while (current) {
                  if (visited.has(current)) {
                    errors.push(`Recipe '${recipeId}': cycle detected in parent chain`);
                    break;
                  }
                  visited.add(current);
                  const parentMeta = loadRecipeMetadata(projectPath, current);
                  current = parentMeta?.parent_recipe || null;
                }

                // Warn on multiple current-best tags
                if (result.data.tags?.includes('current-best')) {
                  const currentBestCount = recipes.filter((r) => {
                    const meta = loadRecipeMetadata(projectPath, r);
                    return meta?.tags?.includes('current-best');
                  });
                  if (currentBestCount.length > 1) {
                    warnings.push(`Multiple recipes have 'current-best' tag (${currentBestCount.join(', ')})`);
                  }
                }
              }
            } catch {
              errors.push(`Recipe '${recipeId}': failed to parse recipe.yaml`);
            }
          }
        }

        // Validate experiments
        for (const experiment of listExperiments(projectPath)) {
          const experimentDir = resolveMlspecPath(projectPath, 'experiments', experiment);
          const metaPath = path.join(experimentDir, 'experiment.yaml');
          const hypothesisPath = path.join(experimentDir, 'hypothesis.md');

          if (!fs.existsSync(metaPath)) {
            errors.push(`Experiment '${experiment}': missing experiment.yaml`);
          } else {
            try {
              const content = fs.readFileSync(metaPath, 'utf-8');
              const parsed = parseYaml(content);
              const result = ExperimentMetadataSchema.safeParse(parsed);
              if (!result.success) {
                errors.push(`Experiment '${experiment}': invalid experiment.yaml - ${result.error.message}`);
              } else {
                // Check base_recipe exists
                if (!recipeIds.has(result.data.base_recipe)) {
                  errors.push(`Experiment '${experiment}': base_recipe '${result.data.base_recipe}' does not exist`);
                }

                // Check proposed_recipe format (it may not exist yet, just validate format)
                if (!isValidEntityName(result.data.proposed_recipe)) {
                  errors.push(`Experiment '${experiment}': proposed_recipe '${result.data.proposed_recipe}' is not a valid entity name`);
                }
              }
            } catch {
              errors.push(`Experiment '${experiment}': failed to parse experiment.yaml`);
            }
          }

          if (!fs.existsSync(hypothesisPath)) {
            errors.push(`Experiment '${experiment}': missing hypothesis.md`);
          }

          // Validate evidence stages
          for (const stage of EvidenceStageSchema.options) {
            const evidencePath = path.join(experimentDir, 'evidence', `${stage}.md`);
            if (fs.existsSync(evidencePath)) {
              try {
                const content = fs.readFileSync(evidencePath, 'utf-8');
                const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
                if (frontmatterMatch) {
                  const parsed = parseYaml(frontmatterMatch[1]);
                  const result = EvidenceFrontmatterSchema.safeParse(parsed);
                  if (!result.success) {
                    errors.push(`Experiment '${experiment}' evidence ${stage}: ${result.error.message}`);
                  }
                } else {
                  errors.push(`Experiment '${experiment}' evidence ${stage}: missing frontmatter`);
                }
              } catch {
                errors.push(`Experiment '${experiment}' evidence ${stage}: failed to parse`);
              }
            }
          }

          // Check for resolution.md if experiment is resolved
          const expMeta = loadExperimentMetadata(projectPath, experiment);
          if (expMeta?.status === 'resolved') {
            const resolutionPath = path.join(experimentDir, 'resolution.md');
            if (!fs.existsSync(resolutionPath)) {
              errors.push(`Experiment '${experiment}' is resolved but missing resolution.md`);
            } else {
              try {
                const content = fs.readFileSync(resolutionPath, 'utf-8');
                const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
                if (frontmatterMatch) {
                  const parsed = parseYaml(frontmatterMatch[1]);
                  const result = ResolutionFrontmatterSchema.safeParse(parsed);
                  if (!result.success) {
                    errors.push(`Experiment '${experiment}' resolution: ${result.error.message}`);
                  }
                  // Warn on acceptance based on evidence level and target tag
                  if (parsed.resolution === 'accept') {
                    const hasValidation = fs.existsSync(path.join(experimentDir, 'evidence', 'validation.md'));
                    const hasFinal = fs.existsSync(path.join(experimentDir, 'evidence', 'final.md'));
                    const acceptedTags = parsed.accepted_tags || [];
                    const isCurrentBest = acceptedTags.includes('current-best');

                    if (!hasValidation && !hasFinal) {
                      // smoke evidence only
                      if (isCurrentBest) {
                        warnings.push(`Experiment '${experiment}': Strong warning: accepting as current-best from smoke evidence`);
                      } else {
                        warnings.push(`Experiment '${experiment}': Accepting as candidate from smoke evidence is premature`);
                      }
                    } else if (hasFinal && isCurrentBest) {
                      warnings.push(`Experiment '${experiment}': Final evidence provides strongest support for current-best`);
                    }
                  }
                }
              } catch {
                errors.push(`Experiment '${experiment}' resolution: failed to parse`);
              }
            }
          }
        }

        spinner.stop();

        if (errors.length > 0) {
          console.log('\n## Errors\n');
          for (const error of errors) {
            console.log(`  ✗ ${error}`);
          }
        }

        if (warnings.length > 0) {
          console.log('\n## Warnings\n');
          for (const warning of warnings) {
            console.log(`  ⚠ ${warning}`);
          }
        }

        if (errors.length === 0) {
          ora().succeed('MLSpec workspace is valid');
          if (warnings.length > 0) {
            console.log(`  ${warnings.length} warning(s) - use --strict to treat warnings as errors`);
            if (options.strict) {
              ora().fail('Strict validation failed due to warnings');
              process.exit(1);
            }
          }
        } else {
          ora().fail(`MLSpec workspace has ${errors.length} error(s)`);
          process.exit(1);
        }
      } catch (error) {
        ora().fail(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });
}

/**
 * Register MLSpec commands under an 'ml' subcommand (for openspec ml compatibility).
 */
export function registerMlspecSubcommand(program: Command): void {
  const mlCmd = program
    .command('ml')
    .description('ML experimentation workflow commands');

  // Re-use all the same command registration logic, but on mlCmd
  registerMlspecCommands(mlCmd);
}