/**
 * MLSpec Resolve Skill Template (V3)
 *
 * Skill for resolving experiments using separated mechanistic and practical outcomes.
 */
import type { SkillTemplate, CommandTemplate } from '../types.js';

export function getMlspecResolveSkillTemplate(): SkillTemplate {
  return {
    name: 'mlspec-resolve',
    description: 'Resolve an experiment based on evidence from can_resolve rung. Separates mechanistic and practical outcomes.',
    instructions: `Resolve an experiment based on evidence.

This skill reads evidence from the can_resolve=true rung and creates a resolution with separated mechanistic and practical outcomes.

---

## Prerequisites

- Experiment has evidence for a rung with can_resolve=true
- protocol.md defines the evidence ladder
- You have reviewed evidence/<rung>.md for the can_resolve rung

---

**Pause if:**
- Experiment status is 'resolved' → output "already resolved" blocked state
- No evidence exists for any can_resolve=true rung → output "no resolvable evidence" blocked state
- Resolution file already exists → output "resolution exists" blocked state

---

## Resolution Types

| Type | Action |
|------|--------|
| accept | Create new recipe from experiment |
| reject | End experiment, no recipe |
| retry | Return to running with modifications |
| hold | Pause for later review |

---

## Separated Outcomes

V3 separates resolution into two distinct assessments:

### Mechanistic Outcome

**Question:** Does the intervention work as hypothesized?

- **success**: Intervention produces expected mechanistic effect (e.g., EOS tokens produce explicit EOS in generation)
- **failure**: Intervention does NOT produce expected mechanistic effect
- **inconclusive**: Cannot determine mechanistic effect

### Practical Outcome

**Question:** Does the intervention provide practical utility?

- **positive**: Practical metrics improve sufficiently
- **negative**: Practical metrics do NOT improve (or worsen)
- **inconclusive**: Cannot determine practical utility
- **variant_accepted**: Mechanistic hypothesis fails but practical utility succeeds (special case)

---

## Pre-flight Gate Check

**Before resolving, run:**

\`\`\`bash
mlspec resolve <experiment>
\`\`\`

This is a preflight gate checker. It validates:
- No existing resolution.md
- A can_resolve=true rung has evidence

If the gate check fails, the CLI will error. Fix the issue before proceeding.

---

## Steps

### 1. Infer or Confirm

- experiment ID (from active experiments with evidence)
- resolution type (infer from outcomes, or ask)

### 2. Read Evidence from can_resolve Rung

Find the rung with can_resolve=true in protocol.md:
- Read evidence/<rung>.md
- Extract comparison metrics

### 3. Assess Mechanistic Outcome

Based on the hypothesis in hypothesis.md and evidence:

| Evidence Shows | Mechanistic Outcome |
|---------------|-------------------|
| Intervention produces expected effect | success |
| Intervention does NOT produce expected effect | failure |
| Cannot determine | inconclusive |

### 4. Assess Practical Outcome

Based on comparison metrics vs success_criteria:

| Comparison Result | Practical Outcome |
|------------------|-------------------|
| Metrics improve sufficiently | positive |
| Metrics do NOT improve (or worsen) | negative |
| Cannot determine | inconclusive |
| Mechanistic=failure BUT practical=positive | variant_accepted |

### 5. Determine Resolution

| Mechanistic | Practical | Resolution |
|-------------|-----------|------------|
| success | positive | accept |
| success | negative | reject |
| success | inconclusive | hold |
| failure | positive | accept (variant_accepted) |
| failure | negative | reject |
| failure | inconclusive | reject |
| inconclusive | positive | hold |
| inconclusive | negative | reject |
| inconclusive | inconclusive | inconclusive → hold |

### 6. Show Inferred Action

\`\`\`
I'm going to resolve experiment "add-eos-tokens":
- Rung: validation (can_resolve=true)
- Mechanistic outcome: failure (EOS tokens do NOT produce explicit EOS)
- Practical outcome: positive (perplexity improves)
- Resolution: accept (variant_accepted)

Proceeding...
\`\`\`

### 7. Write resolution.md

\`\`\`yaml
---
entity_type: resolution
schema: ml-experiment-v3
experiment_id: add-eos-tokens
resolution: accept
mechanistic_outcome:
  hypothesis: "EOS tokens will produce explicit EOS in generation"
  result: failure
  evidence_ref: evidence/validation.md
  notes: "Generated text does not show explicit EOS patterns"
practical_outcome:
  hypothesis: "Perplexity improves with EOS tokens"
  result: variant_accepted
  evidence_ref: evidence/validation.md
  notes: "Perplexity improves despite mechanistic failure"
decision_rationale: "While the mechanistic hypothesis failed (EOS tokens don't produce explicit EOS), practical utility is positive (perplexity improves by 5%). Accepting as variant_accepted."
supporting_evidence:
  - rung: validation
    comparison_metric: perplexity
    baseline_value: 12.3
    treatment_value: 11.7
    delta: -0.6
created: 2026-05-01T12:00:00Z
---
\`\`\`

### 8. Update Experiment Status

After writing resolution.md:
- Update experiment.yaml status to resolved
- This is done by the skill, NOT by CLI

### 9. Run mlspec validate

After resolving, validate the resolution:
\`\`\`bash
mlspec validate
\`\`\`

---

## Output Format

### Success

\`\`\`
## Experiment Resolved: add-eos-tokens

### Resolution: ACCEPT (variant_accepted)

### Mechanistic Outcome: FAILURE
- Hypothesis: EOS tokens produce explicit EOS in generation
- Result: Failure - generated text does not show explicit EOS patterns

### Practical Outcome: POSITIVE
- Hypothesis: Perplexity improves with EOS tokens
- Result: Positive - perplexity improves by 5% (12.3 → 11.7)

### Decision Rationale
While the mechanistic hypothesis failed, practical utility is positive.
Accepting as variant_accepted.

### Supporting Evidence
| Rung | Metric | Baseline | Treatment | Delta |
|------|--------|----------|-----------|-------|
| validation | perplexity | 12.3 | 11.7 | -0.6 (-5%) |

---

Next: /mlspec-next
\`\`\`

### Blocked: Already Resolved

\`\`\`
## Resolution Blocked: Already Resolved

Experiment '<id>' is already resolved.
It cannot be resolved again.

**Current status:**
- Resolution: see \`mlspec/experiments/<id>/resolution.md\`

**What to do:**
- Use /mlspec-next to find other actions
\`\`\`

### Blocked: No Resolvable Evidence

\`\`\`
## Resolution Blocked: No Resolvable Evidence

No rung with can_resolve=true has evidence yet.

**Can_resolve rungs:**
- pilot: NO evidence
- validation: NO evidence

**What to do:**
- Collect evidence for a can_resolve rung: /mlspec-run <experiment> validation
\`\`\`

### Blocked: Resolution Exists

\`\`\`
## Resolution Blocked: Resolution Exists

resolution.md already exists for this experiment.

**What to do:**
- View existing resolution: cat mlspec/experiments/<id>/resolution.md
- Use /mlspec-next to find other actions
\`\`\`

---

## CLI vs Skill Boundary

**CLI (mlspec resolve) does:**
- Validates no existing resolution.md
- Validates can_resolve=true rung has evidence
- Returns exit code based on gate check

**Skill does:**
- Reads evidence and assesses outcomes
- Writes resolution.md
- Updates experiment.yaml status to resolved

**CLI never:**
- Invokes skills
- Assesses outcomes
- Writes resolution files

---

## Variant Accepted Case

When mechanistic hypothesis fails but practical utility succeeds:

1. Set mechanistic_outcome.result: failure
2. Set practical_outcome.result: variant_accepted (NOT positive)
3. Set resolution: accept
4. Explain the divergence in decision_rationale

Example:
\`\`\`
While the mechanistic hypothesis failed (EOS tokens don't produce explicit EOS),
the practical utility is positive (perplexity improves by 5%).
Accepting as variant_accepted - the intervention works even though the
specific mechanism is different than hypothesized.
\`\`\`

---

**Boundaries**

**Must Do:**
- Read evidence from can_resolve=true rung
- Assess mechanistic outcome separately from practical outcome
- Write resolution.md with separated outcomes
- Update experiment.yaml status to resolved
- Run mlspec validate after resolving

**Forbidden:**
- Run training
- Create evidence files
- Modify protocol.md
`,
    license: 'MIT',
    compatibility: 'Requires MLSpec v3 workspace with protocol.md and evidence',
    metadata: { author: 'mlspec', version: '3.0' },
  };
}

export function getMlspecResolveCommandTemplate(): CommandTemplate {
  return {
    name: 'MLSpec: Resolve Experiment',
    description: 'Resolve an experiment using separated mechanistic and practical outcomes.',
    category: 'Workflow',
    tags: ['workflow', 'mlspec', 'ml', 'experiment', 'resolve', 'v3'],
    content: `Resolve an experiment based on evidence.

This skill resolves an experiment using separated mechanistic and practical outcomes.

---

**Pre-flight gate check:**

Run \`mlspec resolve <experiment>\` to validate:
- No existing resolution.md
- can_resolve=true rung has evidence

---

**Separated Outcomes:**

| Outcome | Result |
|---------|--------|
| Mechanistic | success / failure / inconclusive |
| Practical | positive / negative / inconclusive / variant_accepted |

---

**Resolution Matrix:**

| Mechanistic | Practical | Resolution |
|-------------|-----------|------------|
| success | positive | accept |
| success | negative | reject |
| failure | positive | accept (variant_accepted) |
| failure | negative | reject |
| inconclusive | any | hold |

---

**Steps**

1. **Infer/Confirm** experiment and resolution type
2. **Run preflight gate check** (mlspec resolve)
3. **Read evidence** from can_resolve=true rung
4. **Assess mechanistic outcome** (success/failure/inconclusive)
5. **Assess practical outcome** (positive/negative/inconclusive/variant_accepted)
6. **Write resolution.md** with separated outcomes
7. **Update experiment.yaml status** to resolved
8. **Run mlspec validate**

---

**Blocked State: Already Resolved**

Use /mlspec-next.

---

**Blocked State: No Resolvable Evidence**

Collect evidence for a can_resolve rung first.

---

**Variant Accepted:**

When mechanistic=failure but practical=positive:
- Set practical.result: variant_accepted
- Set resolution: accept
- Explain divergence in decision_rationale

---

**Boundaries**

**Allowed:** Assess outcomes, write resolution
**Forbidden:** Run training, modify protocol
`,
  };
}