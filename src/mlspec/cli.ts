/**
 * MLSpec CLI Commands
 *
 * Registers the `openspec ml` subcommand and all its subcommands.
 */

import { Command } from 'commander';
import path from 'node:path';
import * as fs from 'node:fs';
import { promises as fsp } from 'node:fs';
import {
  MLSPEC_DIR,
  resolveMlspecPath,
  createMlspecWorkspace,
  mlspecWorkspaceExists,
  getCurrentDate,
  slugifyName,
  isValidEntityName,
  ARCHIVE_SUBDIRS,
  type ArchiveDecision,
} from './utils.js';
import {
  ExperimentMetadataSchema,
  BaselineMetadataSchema,
  CandidateMetadataSchema,
  EvidenceFrontmatterSchema,
  DecisionFrontmatterSchema,
  getMetadataFileName,
  getEntityDir,
} from './entity-types.js';
import {
  validateComparisonRef,
  experimentExists,
  candidateExists,
  loadBaselineMetadata,
  loadExperimentMetadata,
  loadCandidateMetadata,
  listExperiments,
  listBaselines,
  listCandidates,
  listArchivedExperiments,
  getArchiveSubdir,
  getProtocolState,
  type ProtocolState,
} from './reference-resolver.js';
import { AGENTS_CONTENT } from './protocol.js';
import { parse as parseYaml, stringify } from 'yaml';
import ora from 'ora';

/**
 * Register the `openspec ml` subcommand.
 */
export function registerMlspecCommand(program: Command): void {
  const mlCmd = program
    .command('ml')
    .description('ML experimentation workflow commands');

  // ml init
  mlCmd
    .command('init')
    .description('Initialize MLSpec workspace in the current project')
    .action(async () => {
      try {
        const projectPath = process.cwd();

        if (mlspecWorkspaceExists(projectPath)) {
          ora().fail(`MLSpec workspace already exists at ${path.join(projectPath, MLSPEC_DIR)}`);
          process.exit(1);
        }

        const spinner = ora('Creating MLSpec workspace...').start();
        await createMlspecWorkspace(projectPath);

        // Create workspace.yaml
        const workspaceMeta = {
          entity_type: 'evaluation',
          schema: 'ml-experiment',
          workspace_version: 1,
        };
        const workspacePath = resolveMlspecPath(projectPath, '.workspace.yaml');
        await fsp.writeFile(workspacePath, `# MLSpec Workspace\n\n${stringify(workspaceMeta)}`);

        // Create evaluation.md from template
        const evaluationPath = resolveMlspecPath(projectPath, 'evaluation.md');
        await fsp.writeFile(evaluationPath, `# MLSpec Evaluation

## Overview

_Describe the purpose and scope of this ML experimentation workspace._

## Baselines

| Name | Created | Status | Notes |
|------|---------|--------|-------|
| | | | |

## Active Experiments

| Name | Hypothesis | Status | Evidence |
|------|------------|--------|----------|
| | | | |

## Candidates

| Name | Current Version | Status | Notes |
|------|-----------------|--------|-------|
| | | | |

## Key Findings

_Summarize notable findings from experiments._

## Recommendations

_Next steps and priorities for the ML experimentation effort._
`);

        // Create AGENTS.md with the agent experiment protocol
        const agentsPath = resolveMlspecPath(projectPath, 'AGENTS.md');
        await fsp.writeFile(agentsPath, AGENTS_CONTENT);

        spinner.succeed(`MLSpec workspace initialized at ${path.join(projectPath, MLSPEC_DIR)}`);
      } catch (error) {
        ora().fail(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // ml new baseline <name>
  const newCmd = mlCmd.command('new').description('Create new MLSpec entities');

  newCmd
    .command('baseline <name>')
    .description('Create a new baseline entity')
    .action(async (name: string) => {
      try {
        const projectPath = process.cwd();

        if (!mlspecWorkspaceExists(projectPath)) {
          ora().fail('MLSpec workspace not found. Run "openspec ml init" first.');
          process.exit(1);
        }

        if (!isValidEntityName(name)) {
          ora().fail('Invalid baseline name. Use only alphanumeric characters, dashes, and underscores.');
          process.exit(1);
        }

        const baselineDir = resolveMlspecPath(projectPath, 'baselines', name);
        if (fs.existsSync(baselineDir)) {
          ora().fail(`Baseline '${name}' already exists`);
          process.exit(1);
        }

        await fsp.mkdir(baselineDir, { recursive: true });

        // Create .baseline.yaml
        const baselineMetadata = {
          entity_type: 'baseline',
          created: getCurrentDate(),
          superseded_by: null,
        };
        await fsp.writeFile(
          path.join(baselineDir, '.baseline.yaml'),
          `# Baseline: ${name}\n\n${stringify(baselineMetadata)}`
        );

        // Create baseline.md
        await fsp.writeFile(
          path.join(baselineDir, 'baseline.md'),
          `# Baseline: ${name}

## Purpose

_Describe what this baseline is and what it represents._

## Configuration

\`\`\`yaml
# baseline configuration here
\`\`\`

## Metrics Summary

| Metric | Value |
|--------|-------|
| | |

## Notes

_Additional context about this baseline._

---

_Created: ${getCurrentDate()}_
`
        );

        // Create baseline recipe file
        await fsp.writeFile(
          path.join(baselineDir, 'baseline.yaml'),
          `# Baseline recipe for ${name}
# Add your baseline configuration here
`
        );

        ora().succeed(`Created baseline '${name}'`);
      } catch (error) {
        ora().fail(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // ml new candidate <name>
  newCmd
    .command('candidate <name>')
    .description('Create a new candidate entity')
    .action(async (name: string) => {
      try {
        const projectPath = process.cwd();

        if (!mlspecWorkspaceExists(projectPath)) {
          ora().fail('MLSpec workspace not found. Run "openspec ml init" first.');
          process.exit(1);
        }

        if (!isValidEntityName(name)) {
          ora().fail('Invalid candidate name. Use only alphanumeric characters, dashes, and underscores.');
          process.exit(1);
        }

        const candidateDir = resolveMlspecPath(projectPath, 'candidates', name);
        if (fs.existsSync(candidateDir)) {
          ora().fail(`Candidate '${name}' already exists`);
          process.exit(1);
        }

        await fsp.mkdir(candidateDir, { recursive: true });

        // Create .candidate.yaml
        const metadata = {
          entity_type: 'candidate',
          name: name,
          current_version: 1,
          latest_finalized_version: null,
          versions: [
            {
              version: 1,
              file: 'recipe-v1.yaml',
              status: 'draft',
              supporting_experiments: [],
              created: getCurrentDate(),
            },
          ],
        };
        await fsp.writeFile(
          path.join(candidateDir, '.candidate.yaml'),
          `# Candidate: ${name}\n\n${stringify(metadata)}`
        );

        // Create recipe file
        await fsp.writeFile(
          path.join(candidateDir, 'recipe-v1.yaml'),
          `# Candidate recipe for ${name} (v1)
# Add your recipe configuration here
`
        );

        ora().succeed(`Created candidate '${name}'`);
      } catch (error) {
        ora().fail(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // ml new experiment <name>
  newCmd
    .command('experiment <name>')
    .description('Create a new experiment entity')
    .action(async (name: string) => {
      try {
        const projectPath = process.cwd();

        if (!mlspecWorkspaceExists(projectPath)) {
          ora().fail('MLSpec workspace not found. Run "openspec ml init" first.');
          process.exit(1);
        }

        if (!isValidEntityName(name)) {
          ora().fail('Invalid experiment name. Use only alphanumeric characters, dashes, and underscores.');
          process.exit(1);
        }

        const experimentDir = resolveMlspecPath(projectPath, 'experiments', name);
        if (fs.existsSync(experimentDir)) {
          ora().fail(`Experiment '${name}' already exists`);
          process.exit(1);
        }

        await fsp.mkdir(experimentDir, { recursive: true });

        // Create .experiment.yaml
        const experimentMeta = {
          entity_type: 'experiment',
          schema: 'ml-experiment',
          comparison_ref: null, // Fill in after selecting baseline/candidate
          created: getCurrentDate(),
        };
        await fsp.writeFile(
          path.join(experimentDir, '.experiment.yaml'),
          `# Experiment: ${name}\n\n${stringify(experimentMeta)}`
        );

        // Create hypothesis.md
        await fsp.writeFile(
          path.join(experimentDir, 'hypothesis.md'),
          `# Hypothesis: ${name}

## Hypothesis

_What are we trying to test? State the hypothesis clearly._

## Comparison Reference

- **Type**: baseline | candidate
- **Name**: _name of baseline or candidate being compared against_

## Intended Change

_What is being added, removed, or modified? Be specific._

## Controlled Variables

_What stays the same during this experiment?_
- Model / architecture: ...
- Dataset split or sampling strategy: ...
- Preprocessing / input representation: ...
- Optimizer and learning-rate schedule: ...
- Batch size / accumulation: ...
- Seed(s): ...
- Training budget / epochs / steps / tokens: ...
- Evaluation procedure: ...
- (Add domain-specific variables as relevant)

## Success Criteria

_What metric improvements justify promotion to the next evidence level?_
- Metric 1 delta > +0.005
- Metric 2 delta > +0.005

## Abort Criteria

_What results would indicate this experiment should be stopped early?_
- Metric delta < -0.010
- Training divergence observed
- Runtime > 2x baseline

## Evidence Level Plan

- [ ] E1: Cheap proxy (1 seed, 10% data)
- [ ] E2: Controlled (3 seeds, full data)
- [ ] E3: Validation (5 seeds, realistic scale)

## Planned Command

Expected command, if known:
\`\`\`bash
python train.py --config <experiment>.yaml
\`\`\`

## Expected Output Location

\`\`\`
outputs/${name}/E1/
\`\`\`
`
        );

        ora().succeed(`Created experiment '${name}' with hypothesis.md`);
        console.log('\nNext steps:');
        console.log(`1. Edit ${path.join(experimentDir, 'hypothesis.md')} to define your hypothesis`);
        console.log(`2. Run 'openspec ml add-evidence ${name} --level E1' to add evidence`);
      } catch (error) {
        ora().fail(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // ml add-evidence <experiment> --level <level>
  mlCmd
    .command('add-evidence <experiment>')
    .description('Add evidence to an experiment')
    .requiredOption('--level <level>', 'Evidence level (E1, E2, E3, E4, E5)')
    .action(async (experiment: string, options: { level: string }) => {
      try {
        const projectPath = process.cwd();

        if (!mlspecWorkspaceExists(projectPath)) {
          ora().fail('MLSpec workspace not found. Run "openspec ml init" first.');
          process.exit(1);
        }

        if (!experimentExists(projectPath, experiment)) {
          ora().fail(`Experiment '${experiment}' not found`);
          process.exit(1);
        }

        const validLevels = ['E1', 'E2', 'E3', 'E4', 'E5'];
        const level = options.level.toUpperCase();
        if (!validLevels.includes(level)) {
          ora().fail(`Invalid evidence level. Must be one of: ${validLevels.join(', ')}`);
          process.exit(1);
        }

        const evidenceDir = resolveMlspecPath(projectPath, 'experiments', experiment, 'evidence');
        await fsp.mkdir(evidenceDir, { recursive: true });

        const evidencePath = path.join(evidenceDir, `${level}.md`);
        if (fs.existsSync(evidencePath)) {
          ora().fail(`Evidence at level ${level} already exists for experiment '${experiment}'`);
          process.exit(1);
        }

        // Load experiment metadata to get comparison_ref
        const expMeta = loadExperimentMetadata(projectPath, experiment);
        const comparisonRef = expMeta?.comparison_ref || { entity_type: 'baseline', name: 'unknown' };

        // Create evidence file
        await fsp.writeFile(
          evidencePath,
          `---
evidence_level: ${level}
recommendation: none
comparison_ref:
  entity_type: ${comparisonRef.entity_type}
  name: ${comparisonRef.name}
metrics:
  auc_delta: 0.0
  f1_delta: 0.0
compute:
  dataset_fraction: 1.0
  epochs: 10
  folds: 1
  seeds: []
commands:
  planned: ""
  executed: ""
artifacts:
  metrics_file: ""
  checkpoint: ""
  predictions: ""
  log_file: ""
  changed_files: []
---

# Evidence: ${experiment} (${level})

## What Was Done

_Describe the experiment setup and what was executed._

## Changed Files

_List the files actually modified for this experiment:_
- \`file1.py\`: Description of change
- \`file2.yaml\`: Description of change

## Results

| Metric | Comparison | This Experiment | Delta |
|--------|-----------|-----------------|-------|
| AUC | | | |
| F1 | | | |

## Interpretation

_What do these results mean? Is there a signal?
Consider: metric delta, seed/fold stability, per-class regressions, compute tradeoff._

## Recommendation

- [ ] **promote**: Continue to next evidence level
- [ ] **reject**: Abandon this direction
- [ ] **inconclusive**: Need more evidence
- [ ] **retry**: Re-run with modifications
- [ ] **hold**: Wait for other experiments
`
        );

        ora().succeed(`Created ${level} evidence for experiment '${experiment}'`);
      } catch (error) {
        ora().fail(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // ml decide <experiment>
  mlCmd
    .command('decide <experiment>')
    .description('Create or update decision for an experiment')
    .requiredOption('--decision <decision>', 'Decision: promote, reject, inconclusive, hold, retry')
    .option('--target-candidate <name>', 'Target candidate for promote decision')
    .action(async (experiment: string, options: { decision: string; targetCandidate?: string }) => {
      try {
        const projectPath = process.cwd();

        if (!mlspecWorkspaceExists(projectPath)) {
          ora().fail('MLSpec workspace not found. Run "openspec ml init" first.');
          process.exit(1);
        }

        if (!experimentExists(projectPath, experiment)) {
          ora().fail(`Experiment '${experiment}' not found`);
          process.exit(1);
        }

        const validDecisions = ['promote', 'reject', 'inconclusive', 'hold', 'retry'];
        const decision = options.decision.toLowerCase();
        if (!validDecisions.includes(decision)) {
          ora().fail(`Invalid decision. Must be one of: ${validDecisions.join(', ')}`);
          process.exit(1);
        }

        if (decision === 'promote' && !options.targetCandidate) {
          ora().fail('--target-candidate is required when decision is promote');
          process.exit(1);
        }

        if (decision === 'promote' && options.targetCandidate && !candidateExists(projectPath, options.targetCandidate)) {
          ora().fail(`Candidate '${options.targetCandidate}' not found`);
          process.exit(1);
        }

        const decisionPath = resolveMlspecPath(projectPath, 'experiments', experiment, 'decision.md');

        // Build frontmatter
        const frontmatter: Record<string, unknown> = {
          decision: decision,
        };

        if (decision === 'promote') {
          frontmatter.target_candidate = options.targetCandidate;
        } else if (decision === 'reject') {
          frontmatter.rejection_reason = '_reason_';
        } else if (decision === 'inconclusive') {
          frontmatter.uncertainty_reason = '_reason_';
        } else if (decision === 'hold') {
          frontmatter.blocker = '_blocker_';
          frontmatter.revisit_condition = '_condition_';
        } else if (decision === 'retry') {
          frontmatter.retry_plan = '_plan_';
        }

        const frontmatterYaml = Object.entries(frontmatter)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\n');

        await fsp.writeFile(
          decisionPath,
          `---
${frontmatterYaml}
---

# Decision: ${experiment}

## Decision

**Outcome**: ${decision}

## Evidence Considered

- _List evidence files that informed this decision_

## Reasoning

_Why was this decision made? What evidence supported it?_

## What This Decision Proves

- _Positive findings with evidence_

## What This Decision Does Not Prove

- _Limitations and negative findings not ruled out_

---

_Decision made on: ${getCurrentDate()}_
`
        );

        ora().succeed(`Created decision '${decision}' for experiment '${experiment}'`);
      } catch (error) {
        ora().fail(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // ml promote <experiment> --to <candidate>
  mlCmd
    .command('promote <experiment>')
    .description('Promote an experiment to a candidate version')
    .requiredOption('--to <candidate>', 'Target candidate name')
    .action(async (experiment: string, options: { to: string }) => {
      try {
        const projectPath = process.cwd();
        const spinner = ora('Promoting experiment...').start();

        if (!mlspecWorkspaceExists(projectPath)) {
          ora().fail('MLSpec workspace not found. Run "openspec ml init" first.');
          process.exit(1);
        }

        if (!experimentExists(projectPath, experiment)) {
          ora().fail(`Experiment '${experiment}' not found`);
          process.exit(1);
        }

        const candidateName = options.to;
        if (!candidateExists(projectPath, candidateName)) {
          ora().fail(`Candidate '${candidateName}' not found`);
          process.exit(1);
        }

        const candidateDir = resolveMlspecPath(projectPath, 'candidates', candidateName);
        const candidateMeta = loadCandidateMetadata(projectPath, candidateName);

        if (!candidateMeta) {
          ora().fail(`Failed to load candidate metadata for '${candidateName}'`);
          process.exit(1);
        }

        // Verify decision.md exists and has valid promote decision
        const decisionPath = resolveMlspecPath(projectPath, 'experiments', experiment, 'decision.md');
        if (!fs.existsSync(decisionPath)) {
          ora().fail(`decision.md not found for experiment '${experiment}'. Run 'openspec ml decide ${experiment}' first.`);
          process.exit(1);
        }

        try {
          const decisionContent = fs.readFileSync(decisionPath, 'utf-8');
          const frontmatterMatch = decisionContent.match(/^---\n([\s\S]*?)\n---/);
          if (!frontmatterMatch) {
            ora().fail(`decision.md for '${experiment}' is missing frontmatter`);
            process.exit(1);
          }
          const parsed = parseYaml(frontmatterMatch[1]);
          if (parsed.decision !== 'promote') {
            ora().fail(`Experiment '${experiment}' has decision '${parsed.decision}', not 'promote'. Cannot promote.`);
            process.exit(1);
          }
          if (!parsed.target_candidate) {
            ora().fail(`decision.md for '${experiment}' is missing target_candidate`);
            process.exit(1);
          }
          if (parsed.target_candidate !== candidateName) {
            ora().fail(`decision.md target_candidate is '${parsed.target_candidate}', but promoting to '${candidateName}'. Use --to ${parsed.target_candidate} or update decision.md.`);
            process.exit(1);
          }
        } catch (e) {
          ora().fail(`Failed to parse decision.md for '${experiment}': ${(e as Error).message}`);
          process.exit(1);
        }

        // Create new version
        const newVersion = candidateMeta.current_version + 1;
        const newVersionFile = `recipe-v${newVersion}.yaml`;

        // Update candidate metadata
        candidateMeta.current_version = newVersion;
        candidateMeta.versions.push({
          version: newVersion,
          file: newVersionFile,
          status: 'draft',
          supporting_experiments: [experiment],
          created: getCurrentDate(),
        });

        // Write updated metadata
        await fsp.writeFile(
          path.join(candidateDir, '.candidate.yaml'),
          `# Candidate: ${candidateName}\n\n${stringify(candidateMeta)}`
        );

        // Create new recipe version file (copy from previous or template)
        const prevVersion = newVersion - 1;
        const prevVersionFile = path.join(candidateDir, `recipe-v${prevVersion}.yaml`);
        if (fs.existsSync(prevVersionFile)) {
          const prevContent = fs.readFileSync(prevVersionFile, 'utf-8');
          await fsp.writeFile(path.join(candidateDir, newVersionFile), prevContent);
        } else {
          await fsp.writeFile(
            path.join(candidateDir, newVersionFile),
            `# Candidate recipe for ${candidateName} (v${newVersion})\n# Based on experiment: ${experiment}\n`
          );
        }

        spinner.succeed(`Promoted experiment '${experiment}' to ${candidateName} v${newVersion}`);

        console.log(`\nNote: The new version is a draft.`);
        console.log(`Edit ${path.join(candidateDir, newVersionFile)} to update the recipe.`);
      } catch (error) {
        ora().fail(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // ml archive <experiment>
  mlCmd
    .command('archive <experiment>')
    .description('Archive an experiment based on its decision')
    .action(async (experiment: string) => {
      try {
        const projectPath = process.cwd();

        if (!mlspecWorkspaceExists(projectPath)) {
          ora().fail('MLSpec workspace not found. Run "openspec ml init" first.');
          process.exit(1);
        }

        if (!experimentExists(projectPath, experiment)) {
          ora().fail(`Experiment '${experiment}' not found`);
          process.exit(1);
        }

        // Load decision if exists
        const decisionPath = resolveMlspecPath(projectPath, 'experiments', experiment, 'decision.md');
        let decision: ArchiveDecision = 'inconclusive';

        if (fs.existsSync(decisionPath)) {
          try {
            const content = fs.readFileSync(decisionPath, 'utf-8');
            const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
            if (frontmatterMatch) {
              const parsed = parseYaml(frontmatterMatch[1]);
              if (parsed.decision) {
                decision = parsed.decision as ArchiveDecision;
              }
            }
          } catch {
            // Use default
          }
        }

        // Get archive subdirectory
        const archiveSubdir = ARCHIVE_SUBDIRS[decision];
        const srcPath = resolveMlspecPath(projectPath, 'experiments', experiment);
        const destPath = resolveMlspecPath(projectPath, 'archive', archiveSubdir, experiment);

        // Check if destination already exists
        if (fs.existsSync(destPath)) {
          ora().fail(`Archived experiment '${experiment}' already exists in ${archiveSubdir}/`);
          process.exit(1);
        }

        // Move experiment to archive
        await fsp.mkdir(destPath, { recursive: true });

        // Read all files from source and write to destination
        const files = fs.readdirSync(srcPath, { withFileTypes: true });
        for (const file of files) {
          const srcFile = path.join(srcPath, file.name);
          const destFile = path.join(destPath, file.name);
          if (file.isFile()) {
            const content = fs.readFileSync(srcFile);
            await fsp.writeFile(destFile, content);
          } else if (file.isDirectory()) {
            await fsp.mkdir(destFile, { recursive: true });
            // Recursively copy directory
            const subFiles = fs.readdirSync(srcFile, { withFileTypes: true });
            for (const subFile of subFiles) {
              const srcSubFile = path.join(srcFile, subFile.name);
              const destSubFile = path.join(destFile, subFile.name);
              if (subFile.isFile()) {
                const content = fs.readFileSync(srcSubFile);
                await fsp.writeFile(destSubFile, content);
              }
            }
          }
        }

        // Remove original
        await fsp.rm(srcPath, { recursive: true });

        ora().succeed(`Archived experiment '${experiment}' to ${archiveSubdir}/`);

        console.log('\nConsider updating findings/.md with this result.');
      } catch (error) {
        ora().fail(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // ml status
  mlCmd
    .command('status')
    .description('Show MLSpec workspace status')
    .action(async () => {
      try {
        const projectPath = process.cwd();

        if (!mlspecWorkspaceExists(projectPath)) {
          ora().fail('MLSpec workspace not found. Run "openspec ml init" first.');
          process.exit(1);
        }

        console.log('\n# MLSpec Status\n');

        // Baselines
        const baselines = listBaselines(projectPath);
        console.log(`## Baselines (${baselines.length})`);
        if (baselines.length === 0) {
          console.log('  (none)');
        } else {
          for (const baseline of baselines) {
            const meta = loadBaselineMetadata(projectPath, baseline);
            const superseded = meta?.superseded_by ? ` (superseded by ${meta.superseded_by})` : '';
            console.log(`  - ${baseline}${superseded}`);
          }
        }
        console.log();

        // Candidates
        const candidates = listCandidates(projectPath);
        console.log(`## Candidates (${candidates.length})`);
        if (candidates.length === 0) {
          console.log('  (none)');
        } else {
          for (const candidate of candidates) {
            const meta = loadCandidateMetadata(projectPath, candidate);
            if (meta) {
              console.log(`  - ${candidate}: v${meta.current_version} (current)${meta.latest_finalized_version ? `, v${meta.latest_finalized_version} finalized` : ''}`);
            }
          }
        }
        console.log();

        // Experiments grouped by protocol state
        const experiments = listExperiments(projectPath);
        if (experiments.length === 0) {
          console.log('## Active Experiments (0)');
          console.log('  (none)');
          console.log();
        } else {
          // Group experiments by protocol state
          const grouped: Record<ProtocolState, string[]> = {
            'needs hypothesis': [],
            'needs evidence': [],
            'needs decision': [],
            'needs promotion': [],
            'needs archive': [],
          };

          for (const experiment of experiments) {
            const state = getProtocolState(projectPath, experiment);
            grouped[state].push(experiment);
          }

          console.log(`## Active Experiments (${experiments.length})\n`);

          for (const [state, exps] of Object.entries(grouped) as [ProtocolState, string[]][]) {
            if (exps.length > 0) {
              console.log(`${state}:`);
              for (const exp of exps) {
                const expMeta = loadExperimentMetadata(projectPath, exp);
                const evidenceDir = resolveMlspecPath(projectPath, 'experiments', exp, 'evidence');
                const evidenceLevels = fs.existsSync(evidenceDir)
                  ? fs.readdirSync(evidenceDir).filter((f: string) => f.endsWith('.md')).map((f: string) => f.replace('.md', '')).join(', ')
                  : 'none';
                const comparison = expMeta?.comparison_ref
                  ? `${expMeta.comparison_ref.entity_type}:${expMeta.comparison_ref.name}`
                  : 'unknown';
                console.log(`  - ${exp} (${comparison}, evidence: ${evidenceLevels})`);
              }
              console.log();
            }
          }
        }

        // Archived experiments
        const archived = listArchivedExperiments(projectPath);
        const totalArchived = Object.values(archived).reduce((sum, arr) => sum + arr.length, 0);
        console.log(`## Archived Experiments (${totalArchived})`);
        if (totalArchived === 0) {
          console.log('  (none)');
        } else {
          for (const [decision, experiments] of Object.entries(archived) as [ArchiveDecision, string[]][]) {
            if (experiments.length > 0) {
              console.log(`  ${ARCHIVE_SUBDIRS[decision]}: ${experiments.join(', ')}`);
            }
          }
        }
        console.log();
      } catch (error) {
        ora().fail(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // ml validate
  mlCmd
    .command('validate')
    .description('Validate MLSpec workspace structure')
    .option('--strict', 'Enable strict validation (warnings as errors)')
    .action(async (options: { strict?: boolean }) => {
      try {
        const projectPath = process.cwd();
        const spinner = ora('Validating MLSpec workspace...').start();

        if (!mlspecWorkspaceExists(projectPath)) {
          ora().fail('MLSpec workspace not found. Run "openspec ml init" first.');
          process.exit(1);
        }

        const errors: string[] = [];
        const warnings: string[] = [];

        // Check workspace.yaml
        const workspacePath = resolveMlspecPath(projectPath, '.workspace.yaml');
        if (!fs.existsSync(workspacePath)) {
          errors.push('Missing .workspace.yaml');
        }

        // Check evaluation.md
        const evaluationPath = resolveMlspecPath(projectPath, 'evaluation.md');
        if (!fs.existsSync(evaluationPath)) {
          errors.push('Missing evaluation.md');
        }

        // Validate baselines
        for (const baseline of listBaselines(projectPath)) {
          const baselineDir = resolveMlspecPath(projectPath, 'baselines', baseline);
          const metaPath = path.join(baselineDir, '.baseline.yaml');

          if (!fs.existsSync(metaPath)) {
            errors.push(`Baseline '${baseline}': missing .baseline.yaml`);
          } else {
            try {
              const content = fs.readFileSync(metaPath, 'utf-8');
              const parsed = parseYaml(content);
              const result = BaselineMetadataSchema.safeParse(parsed);
              if (!result.success) {
                errors.push(`Baseline '${baseline}': invalid .baseline.yaml - ${result.error.message}`);
              }
            } catch (e) {
              errors.push(`Baseline '${baseline}': failed to parse .baseline.yaml`);
            }
          }
        }

        // Validate candidates
        for (const candidate of listCandidates(projectPath)) {
          const candidateDir = resolveMlspecPath(projectPath, 'candidates', candidate);
          const metaPath = path.join(candidateDir, '.candidate.yaml');

          if (!fs.existsSync(metaPath)) {
            errors.push(`Candidate '${candidate}': missing .candidate.yaml`);
          } else {
            try {
              const content = fs.readFileSync(metaPath, 'utf-8');
              const parsed = parseYaml(content);
              const result = CandidateMetadataSchema.safeParse(parsed);
              if (!result.success) {
                errors.push(`Candidate '${candidate}': invalid .candidate.yaml - ${result.error.message}`);
              }
            } catch (e) {
              errors.push(`Candidate '${candidate}': failed to parse .candidate.yaml`);
            }
          }
        }

        // Validate experiments
        for (const experiment of listExperiments(projectPath)) {
          const experimentDir = resolveMlspecPath(projectPath, 'experiments', experiment);
          const metaPath = path.join(experimentDir, '.experiment.yaml');
          const hypothesisPath = path.join(experimentDir, 'hypothesis.md');

          if (!fs.existsSync(metaPath)) {
            errors.push(`Experiment '${experiment}': missing .experiment.yaml`);
          } else {
            try {
              const content = fs.readFileSync(metaPath, 'utf-8');
              const parsed = parseYaml(content);
              const result = ExperimentMetadataSchema.safeParse(parsed);
              if (!result.success) {
                errors.push(`Experiment '${experiment}': invalid .experiment.yaml - ${result.error.message}`);
              } else {
                // Validate comparison_ref - warn if missing, error if invalid
                const refResult = validateComparisonRef(projectPath, parsed.comparison_ref);
                if (!refResult.valid) {
                  errors.push(`Experiment '${experiment}': ${refResult.error}`);
                } else if (!parsed.comparison_ref) {
                  warnings.push(`Experiment '${experiment}': missing comparison_ref (experiment should reference a baseline or candidate)`);
                }
              }
            } catch (e) {
              errors.push(`Experiment '${experiment}': failed to parse .experiment.yaml`);
            }
          }

          if (!fs.existsSync(hypothesisPath)) {
            errors.push(`Experiment '${experiment}': missing hypothesis.md`);
          }

          // Validate evidence files
          const evidenceDir = path.join(experimentDir, 'evidence');
          const hasEvidence = fs.existsSync(evidenceDir) && fs.readdirSync(evidenceDir).filter((f: string) => f.endsWith('.md')).length > 0;

          // ERROR: evidence exists but no hypothesis
          if (hasEvidence && !fs.existsSync(hypothesisPath)) {
            errors.push(`Experiment '${experiment}' has evidence but no hypothesis.md. Experiments should have a hypothesis before evidence is recorded.`);
          }

          if (fs.existsSync(evidenceDir)) {
            for (const evidenceFile of fs.readdirSync(evidenceDir).filter((f: string) => f.endsWith('.md'))) {
              const evidencePath = path.join(evidenceDir, evidenceFile);
              try {
                const content = fs.readFileSync(evidencePath, 'utf-8');
                const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
                if (frontmatterMatch) {
                  const parsed = parseYaml(frontmatterMatch[1]);
                  const result = EvidenceFrontmatterSchema.safeParse(parsed);
                  if (!result.success) {
                    errors.push(`Experiment '${experiment}' evidence ${evidenceFile}: ${result.error.message}`);
                  } else {
                    // Validate comparison_ref - warn if missing, error if invalid
                    const refResult = validateComparisonRef(projectPath, parsed.comparison_ref);
                    if (!refResult.valid) {
                      errors.push(`Experiment '${experiment}' evidence ${evidenceFile}: ${refResult.error}`);
                    } else if (!parsed.comparison_ref) {
                      warnings.push(`Experiment '${experiment}' evidence ${evidenceFile}: missing comparison_ref`);
                    }

                    // WARNING: missing commands.executed
                    if (!parsed.commands?.executed) {
                      warnings.push(`Evidence '${experiment}' evidence ${evidenceFile}: has no actual command recorded. Evidence may be reconstructed, imported, or recorded manually.`);
                    }

                    // WARNING: missing artifacts
                    const hasArtifacts = parsed.artifacts && (
                      parsed.artifacts.metrics_file ||
                      parsed.artifacts.checkpoint ||
                      parsed.artifacts.predictions ||
                      parsed.artifacts.log_file ||
                      (parsed.artifacts.changed_files && parsed.artifacts.changed_files.length > 0)
                    );
                    if (!hasArtifacts) {
                      warnings.push(`Evidence '${experiment}' evidence ${evidenceFile}: has no artifact paths recorded. Consider recording metrics_file, checkpoint, or log locations for reproducibility.`);
                    }
                  }
                } else {
                  errors.push(`Experiment '${experiment}' evidence ${evidenceFile}: missing frontmatter`);
                }
              } catch (e) {
                errors.push(`Experiment '${experiment}' evidence ${evidenceFile}: failed to parse`);
              }
            }
          }

          // Validate decision.md if exists
          const decisionPath = path.join(experimentDir, 'decision.md');
          if (fs.existsSync(decisionPath)) {
            try {
              const content = fs.readFileSync(decisionPath, 'utf-8');
              const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
              if (frontmatterMatch) {
                const parsed = parseYaml(frontmatterMatch[1]);
                const result = DecisionFrontmatterSchema.safeParse(parsed);
                if (!result.success) {
                  errors.push(`Experiment '${experiment}' decision: ${result.error.message}`);
                } else {
                  // Check for placeholder values
                  const placeholderFields: [string, string][] = [
                    ['rejection_reason', 'reject'],
                    ['uncertainty_reason', 'inconclusive'],
                    ['blocker', 'hold'],
                    ['retry_plan', 'retry'],
                  ];
                  for (const [field, decision] of placeholderFields) {
                    if (parsed.decision === decision && parsed[field] && String(parsed[field]).startsWith('_')) {
                      warnings.push(`Experiment '${experiment}' decision: ${field} contains placeholder value '${parsed[field]}'`);
                    }
                  }
                }
              }
            } catch (e) {
              errors.push(`Experiment '${experiment}' decision: failed to parse`);
            }
          }
        }

        // ML quality warnings
        for (const experiment of listExperiments(projectPath)) {
          const experimentDir = resolveMlspecPath(projectPath, 'experiments', experiment);
          const evidenceDir = path.join(experimentDir, 'evidence');
          if (fs.existsSync(evidenceDir)) {
            const evidenceFiles = fs.readdirSync(evidenceDir).filter((f: string) => f.endsWith('.md')).sort();

            if (evidenceFiles.length > 1) {
              // Check for skipped levels
              const levels = evidenceFiles.map((f: string) => f.replace('.md', ''));
              for (let i = 1; i < levels.length; i++) {
                const prevNum = parseInt(levels[i-1].substring(1));
                const currNum = parseInt(levels[i].substring(1));
                if (currNum > prevNum + 1) {
                  warnings.push(`Experiment '${experiment}': skipped evidence level (${levels[i-1]} -> ${levels[i]})`);
                }
              }

              // Check E2<E1 and E3<E2 metric comparisons
              const evidenceData: { level: string; metrics?: Record<string, number> }[] = [];
              for (const evidenceFile of evidenceFiles) {
                const evidencePath = path.join(evidenceDir, evidenceFile);
                const content = fs.readFileSync(evidencePath, 'utf-8');
                const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
                if (frontmatterMatch) {
                  const parsed = parseYaml(frontmatterMatch[1]);
                  if (parsed.metrics) {
                    evidenceData.push({ level: evidenceFile.replace('.md', ''), metrics: parsed.metrics });
                  }
                }
              }

              // Compare consecutive evidence levels
              for (let i = 1; i < evidenceData.length; i++) {
                const prev = evidenceData[i - 1];
                const curr = evidenceData[i];
                if (prev.metrics && curr.metrics) {
                  // Compare common metric keys
                  for (const key of Object.keys(prev.metrics)) {
                    if (curr.metrics[key] !== undefined) {
                      // For metrics where higher is better (like auc, accuracy),
                      // if current is lower than previous by a threshold, warn
                      // Conservative: only warn if we can detect a clear degradation
                      // We don't know which direction is "better" so we warn on any significant drop
                      const delta = curr.metrics[key] - prev.metrics[key];
                      // Warn if delta is negative and significant (> 0.01 for rate metrics, > 0.001 for others)
                      const threshold = Math.abs(prev.metrics[key]) > 1 ? 0.01 : 0.001;
                      if (delta < -threshold) {
                        warnings.push(
                          `Experiment '${experiment}': ${curr.level} ${key} is lower than ${prev.level} ${key}; possible proxy transfer failure.`
                        );
                      }
                    }
                  }
                }
              }
            }

            // Check for promote decision with only E1
            const decisionPath = path.join(experimentDir, 'decision.md');
            if (fs.existsSync(decisionPath)) {
              const content = fs.readFileSync(decisionPath, 'utf-8');
              const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
              if (frontmatterMatch) {
                const parsed = parseYaml(frontmatterMatch[1]);
                if (parsed.decision === 'promote' && evidenceFiles.length === 1 && evidenceFiles[0] === 'E1.md') {
                  warnings.push(`Experiment '${experiment}': promote decision with only E1 evidence (thin evidence)`);
                }
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

  // ml help
  mlCmd
    .command('help', { noHelp: true })
    .description('Show help for MLSpec commands')
    .action(() => {
      mlCmd.help();
    });
}
