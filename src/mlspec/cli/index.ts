/**
 * MLSpec CLI Command Registration (V3)
 *
 * Provides two registration functions:
 * - registerMlspecCommands(program): Registers commands directly on program (for standalone mlspec binary)
 * - registerMlspecSubcommand(program): Registers 'ml' subcommand (for openspec ml compatibility)
 *
 * V3 Commands:
 * - Recipe: new recipe, tag, untag, list recipes, show recipe, diff
 * - Experiment: new experiment (--from, --proposes required), set-status
 * - Evidence: show evidence (read-only)
 * - Validation: validate (V3 protocol/prepare/rung-based structure)
 * - prepare: validates prepare.md artifact
 * - run: preflight gate checker for rung evidence
 * - resolve: preflight gate checker for experiment resolution
 *
 * V3 Workflow: propose → prepare → run (evidence ladder) → resolve
 */

import { Command } from "commander";
import path from "path";
import {
  MLSPEC_DIR,
  resolveMlspecPath,
  createMlspecWorkspace,
  mlspecWorkspaceExists,
  getCurrentDate,
  isValidEntityName,
} from "../utils.js";
import {
  RecipeMetadataSchema,
  ExperimentMetadataSchema,
  ExperimentStatusSchema,
  ResolutionFrontmatterSchema,
  ResolutionTypeSchema,
  RecipeTagSchema,
  ProtocolMetadataSchema,
  PrepareMetadataSchema,
  RungEvidenceSchema,
  type RecipeMetadata,
  type ExperimentMetadata,
  type RecipeTag,
  type ProtocolMetadata,
  type PrepareMetadata,
  type RungEvidence,
  type ResolutionFrontmatter,
} from "../entity-types.js";
import {
  experimentExists,
  recipeExists,
  loadExperimentMetadata,
  loadRecipeMetadata,
  listExperiments,
  listRecipes,
  listRecipeTags,
  loadAllRecipes,
  protocolExists,
  prepareExists,
  loadProtocolMetadata,
  loadPrepareMetadata,
  getEvidenceLadder,
  getRungEvidencePath,
} from "../reference-resolver.js";
import { parse as parseYaml, stringify } from "yaml";
import ora from "ora";
import * as fs from "fs";
import { promises as fsp } from "fs";
import { MlspecInitCommand } from "./mlspec-init.js";
import { MlspecUpdateCommand } from "./mlspec-update.js";

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
    .command("init")
    .description("Initialize MLSpec workspace in the current project");

  initCmd.option(
    "--tools <tools>",
    "Configure AI tools non-interactively (comma-separated)"
  );
  initCmd.option(
    "--no-tools",
    "Create workspace only without tool integrations"
  );
  initCmd.option("--interactive", "Enable interactive prompts");
  initCmd.option("--force", "Auto-cleanup existing files without prompting");

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
    .command("update")
    .description("Update MLSpec skills and commands for configured tools");

  updateCmd.option(
    "--tools <tools>",
    "Update specific AI tools (comma-separated)"
  );
  updateCmd.option("--force", "Force update even when tools are up to date");

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

  const recipeCmd = program
    .command("new")
    .description("Create new MLSpec entities");

  // ml new recipe <id> [--tag <tag>]
  recipeCmd
    .command("recipe <id>")
    .description("Create a new recipe entity")
    .option(
      "--tag <tag>",
      "Initial tag for the recipe (baseline, candidate, current-best, variant)"
    )
    .action(async (id: string, options: { tag?: string }) => {
      try {
        const projectPath = process.cwd();

        if (!mlspecWorkspaceExists(projectPath)) {
          ora().fail('MLSpec workspace not found. Run "mlspec init" first.');
          process.exit(1);
        }

        if (!isValidEntityName(id)) {
          ora().fail(
            "Invalid recipe ID. Use only alphanumeric characters, dashes, and underscores."
          );
          process.exit(1);
        }

        const recipeDir = resolveMlspecPath(projectPath, "recipes", id);
        if (fs.existsSync(recipeDir)) {
          ora().fail(`Recipe '${id}' already exists`);
          process.exit(1);
        }

        const tags: RecipeTag[] = [];
        if (options.tag) {
          const tagResult = RecipeTagSchema.safeParse(options.tag);
          if (!tagResult.success) {
            ora().fail(
              `Invalid tag '${
                options.tag
              }'. Must be one of: ${RecipeTagSchema.options.join(", ")}`
            );
            process.exit(1);
          }
          tags.push(tagResult.data);
        }

        await fsp.mkdir(recipeDir, { recursive: true });

        const metadata: Record<string, unknown> = {
          entity_type: "recipe",
          schema: "ml-experiment-v3",
          id,
          name: id,
          tags,
          parent_recipe: null,
          created_by_experiment: null,
          created: getCurrentDate(),
        };

        await fsp.writeFile(
          path.join(recipeDir, "recipe.yaml"),
          `# Recipe: ${id}\n\n${stringify(metadata)}`
        );

        await fsp.writeFile(
          path.join(recipeDir, "recipe.md"),
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
    .command("tag")
    .description("Tag operations for recipes")
    .command("recipe <id> <tag>")
    .description("Add a tag to a recipe")
    .action(async (id: string, tag: string) => {
      try {
        const projectPath = process.cwd();

        if (!mlspecWorkspaceExists(projectPath)) {
          ora().fail('MLSpec workspace not found. Run "mlspec init" first.');
          process.exit(1);
        }

        const recipePath = resolveMlspecPath(
          projectPath,
          "recipes",
          id,
          "recipe.yaml"
        );
        if (!fs.existsSync(recipePath)) {
          ora().fail(`Recipe '${id}' not found`);
          process.exit(1);
        }

        const tagResult = RecipeTagSchema.safeParse(tag);
        if (!tagResult.success) {
          ora().fail(
            `Invalid tag '${tag}'. Must be one of: ${RecipeTagSchema.options.join(
              ", "
            )}`
          );
          process.exit(1);
        }

        const content = fs.readFileSync(recipePath, "utf-8");
        const parsed = parseYaml(content) as RecipeMetadata;

        if (parsed.tags && parsed.tags.includes(tagResult.data)) {
          ora().fail(`Recipe '${id}' already has tag '${tag}'`);
          process.exit(1);
        }

        parsed.tags = [...(parsed.tags || []), tagResult.data];

        await fsp.writeFile(
          recipePath,
          `# Recipe: ${id}\n\n${stringify(parsed)}`
        );

        ora().succeed(`Added tag '${tag}' to recipe '${id}'`);
      } catch (error) {
        ora().fail(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // ml untag recipe <id> <tag>
  program
    .command("untag")
    .description("Remove tags from recipes")
    .command("recipe <id> <tag>")
    .description("Remove a tag from a recipe")
    .action(async (id: string, tag: string) => {
      try {
        const projectPath = process.cwd();

        if (!mlspecWorkspaceExists(projectPath)) {
          ora().fail('MLSpec workspace not found. Run "mlspec init" first.');
          process.exit(1);
        }

        const recipePath = resolveMlspecPath(
          projectPath,
          "recipes",
          id,
          "recipe.yaml"
        );
        if (!fs.existsSync(recipePath)) {
          ora().fail(`Recipe '${id}' not found`);
          process.exit(1);
        }

        const tagResult = RecipeTagSchema.safeParse(tag);
        if (!tagResult.success) {
          ora().fail(
            `Invalid tag '${tag}'. Must be one of: ${RecipeTagSchema.options.join(
              ", "
            )}`
          );
          process.exit(1);
        }

        const content = fs.readFileSync(recipePath, "utf-8");
        const parsed = parseYaml(content) as RecipeMetadata;

        if (!parsed.tags || !parsed.tags.includes(tagResult.data)) {
          ora().fail(`Recipe '${id}' does not have tag '${tag}'`);
          process.exit(1);
        }

        parsed.tags = parsed.tags.filter(
          (t: RecipeTag) => t !== tagResult.data
        );

        await fsp.writeFile(
          recipePath,
          `# Recipe: ${id}\n\n${stringify(parsed)}`
        );

        ora().succeed(`Removed tag '${tag}' from recipe '${id}'`);
      } catch (error) {
        ora().fail(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // ml list recipes [--tag <tag>]
  const listCmd = program.command("list").description("List entities");
  listCmd
    .command("recipes")
    .description("List all recipes")
    .option("--tag <tag>", "Filter by tag")
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
            ora().fail(
              `Invalid tag '${
                options.tag
              }'. Must be one of: ${RecipeTagSchema.options.join(", ")}`
            );
            process.exit(1);
          }
          recipes = recipes.filter((id) => {
            const meta = loadRecipeMetadata(projectPath, id);
            return meta?.tags?.includes(tagResult.data) ?? false;
          });
        }

        console.log(`\n# Recipes (${recipes.length})\n`);

        if (recipes.length === 0) {
          console.log("  (none)");
        } else {
          for (const recipeId of recipes) {
            const meta = loadRecipeMetadata(projectPath, recipeId);
            const tagsStr = meta?.tags?.length
              ? ` [${meta.tags.join(", ")}]`
              : "";
            const parentStr = meta?.parent_recipe
              ? ` (from: ${meta.parent_recipe})`
              : "";
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
    .command("experiments")
    .description("List all experiments")
    .option("--status <status>", "Filter by status (draft, running, resolved)")
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
            ora().fail(
              `Invalid status '${
                options.status
              }'. Must be one of: ${ExperimentStatusSchema.options.join(", ")}`
            );
            process.exit(1);
          }
          experiments = experiments.filter((id) => {
            const meta = loadExperimentMetadata(projectPath, id);
            return meta?.status === statusResult.data;
          });
        }

        console.log(`\n# Experiments (${experiments.length})\n`);

        if (experiments.length === 0) {
          console.log("  (none)");
        } else {
          for (const expId of experiments) {
            const meta = loadExperimentMetadata(projectPath, expId);
            const statusStr = meta?.status || "unknown";
            console.log(`  - ${expId} [${statusStr}]`);
            if (meta?.base_recipe && meta?.proposed_recipe) {
              console.log(
                `    Base: ${meta.base_recipe} → Proposed: ${meta.proposed_recipe}`
              );
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
  const showCmd = program.command("show").description("Show entity details");
  showCmd
    .command("recipe <id>")
    .description("Show recipe details")
    .option("--json", "Output machine-readable JSON")
    .action(async (id: string, options: { json?: boolean }) => {
      try {
        const projectPath = process.cwd();

        if (!mlspecWorkspaceExists(projectPath)) {
          if (options.json) {
            console.log(
              JSON.stringify(
                {
                  error: 'MLSpec workspace not found. Run "mlspec init" first.',
                },
                null,
                2
              )
            );
            process.exit(1);
          }
          ora().fail('MLSpec workspace not found. Run "mlspec init" first.');
          process.exit(1);
        }

        const recipePath = resolveMlspecPath(
          projectPath,
          "recipes",
          id,
          "recipe.yaml"
        );
        if (!fs.existsSync(recipePath)) {
          if (options.json) {
            console.log(
              JSON.stringify({ error: `Recipe '${id}' not found` }, null, 2)
            );
            process.exit(1);
          }
          ora().fail(`Recipe '${id}' not found`);
          process.exit(1);
        }

        const content = fs.readFileSync(recipePath, "utf-8");
        const parsed = parseYaml(content) as RecipeMetadata;
        const summaryPath = path.join(path.dirname(recipePath), "summary.md");

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
        console.log(`**Tags:** ${parsed.tags?.join(", ") || "(none)"}`);
        console.log(`**Parent Recipe:** ${parsed.parent_recipe || "(root)"}`);
        console.log(
          `**Created by Experiment:** ${
            parsed.created_by_experiment || "(manual)"
          }`
        );
        console.log(`**Created:** ${parsed.created}`);

        if (parsed.metrics && Object.keys(parsed.metrics).length > 0) {
          console.log("\n## Metrics\n");
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
            const parentMeta = loadRecipeMetadata(
              projectPath,
              current.parent_recipe
            );
            if (!parentMeta) break;
            current = parentMeta;
          }
          console.log("\n**Lineage:** " + lineage.reverse().join(" → "));
        }

        console.log();
      } catch (error) {
        if (options.json) {
          console.log(
            JSON.stringify({ error: (error as Error).message }, null, 2)
          );
          process.exit(1);
        }
        ora().fail(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // ml diff <recipe-a> <recipe-b>
  program
    .command("diff <recipeA> <recipeB>")
    .description("Compare two recipes")
    .action(async (recipeA: string, recipeB: string) => {
      try {
        const projectPath = process.cwd();

        if (!mlspecWorkspaceExists(projectPath)) {
          ora().fail('MLSpec workspace not found. Run "mlspec init" first.');
          process.exit(1);
        }

        const pathA = resolveMlspecPath(
          projectPath,
          "recipes",
          recipeA,
          "recipe.yaml"
        );
        const pathB = resolveMlspecPath(
          projectPath,
          "recipes",
          recipeB,
          "recipe.yaml"
        );

        if (!fs.existsSync(pathA)) {
          ora().fail(`Recipe '${recipeA}' not found`);
          process.exit(1);
        }
        if (!fs.existsSync(pathB)) {
          ora().fail(`Recipe '${recipeB}' not found`);
          process.exit(1);
        }

        const contentA = fs.readFileSync(pathA, "utf-8");
        const contentB = fs.readFileSync(pathB, "utf-8");
        const metaA = parseYaml(contentA) as RecipeMetadata;
        const metaB = parseYaml(contentB) as RecipeMetadata;

        console.log(`\n# Recipe Diff: ${recipeA} vs ${recipeB}\n`);

        // Compare tags
        const tagsA = metaA.tags || [];
        const tagsB = metaB.tags || [];
        const onlyA = tagsA.filter((t: RecipeTag) => !tagsB.includes(t));
        const onlyB = tagsB.filter((t: RecipeTag) => !tagsA.includes(t));
        console.log("## Tags");
        if (onlyA.length) console.log(`  ${recipeA} only: ${onlyA.join(", ")}`);
        if (onlyB.length) console.log(`  ${recipeB} only: ${onlyB.join(", ")}`);
        if (!onlyA.length && !onlyB.length) console.log("  (same)");

        // Compare parent
        console.log("\n## Parent Recipe");
        console.log(`  ${recipeA}: ${metaA.parent_recipe || "(root)"}`);
        console.log(`  ${recipeB}: ${metaB.parent_recipe || "(root)"}`);

        // Compare metrics
        const metricsA = (metaA.metrics ?? {}) as Record<string, number>;
        const metricsB = (metaB.metrics ?? {}) as Record<string, number>;
        const allMetrics = new Set([
          ...Object.keys(metricsA),
          ...Object.keys(metricsB),
        ]);
        if (allMetrics.size > 0) {
          console.log("\n## Metrics");
          for (const metric of allMetrics) {
            const valA = metricsA[metric];
            const valB = metricsB[metric];
            if (valA !== valB) {
              console.log(`  ${metric}:`);
              console.log(`    ${recipeA}: ${valA ?? "(none)"}`);
              console.log(`    ${recipeB}: ${valB ?? "(none)"}`);
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
    .command("experiment <id>")
    .description("Create a new experiment entity")
    .requiredOption("--from <recipe>", "Base recipe ID to compare against")
    .requiredOption("--proposes <recipe>", "Proposed recipe ID to evaluate")
    .option("--change <description>", "Description of what changes from base")
    .option(
      "--controlled <variables...>",
      "Controlled variables that stay fixed"
    )
    .option("--success <criteria...>", "Success criteria for acceptance")
    .option("--abort <criteria...>", "Abort criteria for early termination")
    .action(
      async (
        id: string,
        options: {
          from: string;
          proposes: string;
          change?: string;
          controlled?: string[];
          success?: string[];
          abort?: string[];
        }
      ) => {
        try {
          const projectPath = process.cwd();

          if (!mlspecWorkspaceExists(projectPath)) {
            ora().fail('MLSpec workspace not found. Run "mlspec init" first.');
            process.exit(1);
          }

          if (!isValidEntityName(id)) {
            ora().fail(
              "Invalid experiment ID. Use only alphanumeric characters, dashes, and underscores."
            );
            process.exit(1);
          }

          // Validate base_recipe exists
          const baseRecipePath = resolveMlspecPath(
            projectPath,
            "recipes",
            options.from,
            "recipe.yaml"
          );
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
              const cyclePath = [
                ...lineage.slice().reverse(),
                options.proposes,
              ].join(" → ");
              ora().fail(`Cycle detected: ${cyclePath}`);
              process.exit(1);
            }
          }

          const experimentDir = resolveMlspecPath(
            projectPath,
            "experiments",
            id
          );
          if (fs.existsSync(experimentDir)) {
            ora().fail(`Experiment '${id}' already exists`);
            process.exit(1);
          }

          await fsp.mkdir(experimentDir, { recursive: true });
          await fsp.mkdir(path.join(experimentDir, "evidence"), {
            recursive: true,
          });

          const metadata: Record<string, unknown> = {
            entity_type: "experiment",
            schema: "ml-experiment-v3",
            id,
            status: "draft",
            base_recipe: options.from,
            proposed_recipe: options.proposes,
            proposed_change:
              options.change || "_Describe what changes from base_",
            controlled_variables: options.controlled || [],
            success_criteria: options.success || [],
            abort_criteria: options.abort || [],
            created: getCurrentDate(),
          };

          await fsp.writeFile(
            path.join(experimentDir, "experiment.yaml"),
            `# Experiment: ${id}\n\n${stringify(metadata)}`
          );

          await fsp.writeFile(
            path.join(experimentDir, "hypothesis.md"),
            `# Hypothesis: ${id}

## Experiment

- **Base Recipe**: ${options.from}
- **Proposed Recipe**: ${options.proposes}
- **Proposed Change**: ${options.change || "_Describe what changes from base_"}

## Hypothesis

_What are we trying to test? State the hypothesis clearly._

## Controlled Variables

${
  (options.controlled || []).map((v: string) => `- ${v}`).join("\n") ||
  "_What stays the same during this experiment?_"
}

## Success Criteria

${
  (options.success || []).map((c: string) => `- ${c}`).join("\n") ||
  "_What metric improvements justify acceptance?_"
}
- Metric 1 delta > +0.005

## Abort Criteria

${
  (options.abort || []).map((c: string) => `- ${c}`).join("\n") ||
  "_What results would indicate this experiment should be stopped early?_"
}
- Metric delta < -0.010

## Expected Output Location

\`\`\`
outputs/${id}/
\`\`\`
`
          );

          ora().succeed(`Created experiment '${id}' with hypothesis.md`);
          console.log("\nNext steps:");
          console.log(
            `1. Edit ${path.join(
              experimentDir,
              "hypothesis.md"
            )} to refine your hypothesis`
          );
          console.log(
            `2. Run 'mlspec prepare ${id}' to prepare experiment`
          );
          console.log(
            `3. Run 'mlspec run ${id} <rung>' to check gate, then use /mlspec-run skill to collect evidence`
          );
        } catch (error) {
          ora().fail(`Error: ${(error as Error).message}`);
          process.exit(1);
        }
      }
    );

  // ml set-status <experiment> <status>
  program
    .command("set-status <experiment> <status>")
    .description("Set experiment status (draft, running, resolved)")
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

        const validStatuses = ["draft", "running", "resolved"];
        if (!validStatuses.includes(status)) {
          ora().fail(
            `Invalid status. Must be one of: ${validStatuses.join(", ")}`
          );
          process.exit(1);
        }

        const experimentPath = resolveMlspecPath(
          projectPath,
          "experiments",
          experiment,
          "experiment.yaml"
        );
        const content = fs.readFileSync(experimentPath, "utf-8");
        const parsed = parseYaml(content) as ExperimentMetadata;

        // Cannot change status of resolved experiment
        if (parsed.status === "resolved") {
          ora().fail(
            `Cannot change status of resolved experiment '${experiment}'`
          );
          process.exit(1);
        }

        parsed.status = status as ExperimentMetadata["status"];

        await fsp.writeFile(
          experimentPath,
          `# Experiment: ${experiment}\n\n${stringify(parsed)}`
        );

        ora().succeed(`Set experiment '${experiment}' status to '${status}'`);
      } catch (error) {
        ora().fail(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // ==========================================================================
  // Evidence Commands (V3 - rung-based)
  // ==========================================================================


  // ml show evidence <experiment>
  showCmd
    .command("evidence <experiment>")
    .description("Show evidence summary for an experiment")
    .option("--json", "Output machine-readable JSON")
    .action(async (experiment: string, options: { json?: boolean }) => {
      try {
        const projectPath = process.cwd();

        if (!mlspecWorkspaceExists(projectPath)) {
          if (options.json) {
            console.log(
              JSON.stringify(
                {
                  error: 'MLSpec workspace not found. Run "mlspec init" first.',
                },
                null,
                2
              )
            );
            process.exit(1);
          }
          ora().fail('MLSpec workspace not found. Run "mlspec init" first.');
          process.exit(1);
        }

        if (!experimentExists(projectPath, experiment)) {
          if (options.json) {
            console.log(
              JSON.stringify(
                {
                  error: `Experiment '${experiment}' not found`,
                  experiment_id: experiment,
                },
                null,
                2
              )
            );
            process.exit(1);
          }
          ora().fail(`Experiment '${experiment}' not found`);
          process.exit(1);
        }

        const experimentDir = resolveMlspecPath(
          projectPath,
          "experiments",
          experiment
        );

        // V3: Load evidence ladder from protocol.md
        const ladder = getEvidenceLadder(projectPath, experiment);
        const rungs: Record<
          string,
          {
            exists: boolean;
            path: string | null;
            rung_id: string | null;
            baseline_runs: unknown[] | null;
            treatment_runs: unknown[] | null;
            aggregate: unknown | null;
            comparison: unknown | null;
          }
        > = {};

        for (const rung of ladder) {
          const evidencePath = path.join(
            experimentDir,
            "evidence",
            `${rung.id}.md`
          );
          if (fs.existsSync(evidencePath)) {
            try {
              const content = fs.readFileSync(evidencePath, "utf-8");
              const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
              if (frontmatterMatch) {
                const parsed = parseYaml(
                  frontmatterMatch[1]
                ) as RungEvidence;
                rungs[rung.id] = {
                  exists: true,
                  path: evidencePath,
                  rung_id: rung.id,
                  baseline_runs: parsed.baseline_arm?.runs || null,
                  treatment_runs: parsed.treatment_arm?.runs || null,
                  aggregate: parsed.aggregate || null,
                  comparison: parsed.comparison || null,
                };
              } else {
                rungs[rung.id] = {
                  exists: true,
                  path: evidencePath,
                  rung_id: rung.id,
                  baseline_runs: null,
                  treatment_runs: null,
                  aggregate: null,
                  comparison: null,
                };
              }
            } catch {
              rungs[rung.id] = {
                exists: true,
                path: evidencePath,
                rung_id: rung.id,
                baseline_runs: null,
                treatment_runs: null,
                aggregate: null,
                comparison: null,
              };
            }
          } else {
            rungs[rung.id] = {
              exists: false,
              path: null,
              rung_id: rung.id,
              baseline_runs: null,
              treatment_runs: null,
              aggregate: null,
              comparison: null,
            };
          }
        }

        if (options.json) {
          const output = { experiment_id: experiment, rungs };
          console.log(JSON.stringify(output, null, 2));
          return;
        }

        // Human-readable output (default)
        console.log(`\n# Evidence: ${experiment}\n`);

        let hasEvidence = false;
        for (const rung of ladder) {
          const rungData = rungs[rung.id];
          if (rungData.exists) {
            hasEvidence = true;
            console.log(`## ${rung.id} (${rung.purpose})`);
            console.log(
              `  - Baseline runs: ${(rungData.baseline_runs as unknown[])?.length || 0}`
            );
            console.log(
              `  - Treatment runs: ${(rungData.treatment_runs as unknown[])?.length || 0}`
            );
            if (rungData.comparison) {
              console.log(`  - Comparison: present`);
            }
          }
        }

        if (!hasEvidence) {
          console.log("  (no evidence yet)");
        }

        console.log();
      } catch (error) {
        if (options.json) {
          console.log(
            JSON.stringify({ error: (error as Error).message }, null, 2)
          );
          process.exit(1);
        }
        ora().fail(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // ==========================================================================
  // Graph Commands (2.5)
  // ==========================================================================

  // ml graph [--format text|mermaid|dot]
  program
    .command("graph")
    .description("Show recipe-experiment graph")
    .option("--format <format>", "Output format (text, mermaid, dot)", "text")
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

        if (options.format === "mermaid") {
          console.log("\n```mermaid\ngraph TD\n");
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
          console.log("```\n");
        } else if (options.format === "dot") {
          console.log("digraph MLSpec {");
          console.log("  rankdir=LR;");
          console.log("  node [shape=box];");
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
          console.log("}");
        } else {
          // text format
          console.log("\n# Recipe-Experiment Graph\n");

          console.log("## Recipes\n");
          for (const recipeId of recipes) {
            const meta = allRecipes.get(recipeId);
            const tagsStr = meta?.tags?.length
              ? ` [${meta.tags.join(", ")}]`
              : "";
            const parentStr = meta?.parent_recipe
              ? ` (from: ${meta.parent_recipe})`
              : " (root)";
            console.log(`  ${recipeId}${tagsStr}${parentStr}`);
          }

          console.log("\n## Experiments\n");
          for (const expId of experiments) {
            const expMeta = loadExperimentMetadata(projectPath, expId);
            if (expMeta) {
              console.log(
                `  ${expId}: ${expMeta.base_recipe} → ${expMeta.proposed_recipe} [${expMeta.status}]`
              );
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
    .command("lineage <recipeId>")
    .description("Show recipe ancestry")
    .action(async (recipeId: string) => {
      try {
        const projectPath = process.cwd();

        if (!mlspecWorkspaceExists(projectPath)) {
          ora().fail('MLSpec workspace not found. Run "mlspec init" first.');
          process.exit(1);
        }

        const recipePath = resolveMlspecPath(
          projectPath,
          "recipes",
          recipeId,
          "recipe.yaml"
        );
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

        console.log("\n# Recipe Lineage\n");
        console.log(lineage.reverse().join(" → "));
        console.log();
      } catch (error) {
        ora().fail(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // ml next
  program
    .command("next")
    .description("Read-only router for next action")
    .option("--json", "Output machine-readable JSON")
    .action(async (options: { json?: boolean }) => {
      try {
        const projectPath = process.cwd();

        if (!mlspecWorkspaceExists(projectPath)) {
          if (options.json) {
            console.log(
              JSON.stringify(
                {
                  error: 'MLSpec workspace not found. Run "mlspec init" first.',
                },
                null,
                2
              )
            );
            process.exit(1);
          }
          ora().fail('MLSpec workspace not found. Run "mlspec init" first.');
          process.exit(1);
        }

        const experiments = listExperiments(projectPath);
        const allRecipes = loadAllRecipes(projectPath);
        const currentBestRecipes: string[] = [];

        for (const [recipeId, meta] of allRecipes) {
          if (meta?.tags?.includes("current-best")) {
            currentBestRecipes.push(recipeId);
          }
        }

        const actions: Array<{
          priority: number;
          action_type:
            | "explore"
            | "propose"
            | "run"
            | "resolve"
            | "bootstrap"
            | "none";
          suggested_command: string;
          reason: string;
          target?: { type: "experiment" | "recipe"; id: string };
        }> = [];

        // Track existing evidence stages per experiment
        const experimentExistingStages: Record<string, string[]> = {};

        let priority = 1;

        // Bootstrap detection: empty workspace
        if (experiments.length === 0 && allRecipes.size === 0) {
          actions.push({
            priority,
            action_type: "bootstrap",
            suggested_command: "/mlspec-explore",
            reason:
              "No baseline recipe exists yet. The MLSpec workspace is empty.",
          });
          priority++;
        }

        for (const expId of experiments) {
          const expMeta = loadExperimentMetadata(projectPath, expId);
          if (!expMeta) continue;

          if (expMeta.status === "draft") {
            actions.push({
              priority,
              action_type: "none",
              suggested_command: `mlspec set-status ${expId} running`,
              reason: `Experiment '${expId}' is in draft status`,
              target: { type: "experiment", id: expId },
            });
            priority++;
            continue;
          }

          if (expMeta.status === "running") {
            const expDir = resolveMlspecPath(projectPath, "experiments", expId);
            experimentExistingStages[expId] = [];

            // V3: Check prepare.md status first
            const preparePath = path.join(expDir, "prepare.md");
            if (!fs.existsSync(preparePath)) {
              actions.push({
                priority,
                action_type: "run",
                suggested_command: `/mlspec-prepare`,
                reason: `Experiment '${expId}' needs prepare.md (run /mlspec-prepare skill)`,
                target: { type: "experiment", id: expId },
              });
              priority++;
              continue;
            }

            // Check prepare status
            try {
              const prepareContent = fs.readFileSync(preparePath, "utf-8");
              const prepareParsed = parseFrontmatter(prepareContent);
              if (prepareParsed) {
                const prepareResult = PrepareMetadataSchema.safeParse(prepareParsed);
                if (!prepareResult.success || prepareResult.data.status !== "ready") {
                  actions.push({
                    priority,
                    action_type: "run",
                    suggested_command: `/mlspec-prepare`,
                    reason: `Experiment '${expId}' prepare.md status is '${prepareResult.success ? prepareResult.data.status : "invalid"}' (run /mlspec-prepare skill)`,
                    target: { type: "experiment", id: expId },
                  });
                  priority++;
                  continue;
                }
              }
            } catch {
              // If we can't parse prepare.md, suggest running prepare
              actions.push({
                priority,
                action_type: "run",
                suggested_command: `/mlspec-prepare`,
                reason: `Experiment '${expId}' has invalid prepare.md (run /mlspec-prepare skill)`,
                target: { type: "experiment", id: expId },
              });
              priority++;
              continue;
            }

            // V3: Load evidence ladder and check for missing evidence
            try {
              const ladder = getEvidenceLadder(projectPath, expId);
              for (const rung of ladder) {
                const evidencePath = path.join(expDir, "evidence", `${rung.id}.md`);
                if (fs.existsSync(evidencePath)) {
                  experimentExistingStages[expId].push(rung.id);
                } else {
                  actions.push({
                    priority,
                    action_type: "run",
                    suggested_command: `mlspec run ${expId} ${rung.id}`,
                    reason: `Experiment '${expId}' needs ${rung.id} evidence (run /mlspec-run skill)`,
                    target: { type: "experiment", id: expId },
                  });
                  priority++;
                  // Don't break - suggest all missing rungs
                }
              }
            } catch {
              // Protocol may not exist yet - this is an error state
              actions.push({
                priority,
                action_type: "none",
                suggested_command: `mlspec validate`,
                reason: `Experiment '${expId}' is missing protocol.md`,
                target: { type: "experiment", id: expId },
              });
              priority++;
            }
          }

          if (expMeta.status === "resolved") {
            // Check if resolution exists
            const resolutionPath = resolveMlspecPath(
              projectPath,
              "experiments",
              expId,
              "resolution.md"
            );
            if (!fs.existsSync(resolutionPath)) {
              actions.push({
                priority,
                action_type: "resolve",
                suggested_command: `mlspec resolve ${expId}`,
                reason: `Experiment '${expId}' is resolved but missing resolution.md`,
                target: { type: "experiment", id: expId },
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
              current_best_recipe:
                currentBestRecipes.length === 1 ? currentBestRecipes[0] : null,
            },
            existing_stages: experimentExistingStages,
            actions,
          };
          console.log(JSON.stringify(output, null, 2));
          return;
        }

        // Human-readable output (default)
        console.log("\n# Next Actions\n");
        if (actions.length === 0) {
          console.log("  (no pending actions)");
        } else {
          for (const action of actions) {
            console.log(`  - ${action.suggested_command}: ${action.reason}`);
          }
        }
        console.log();
      } catch (error) {
        if (options.json) {
          console.log(
            JSON.stringify({ error: (error as Error).message }, null, 2)
          );
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
    .command("status")
    .description("Show MLSpec workspace status")
    .option("--json", "Output machine-readable JSON")
    .option(
      "--experiment <id>",
      "Show experiment-specific status (requires --json)"
    )
    .action(async (options: { json?: boolean; experiment?: string }) => {
      try {
        const projectPath = process.cwd();

        if (!mlspecWorkspaceExists(projectPath)) {
          if (options.json) {
            console.log(
              JSON.stringify(
                {
                  error: 'MLSpec workspace not found. Run "mlspec init" first.',
                },
                null,
                2
              )
            );
            process.exit(1);
          }
          ora().fail('MLSpec workspace not found. Run "mlspec init" first.');
          process.exit(1);
        }

        // Experiment-specific status (JSON-only)
        if (options.experiment) {
          if (!options.json) {
            console.log(
              JSON.stringify(
                {
                  error: "This command requires --json flag",
                  experiment_id: options.experiment,
                },
                null,
                2
              )
            );
            process.exit(1);
          }

          const experimentId = options.experiment;
          if (!experimentExists(projectPath, experimentId)) {
            console.log(
              JSON.stringify(
                {
                  error: `Experiment '${experimentId}' not found`,
                  experiment_id: experimentId,
                },
                null,
                2
              )
            );
            process.exit(1);
          }

          const expMeta = loadExperimentMetadata(projectPath, experimentId);
          if (!expMeta) {
            console.log(
              JSON.stringify(
                {
                  error: `Experiment '${experimentId}' not found`,
                  experiment_id: experimentId,
                },
                null,
                2
              )
            );
            process.exit(1);
          }

          const expDir = resolveMlspecPath(
            projectPath,
            "experiments",
            experimentId
          );

          // V3: Load evidence ladder from protocol.md
          const ladder = getEvidenceLadder(projectPath, experimentId);
          const evidenceRungs: Record<
            string,
            {
              exists: boolean;
              path: string | null;
              rung_id: string | null;
              can_resolve: boolean;
              has_comparison: boolean;
            }
          > = {};
          const missingRungs: string[] = [];

          for (const rung of ladder) {
            const evidencePath = path.join(expDir, "evidence", `${rung.id}.md`);
            if (fs.existsSync(evidencePath)) {
              try {
                const content = fs.readFileSync(evidencePath, "utf-8");
                const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
                if (frontmatterMatch) {
                  const parsed = parseYaml(
                    frontmatterMatch[1]
                  ) as RungEvidence;
                  evidenceRungs[rung.id] = {
                    exists: true,
                    path: evidencePath,
                    rung_id: rung.id,
                    can_resolve: rung.can_resolve,
                    has_comparison: !!parsed.comparison,
                  };
                } else {
                  evidenceRungs[rung.id] = {
                    exists: true,
                    path: evidencePath,
                    rung_id: rung.id,
                    can_resolve: rung.can_resolve,
                    has_comparison: false,
                  };
                }
              } catch {
                evidenceRungs[rung.id] = {
                  exists: true,
                  path: evidencePath,
                  rung_id: rung.id,
                  can_resolve: rung.can_resolve,
                  has_comparison: false,
                };
              }
            } else {
              evidenceRungs[rung.id] = {
                exists: false,
                path: null,
                rung_id: rung.id,
                can_resolve: rung.can_resolve,
                has_comparison: false,
              };
              missingRungs.push(rung.id);
            }
          }

          const hasCanResolveEvidence = Object.values(evidenceRungs).some(
            (r) => r.exists && r.can_resolve
          );
          const readyToResolve =
            expMeta.status !== "resolved" && hasCanResolveEvidence;

          // V3: Also load prepare status if prepare.md exists
          const preparePath = path.join(expDir, "prepare.md");
          let prepare_status: string | null = null;
          if (fs.existsSync(preparePath)) {
            try {
              const prepareContent = fs.readFileSync(preparePath, "utf-8");
              const prepareParsed = parseFrontmatter(prepareContent);
              if (prepareParsed) {
                const prepareResult = PrepareMetadataSchema.safeParse(prepareParsed);
                if (prepareResult.success) {
                  prepare_status = prepareResult.data.status;
                }
              }
            } catch {
              // ignore parse errors
            }
          }

          const output = {
            experiment_id: experimentId,
            status: expMeta.status,
            base_recipe: expMeta.base_recipe,
            proposed_recipe: expMeta.proposed_recipe,
            prepare_status,
            evidence_ladder_status: evidenceRungs,
            missing_rungs: missingRungs,
            has_can_resolve_evidence: hasCanResolveEvidence,
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
            if (meta?.tags?.includes("current-best")) {
              currentBestRecipes.push(recipeId);
            }
          }

          const experiments = listExperiments(projectPath);
          const grouped: Record<string, string[]> = {
            draft: [],
            running: [],
            resolved: [],
          };
          for (const experiment of experiments) {
            const expMeta = loadExperimentMetadata(projectPath, experiment);
            if (expMeta) {
              grouped[expMeta.status || "draft"].push(experiment);
            }
          }

          const output = {
            recipes: recipes.map((id) => ({
              id,
              tags: allRecipes.get(id)?.tags || [],
              has_metrics:
                !!allRecipes.get(id)?.metrics &&
                Object.keys(allRecipes.get(id)?.metrics || {}).length > 0,
            })),
            experiments: {
              total: experiments.length,
              by_status: grouped,
            },
            current_best_recipes: currentBestRecipes,
            current_best_recipe:
              currentBestRecipes.length === 1 ? currentBestRecipes[0] : null,
            warnings: [] as string[],
            errors: [] as string[],
          };
          console.log(JSON.stringify(output, null, 2));
          return;
        }

        // Human-readable output (default)
        console.log("\n# MLSpec Status\n");

        const recipes = listRecipes(projectPath);
        console.log(`## Recipes (${recipes.length})`);
        if (recipes.length === 0) {
          console.log("  (none)");
        } else {
          const allRecipes = loadAllRecipes(projectPath);
          for (const recipeId of recipes) {
            const meta = allRecipes.get(recipeId);
            const superseded = meta?.tags?.includes("archived")
              ? " (archived)"
              : "";
            console.log(`  - ${recipeId}${superseded}`);
          }
        }
        console.log();

        const experiments = listExperiments(projectPath);
        if (experiments.length === 0) {
          console.log("## Experiments (0)");
          console.log("  (none)");
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
              grouped[expMeta.status || "draft"].push(experiment);
            }
          }

          console.log(`## Experiments (${experiments.length})\n`);

          for (const [status, exps] of Object.entries(grouped)) {
            if (exps.length > 0) {
              console.log(`${status}:`);
              for (const exp of exps) {
                const expMeta = loadExperimentMetadata(projectPath, exp);
                const evidenceRungs: string[] = [];
                const expDir = resolveMlspecPath(
                  projectPath,
                  "experiments",
                  exp
                );
                // V3: Load evidence ladder and check which rungs have evidence
                try {
                  const ladder = getEvidenceLadder(projectPath, exp);
                  for (const rung of ladder) {
                    if (
                      fs.existsSync(path.join(expDir, "evidence", `${rung.id}.md`))
                    ) {
                      evidenceRungs.push(rung.id);
                    }
                  }
                } catch {
                  // Experiment may not have protocol.md yet
                }
                console.log(
                  `  - ${exp} (${expMeta?.base_recipe || "?"} → ${
                    expMeta?.proposed_recipe || "?"
                  }, evidence: ${evidenceRungs.join(", ") || "none"})`
                );
              }
              console.log();
            }
          }
        }
      } catch (error) {
        if (options.json) {
          console.log(
            JSON.stringify({ error: (error as Error).message }, null, 2)
          );
          process.exit(1);
        }
        ora().fail(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // ==========================================================================
  // Validate Command (V3)
  // ==========================================================================

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

  program
    .command("validate")
    .description("Validate MLSpec workspace structure (V3)")
    .option("--strict", "Enable strict validation (warnings as errors)")
    .action(async (options: { strict?: boolean }) => {
      try {
        const projectPath = process.cwd();
        const spinner = ora("Validating MLSpec workspace...").start();

        if (!mlspecWorkspaceExists(projectPath)) {
          ora().fail('MLSpec workspace not found. Run "mlspec init" first.');
          process.exit(1);
        }

        const errors: string[] = [];
        const warnings: string[] = [];

        // Check workspace version (V3 requires version 3)
        const workspacePath = resolveMlspecPath(projectPath, ".workspace.yaml");
        if (!fs.existsSync(workspacePath)) {
          errors.push("Missing .workspace.yaml");
        } else {
          try {
            const content = fs.readFileSync(workspacePath, "utf-8");
            const parsed = parseYaml(content) as { workspace_version?: number };
            if (parsed.workspace_version !== 3) {
              errors.push(`Workspace version ${parsed.workspace_version || 'unknown'} is not supported. V3 CLI requires workspace_version 3.`);
            }
          } catch {
            errors.push("Failed to parse .workspace.yaml");
          }
        }

        // Validate recipes (V2/V3 - unchanged)
        const recipes = listRecipes(projectPath);
        const recipeIds = new Set<string>();
        for (const recipeId of recipes) {
          const recipeDir = resolveMlspecPath(projectPath, "recipes", recipeId);
          const metaPath = path.join(recipeDir, "recipe.yaml");

          if (!fs.existsSync(metaPath)) {
            errors.push(`Recipe '${recipeId}': missing recipe.yaml`);
          } else {
            try {
              const content = fs.readFileSync(metaPath, "utf-8");
              const parsed = parseYaml(content);
              const result = RecipeMetadataSchema.safeParse(parsed);
              if (!result.success) {
                errors.push(
                  `Recipe '${recipeId}': invalid recipe.yaml - ${result.error.message}`
                );
              } else {
                if (recipeIds.has(result.data.id)) {
                  errors.push(`Recipe '${recipeId}': duplicate recipe ID`);
                }
                recipeIds.add(result.data.id);

                if (
                  result.data.parent_recipe &&
                  !recipes.includes(result.data.parent_recipe)
                ) {
                  errors.push(
                    `Recipe '${recipeId}': parent_recipe '${result.data.parent_recipe}' does not exist`
                  );
                }

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

                if (result.data.tags?.includes("current-best")) {
                  const currentBestCount = recipes.filter((r) => {
                    const meta = loadRecipeMetadata(projectPath, r);
                    return meta?.tags?.includes("current-best");
                  });
                  if (currentBestCount.length > 1) {
                    warnings.push(
                      `Multiple recipes have 'current-best' tag (${currentBestCount.join(", ")})`
                    );
                  }
                }
              }
            } catch {
              errors.push(`Recipe '${recipeId}': failed to parse recipe.yaml`);
            }
          }
        }

        // Validate experiments (V3 with protocol/prepare/rung)
        for (const experiment of listExperiments(projectPath)) {
          const experimentDir = resolveMlspecPath(projectPath, "experiments", experiment);
          const metaPath = path.join(experimentDir, "experiment.yaml");
          const hypothesisPath = path.join(experimentDir, "hypothesis.md");

          if (!fs.existsSync(metaPath)) {
            errors.push(`Experiment '${experiment}': missing experiment.yaml`);
          } else {
            try {
              const content = fs.readFileSync(metaPath, "utf-8");
              const parsed = parseYaml(content);
              const result = ExperimentMetadataSchema.safeParse(parsed);
              if (!result.success) {
                errors.push(
                  `Experiment '${experiment}': invalid experiment.yaml - ${result.error.message}`
                );
              } else {
                if (!recipeIds.has(result.data.base_recipe)) {
                  errors.push(
                    `Experiment '${experiment}': base_recipe '${result.data.base_recipe}' does not exist`
                  );
                }
                if (!isValidEntityName(result.data.proposed_recipe)) {
                  errors.push(
                    `Experiment '${experiment}': proposed_recipe '${result.data.proposed_recipe}' is not a valid entity name`
                  );
                }
              }
            } catch {
              errors.push(`Experiment '${experiment}': failed to parse experiment.yaml`);
            }
          }

          if (!fs.existsSync(hypothesisPath)) {
            errors.push(`Experiment '${experiment}': missing hypothesis.md`);
          }

          // V3: Validate protocol.md
          const protocolPath = path.join(experimentDir, "protocol.md");
          if (!fs.existsSync(protocolPath)) {
            errors.push(`Experiment '${experiment}': missing protocol.md`);
          } else {
            try {
              const content = fs.readFileSync(protocolPath, "utf-8");
              const parsed = parseFrontmatter(content);
              if (!parsed) {
                errors.push(`Experiment '${experiment}': protocol.md missing frontmatter`);
              } else {
                const result = ProtocolMetadataSchema.safeParse(parsed);
                if (!result.success) {
                  errors.push(
                    `Experiment '${experiment}': invalid protocol.md - ${result.error.message}`
                  );
                } else {
                  // Check evidence_ladder is non-empty
                  if (!result.data.evidence_ladder || result.data.evidence_ladder.length === 0) {
                    errors.push(`Experiment '${experiment}': protocol.md evidence_ladder is empty`);
                  }
                  // Check compute_agreement exists
                  if (!result.data.compute_agreement) {
                    warnings.push(`Experiment '${experiment}': protocol.md missing compute_agreement`);
                  }
                }
              }
            } catch {
              errors.push(`Experiment '${experiment}': failed to parse protocol.md`);
            }
          }

          // V3: Validate prepare.md if it exists
          const preparePath = path.join(experimentDir, "prepare.md");
          let prepareStatus: string | null = null;
          if (fs.existsSync(preparePath)) {
            try {
              const content = fs.readFileSync(preparePath, "utf-8");
              const parsed = parseFrontmatter(content);
              if (!parsed) {
                errors.push(`Experiment '${experiment}': prepare.md missing frontmatter`);
              } else {
                const result = PrepareMetadataSchema.safeParse(parsed);
                if (!result.success) {
                  errors.push(
                    `Experiment '${experiment}': invalid prepare.md - ${result.error.message}`
                  );
                } else {
                  prepareStatus = result.data.status;
                }
              }
            } catch {
              errors.push(`Experiment '${experiment}': failed to parse prepare.md`);
            }
          }

          // V3: Validate evidence files using protocol.evidence_ladder
          const ladder = getEvidenceLadder(projectPath, experiment);
          const evidenceDir = path.join(experimentDir, "evidence");

          // Check for evidence files that don't correspond to a rung in the ladder
          if (fs.existsSync(evidenceDir)) {
            const evidenceFiles = fs.readdirSync(evidenceDir).filter((f) => f.endsWith(".md"));
            const rungIds = new Set(ladder.map((r) => r.id));

            for (const file of evidenceFiles) {
              const rungId = file.replace(/\.md$/, "");
              if (!rungIds.has(rungId)) {
                errors.push(
                  `Experiment '${experiment}': evidence/${file} rung '${rungId}' not in protocol.evidence_ladder`
                );
              }
            }
          }

          // Validate evidence for each rung in the ladder
          for (const rung of ladder) {
            const evidencePath = path.join(evidenceDir, `${rung.id}.md`);
            if (fs.existsSync(evidencePath)) {
              try {
                const content = fs.readFileSync(evidencePath, "utf-8");
                const parsed = parseFrontmatter(content);
                if (!parsed) {
                  errors.push(`Experiment '${experiment}': evidence/${rung.id}.md missing frontmatter`);
                } else {
                  const result = RungEvidenceSchema.safeParse(parsed);
                  if (!result.success) {
                    errors.push(
                      `Experiment '${experiment}' evidence/${rung.id}: ${result.error.message}`
                    );
                  }
                }
              } catch {
                errors.push(`Experiment '${experiment}' evidence/${rung.id}: failed to parse`);
              }
            }
          }

          // Check prepare.md exists and has status=ready if evidence exists
          const hasEvidence = fs.existsSync(evidenceDir) &&
            fs.readdirSync(evidenceDir).filter((f) => f.endsWith(".md")).length > 0;
          if (hasEvidence) {
            if (!fs.existsSync(preparePath)) {
              errors.push(
                `Experiment '${experiment}': has evidence but missing prepare.md`
              );
            } else if (prepareStatus && prepareStatus !== "ready") {
              errors.push(
                `Experiment '${experiment}': has evidence but prepare.md status is '${prepareStatus}' (must be 'ready')`
              );
            }
          }

          // V3: Check resolution.md if experiment is resolved
          const expMeta = loadExperimentMetadata(projectPath, experiment);
          if (expMeta?.status === "resolved") {
            const resolutionPath = path.join(experimentDir, "resolution.md");
            if (!fs.existsSync(resolutionPath)) {
              errors.push(`Experiment '${experiment}': is resolved but missing resolution.md`);
            } else {
              try {
                const content = fs.readFileSync(resolutionPath, "utf-8");
                const parsed = parseFrontmatter(content);
                if (!parsed) {
                  errors.push(`Experiment '${experiment}': resolution.md missing frontmatter`);
                } else {
                  const result = ResolutionFrontmatterSchema.safeParse(parsed);
                  if (!result.success) {
                    errors.push(
                      `Experiment '${experiment}' resolution: ${result.error.message}`
                    );
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
          console.log("\n## Errors\n");
          for (const error of errors) {
            console.log(`  ✗ ${error}`);
          }
        }

        if (warnings.length > 0) {
          console.log("\n## Warnings\n");
          for (const warning of warnings) {
            console.log(`  ⚠ ${warning}`);
          }
        }

        if (errors.length === 0) {
          ora().succeed("MLSpec workspace is valid");
          if (warnings.length > 0) {
            console.log(`  ${warnings.length} warning(s) - use --strict to treat warnings as errors`);
            if (options.strict) {
              ora().fail("Strict validation failed due to warnings");
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

  // ==========================================================================
  // prepare Command (V3 Gate Checker)
  // ==========================================================================

  program
    .command("prepare <experiment>")
    .description("Validate prepare.md artifact for an experiment (V3)")
    .action(async (experiment: string) => {
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

        const experimentDir = resolveMlspecPath(projectPath, "experiments", experiment);
        const preparePath = path.join(experimentDir, "prepare.md");

        // Check prepare.md exists
        if (!fs.existsSync(preparePath)) {
          ora().fail(`prepare.md not found for experiment '${experiment}'`);
          process.exit(1);
        }

        // Parse and validate prepare.md
        const content = fs.readFileSync(preparePath, "utf-8");
        const parsed = parseFrontmatter(content);

        if (!parsed) {
          ora().fail(`prepare.md missing frontmatter for experiment '${experiment}'`);
          process.exit(1);
        }

        const result = PrepareMetadataSchema.safeParse(parsed);
        if (!result.success) {
          ora().fail(`prepare.md schema invalid: ${result.error.message}`);
          process.exit(1);
        }

        // Return exit code based on status
        const status = result.data.status;
        switch (status) {
          case "ready":
            ora().succeed(`prepare.md status: ready`);
            process.exit(0);
          case "needs_work":
            ora().warn(`prepare.md status: needs_work`);
            process.exit(1);
          case "protocol_change_required":
            ora().warn(`prepare.md status: protocol_change_required`);
            process.exit(2);
          default:
            ora().fail(`prepare.md has unknown status: ${status}`);
            process.exit(1);
        }
      } catch (error) {
        ora().fail(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // ==========================================================================
  // run Command (V3 Preflight Gate Checker)
  // ==========================================================================

  program
    .command("run <experiment> <rung>")
    .description("Validate that evidence can be collected for a rung (V3 gate checker)")
    .action(async (experiment: string, rung: string) => {
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

        const experimentDir = resolveMlspecPath(projectPath, "experiments", experiment);

        // Check protocol.md exists
        const protocolPath = path.join(experimentDir, "protocol.md");
        if (!fs.existsSync(protocolPath)) {
          ora().fail(`protocol.md not found - experiment '${experiment}' has no evidence ladder`);
          process.exit(1);
        }

        // Load protocol and check rung exists
        const ladder = getEvidenceLadder(projectPath, experiment);
        const rungExists = ladder.some((r) => r.id === rung);
        if (!rungExists) {
          ora().fail(`Rung '${rung}' not found in protocol.evidence_ladder`);
          process.exit(1);
        }

        // Check prepare.md exists and status=ready
        const preparePath = path.join(experimentDir, "prepare.md");
        if (!fs.existsSync(preparePath)) {
          ora().fail(`prepare.md not found - run /mlspec-prepare first`);
          process.exit(1);
        }

        const prepareContent = fs.readFileSync(preparePath, "utf-8");
        const prepareParsed = parseFrontmatter(prepareContent);
        if (!prepareParsed) {
          ora().fail(`prepare.md missing frontmatter`);
          process.exit(1);
        }

        const prepareResult = PrepareMetadataSchema.safeParse(prepareParsed);
        if (!prepareResult.success) {
          ora().fail(`prepare.md schema invalid: ${prepareResult.error.message}`);
          process.exit(1);
        }

        if (prepareResult.data.status !== "ready") {
          ora().fail(`prepare.md status is '${prepareResult.data.status}' - must be 'ready' before collecting evidence`);
          process.exit(1);
        }

        // Check evidence/<rung>.md doesn't already exist
        const evidencePath = path.join(experimentDir, "evidence", `${rung}.md`);
        if (fs.existsSync(evidencePath)) {
          ora().fail(`evidence/${rung}.md already exists - cannot overwrite`);
          process.exit(1);
        }

        // Gate passed
        ora().succeed(`Gate check passed: experiment '${experiment}' rung '${rung}' is ready for evidence collection`);
        process.exit(0);
      } catch (error) {
        ora().fail(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // ==========================================================================
  // resolve Command (V3 Preflight Gate Checker)
  // ==========================================================================

  program
    .command("resolve <experiment>")
    .description("Validate that experiment can be resolved (V3 gate checker)")
    .action(async (experiment: string) => {
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

        const experimentDir = resolveMlspecPath(projectPath, "experiments", experiment);

        // Check protocol.md exists
        const protocolPath = path.join(experimentDir, "protocol.md");
        if (!fs.existsSync(protocolPath)) {
          ora().fail(`protocol.md not found`);
          process.exit(1);
        }

        // Find can_resolve rung
        const ladder = getEvidenceLadder(projectPath, experiment);
        const canResolveRung = ladder.find((r) => r.can_resolve);
        if (!canResolveRung) {
          ora().fail(`No rung with can_resolve=true in protocol.evidence_ladder`);
          process.exit(1);
        }

        // Check evidence exists for can_resolve rung
        const evidencePath = path.join(experimentDir, "evidence", `${canResolveRung.id}.md`);
        if (!fs.existsSync(evidencePath)) {
          ora().fail(`No evidence for can_resolve rung '${canResolveRung.id}'`);
          process.exit(1);
        }

        // Check resolution.md doesn't already exist
        const resolutionPath = path.join(experimentDir, "resolution.md");
        if (fs.existsSync(resolutionPath)) {
          ora().fail(`resolution.md already exists`);
          process.exit(1);
        }

        // Gate passed
        ora().succeed(`Gate check passed: experiment '${experiment}' can be resolved`);
        process.exit(0);
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
    .command("ml")
    .description("ML experimentation workflow commands");

  // Re-use all the same command registration logic, but on mlCmd
  registerMlspecCommands(mlCmd);
}
