/**
 * MLSpec Next Skill Template (V3)
 *
 * Read-only router that recommends the next action based on V3 workflow.
 */
import type { SkillTemplate, CommandTemplate } from "../types.js";

export function getMlspecNextSkillTemplate(): SkillTemplate {
  return {
    name: "mlspec-next",
    description:
      "Read-only router that recommends the next action based on workspace state. Never modifies files.",
    instructions: `Recommend the next action based on workspace state.

This is a read-only skill that inspects the workspace and suggests what to do next. It never modifies any files.

---

## V3 Workflow: Prepare → Evidence Ladder → Resolve

**V3 introduces a Prepare stage before evidence collection:**

1. **propose** - Create experiment with protocol.md
2. **prepare** - Engineering readiness verification (prepare.md)
3. **run** - Collect evidence for rungs (evidence/<rung>.md)
4. **resolve** - Assess outcomes and write resolution.md

---

## Routing Logic

**1. Try CLI first**
Run: \`mlspec next --json\`
If JSON output is available and parseable: use structured data from the JSON

**2. Fallback to file inspection**
If JSON command fails or output is unparseable: inspect files directly

### JSON Output Structure

When using \`mlspec next --json\`, the output contains:
- \`workspace_state\`: recipes_count, experiments_count, current_best_recipes, current_best_recipe
- \`existing_rungs\`: Object mapping experiment IDs to arrays of existing evidence rung IDs (e.g., \`{"exp-1": ["pilot", "validation"]}\`)
- \`actions\`: Array of actions sorted by ascending priority, each with:
  - \`priority\`: Lower number = higher priority
  - \`action_type\`: one of explore, propose, prepare, run, resolve, bootstrap, none
  - \`suggested_command\`: The command to run
  - \`reason\`: Why this action is recommended
  - \`target\`: Optional { type: 'experiment' | 'recipe', id: string }

**Important:** Do NOT recommend collecting evidence for a rung that already exists. Check \`existing_rungs\` before suggesting \`mlspec run <id> <rung>\`.

---

## Priority Logic (V3)

**1. Empty Workspace** -> /mlspec-explore (no recipes exist yet)

**2. No experiments** -> /mlspec-propose or /mlspec-explore

**3. Draft experiments without prepare** -> /mlspec-prepare
- Check: prepare.md exists?
- If no: route to prepare

**4. Experiments with prepare not ready** -> /mlspec-prepare
- Check: prepare.md status
- If status != ready: route to prepare

**5. Need evidence for next rung** -> /mlspec-run
- Check: protocol.md evidence_ladder
- Check: existing evidence files
- Find next incomplete rung

**6. Can resolve** (can_resolve=true rung has evidence) -> /mlspec-resolve

**7. Explore** - If no clear next action

---

## What to Inspect

1. **Experiments**
   - Status: draft, running, resolved
   - prepare.md status: ready, needs_work, protocol_change_required
   - Evidence completeness per rung

2. **protocol.md**
   - evidence_ladder: list of rung IDs and their can_resolve flag
   - baseline_requirements per rung

3. **Evidence files**
   - evidence/<rung>.md files that exist
   - Comparison results

4. **Recipes**
   - Tags: current-best, candidate, baseline
   - Lineage and parent chains
   - Metrics populated?

---

## Routing Examples

### No prepare.md
\`\`\`
## Next Recommended Action

### /mlspec-prepare <experiment-id>

### Why This Action?
- Experiment exists but has no prepare.md
- Prepare stage is required before evidence collection

### Context
- **Experiment**: my-exp
- **Status**: draft
- **Prepare**: missing
\`\`\`

### Prepare not ready
\`\`\`
## Next Recommended Action

### /mlspec-prepare <experiment-id>

### Why This Action?
- prepare.md exists but status is 'needs_work'
- Engineering issues must be fixed before evidence collection

### Context
- **Experiment**: my-exp
- **Prepare status**: needs_work
- **Blocking issues**: 2 issues found
\`\`\`

### Ready for evidence
\`\`\`
## Next Recommended Action

### /mlspec-run <experiment-id> validation

### Why This Action?
- prepare.md status is 'ready'
- pilot evidence complete, validation next
- Protocol defines validation rung with can_resolve=false

### Context
- **Experiment**: my-exp
- **Prepare status**: ready
- **Evidence**: pilot complete
- **Next rung**: validation
\`\`\`

### Ready to resolve
\`\`\`
## Next Recommended Action

### /mlspec-resolve <experiment-id>

### Why This Action?
- validation evidence complete
- validation rung has can_resolve=true
- Experiment ready for resolution

### Context
- **Experiment**: my-exp
- **Evidence**: pilot (complete), validation (complete)
- **Can resolve**: validation
\`\`\`

---

## CLI vs Skill Boundary

**This skill (mlspec-next) is read-only.**

It only reads workspace state and recommends actions. It never modifies files.

**The actual work is done by other skills:**
- /mlspec-propose: Creates experiment with protocol.md
- /mlspec-prepare: Engineering readiness checks
- /mlspec-run: Collects evidence
- /mlspec-resolve: Assesses outcomes

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
    license: "MIT",
    compatibility: "Requires MLSpec v3 workspace with protocol.md",
    metadata: { author: "mlspec", version: "3.0" },
  };
}

export function getMlspecNextCommandTemplate(): CommandTemplate {
  return {
    name: "MLSpec: Next Action",
    description:
      "Read-only router that recommends the next action based on workspace state.",
    category: "Workflow",
    tags: ["workflow", "mlspec", "ml", "next", "router", "v3"],
    content: `Recommend the next action based on workspace state.

This is a read-only skill. It never modifies any files.

---

**V3 Priority Order**

1. Empty workspace -> /mlspec-explore
2. No experiments -> /mlspec-propose
3. Draft without prepare -> /mlspec-prepare
4. Prepare not ready -> /mlspec-prepare
5. Need evidence -> /mlspec-run <experiment> <rung>
6. Can resolve -> /mlspec-resolve
7. No clear action -> /mlspec-explore

---

**Routing Checks**

- prepare.md exists? status == ready?
- protocol.md evidence_ladder defined?
- existing evidence files (evidence/<rung>.md)
- can_resolve rung has evidence?

---

**Output Format**

\`\`\`
## Next Recommended Action

### /mlspec-run <experiment> <rung>

### Why?
- prepare.md status: ready
- pilot complete, validation next

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
