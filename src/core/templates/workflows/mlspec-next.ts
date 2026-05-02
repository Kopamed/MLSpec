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

**Input**: None (read-only inspection)

---

**What to Inspect**

1. **Experiments**
   - Status: draft, running, resolved
   - Evidence completeness
   - Abort criteria met?

2. **Recipes**
   - Tags: current-best, candidate, baseline
   - Lineage and parent chains

3. **Evidence**
   - Recommendations from evidence files
   - Stage progression

4. **Findings**
   - Any pending findings to review

---

**Priority Logic**

Recommend actions in this order:

1. **Failed Abort** - Experiments where abort criteria are met
2. **Ready to Resolve** - Experiments with complete evidence and recommendations
3. **Need Validation** - Experiments with smoke evidence waiting for validation
4. **Need Smoke** - Experiments with no evidence yet
5. **Ready for Final** - Experiments with validation complete
6. **Explore** - If no clear next action

---

**Output Format**

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
    metadata: { author: 'openspec', version: '2.0' },
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

**Priority Order**

1. Failed abort criteria → recommend resolve with reject
2. Complete evidence + recommendation → recommend resolve
3. Smoke complete, no validation → recommend validation run
4. Draft, no evidence → recommend smoke run
5. Validation complete, no final → recommend final run
6. No clear action → recommend explore

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