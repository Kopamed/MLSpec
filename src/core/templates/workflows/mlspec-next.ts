/**
 * MLSpec Next Skill Template
 *
 * Read-only router that recommends the next action.
 */
import type { SkillTemplate, CommandTemplate } from '../types.js';

export function getMlspecNextSkillTemplate(): SkillTemplate {
  return {
    name: 'mlspec-next',
    description: 'Read-only router that recommends the next action based on workspace state. Never modifies files.',
    instructions: `Recommend the next action based on workspace state.

This is a read-only skill that inspects the workspace and suggests what to do next. It never modifies any files.

---

## Routing

**1. Try CLI first**
Run: \`mlspec next --json\`
If JSON output is available and parseable: use structured data from the JSON

**2. Fallback to file inspection**
If JSON command fails or output is unparseable: inspect files directly

### JSON Output Structure

When using \`mlspec next --json\`, the output contains:
- \`workspace_state\`: recipes_count, experiments_count, current_best_recipes, current_best_recipe
- \`actions\`: Array of actions sorted by ascending priority, each with:
  - \`priority\`: Lower number = higher priority
  - \`action_type\`: one of explore, propose, run, resolve, bootstrap, none
  - \`suggested_command\`: The command to run
  - \`reason\`: Why this action is recommended
  - \`target\`: Optional { type: 'experiment' | 'recipe', id: string }

---

**Pause if:** (none - read-only skill, always proceeds)

---

## Bootstrap Routing

**FIRST**: Check workspace state to determine which routing logic applies.

### Routing Logic (in order of priority)

**1. Empty Workspace** (no recipes at all)
-> Recommend /mlspec-explore

**2. Baseline Exists But No Experiments**

   **2a. Baseline has no metrics**
   -> Recommend /mlspec-run to establish baseline metrics

   **2b. Baseline has metrics**
   -> Recommend /mlspec-explore or /mlspec-propose for first experiment

**3. Multiple Baseline Recipes**
   - If current-best is unambiguous: use it, continue with routing below
   - If ambiguous: ask one focused question to select which baseline

**4. Normal Workspace** (experiments exist)
-> Continue with normal priority logic below

---

**What to Inspect**

0. **Bootstrap State**
   - Is mlspec/recipes/ empty?
   - Does baseline recipe exist?
   - Does baseline have metrics?
   - Do experiments exist?

1. **Experiments**
   - Status: draft, running, resolved
   - Evidence completeness
   - Abort criteria met?

2. **Recipes**
   - Tags: current-best, candidate, baseline
   - Lineage and parent chains
   - Metrics populated?

3. **Evidence**
   - Recommendations from evidence files
   - Stage progression

4. **Findings**
   - Any pending findings to review

---

**Priority Logic**

**Bootstrap Routing (check first):**

1. **Empty workspace** -> /mlspec-explore (no recipes exist yet)
2. **Baseline exists, no metrics** -> /mlspec-run (establish baseline metrics first)
3. **Baseline exists with metrics, no experiments** -> /mlspec-explore or /mlspec-propose
4. **Multiple baselines, ambiguous** -> ask one question to select

**Normal Routing (experiments exist):**

5. **Failed Abort** - Experiments where abort criteria are met
6. **Ready to Resolve** - Experiments with complete evidence and recommendations
7. **Need Validation** - Experiments with smoke evidence waiting for validation
8. **Need Smoke** - Experiments with no evidence yet
9. **Ready for Final** - Experiments with validation complete
10. **Explore** - If no clear next action

---

**Output Format**

### Empty Workspace
\`\`\`
## Next Recommended Action

### /mlspec-explore

### Why This Action?
- No baseline recipe exists yet
- The MLSpec workspace is empty

### Context
- Recipes: none
- Experiments: none
- Workspace requires bootstrap before experiments can be proposed

### Alternative Actions
1. /mlspec-propose <baseline-id> - if baseline ID is obvious
\`\`\`

### Baseline Exists, No Metrics
\`\`\`
## Next Recommended Action

### /mlspec-run

### Why This Action?
- Baseline recipe exists but has no metrics
- Baseline metrics should be established before proposing experiments
- Running evaluation will populate recipe.yaml metrics

### Context
- **Baseline**: <baseline-id> (no metrics yet)
- **Experiments**: none
- **Status**: Baseline metrics need to be established

### Alternative Actions
1. /mlspec-explore - to understand the project structure first
\`\`\`

### Baseline Exists With Metrics, No Experiments
\`\`\`
## Next Recommended Action

### /mlspec-propose <experiment-id> --from <baseline-id>

### Why This Action?
- Baseline is established with metrics
- Workspace is ready for the first experiment

### Context
- **Current Best**: <baseline-id> (metrics established)
- **Experiments**: none
- **Status**: Ready for first experiment proposal

### Alternative Actions
1. /mlspec-explore - to identify promising experiment directions
\`\`\`

### Normal Workspace (experiments exist)
\`\`\`
## Next Recommended Action

### /mlspec-run validation add-roi-cropping

### Why This Action?
- Smoke evidence is positive (+1.1% accuracy)
- No validation evidence yet
- Experiment is ready for trusted evaluation

### Context
- **Current Best**: rf-mfcc-v1 (accuracy=0.934)
- **Active Experiments**: 3 total
  - add-roi-cropping: smoke complete, needs validation
  - tune-n-estimators: draft, no evidence
  - try-ensemble: running, validation in progress

### Alternative Actions
1. /mlspec-resolve try-ensemble - if validation is complete
2. /mlspec-explore - to identify new opportunities
3. /mlspec-propose X - to start a new experiment
\`\`\`

---

**Boundaries**

**This skill NEVER modifies files.**

- Never create experiments
- Never record evidence
- Never resolve experiments
- Never create recipes
- Never update any workspace files

It only reads and recommends.
`,
    license: 'MIT',
    compatibility: 'Requires MLSpec v2 workspace',
    metadata: { author: 'mlspec', version: '2.0' },
  };
}

export function getMlspecNextCommandTemplate(): CommandTemplate {
  return {
    name: 'MLSpec: Next Action',
    description: 'Read-only router that recommends the next action based on workspace state.',
    category: 'Workflow',
    tags: ['workflow', 'mlspec', 'ml', 'next', 'router'],
    content: `Recommend the next action based on workspace state.

This is a read-only skill. It never modifies any files.

---

**Routing**

1. **Try CLI first**: Run \`mlspec next --json\`
2. **Fallback**: File inspection if JSON unavailable or unparseable

---

**Priority Order**

1. Failed abort criteria -> recommend resolve with reject
2. Complete evidence + recommendation -> recommend resolve
3. Smoke complete, no validation -> recommend validation run
4. Draft, no evidence -> recommend smoke run
5. Validation complete, no final -> recommend final run
6. No clear action -> recommend explore

---

**Output Format**

\`\`\`
## Next Recommended Action

### /mlspec-run validation <experiment>

### Why?
- Smoke evidence positive
- Needs validation

### Context
- Current best: <recipe>
- Active experiments: <count>

### Alternatives
- /mlspec-resolve <experiment>
- /mlspec-explore
\`\`\`

---

**Boundaries**

**NEVER modifies files.** Only reads and recommends.`,
  };
}
