/**
 * MLSpec Propose Skill Template (V3)
 *
 * Skill for creating experiments with protocol.md defining the evidence ladder.
 */
import type { SkillTemplate, CommandTemplate } from '../types.js';

export function getMlspecProposeSkillTemplate(): SkillTemplate {
  return {
    name: 'mlspec-propose',
    description: 'Create a new MLSpec experiment from an idea with protocol.md defining the evidence ladder.',
    instructions: `Create a new MLSpec experiment from an idea.

This skill creates an experiment with protocol.md defining the evidence ladder. It infers missing context from workspace and conversation.

---

## V3 Experiment Structure

V3 experiments have three key files:
- **experiment.yaml**: Status, base_recipe, proposed_recipe
- **hypothesis.md**: Mechanistic and practical hypotheses
- **protocol.md**: Evidence ladder, compute agreement, baseline requirements

The protocol.md defines the evidence ladder - a sequence of rungs with budgets, arms, and comparison criteria.

---

**Pause if:**
- Context is genuinely ambiguous after inference → ask one clarifying question
- User wants to skip protocol definition → "A protocol is required for V3 experiments."
- User wants to run training during proposal → "Training happens during /mlspec-run, not /mlspec-propose."

---

## Steps

### 1. Infer Context

- Check for prior /mlspec-explore output suggesting an experiment
- Look for current-best recipe to use as base
- Check active experiments to avoid duplicate ideas

### 2. Confirm or Ask for:
- experiment ID (kebab-case, e.g., add-eos-tokens)
- base_recipe (the recipe you're modifying)
- proposed_recipe (the new recipe ID you'll create if accepted)
- proposed_change (what you're changing)

### 3. Design the Evidence Ladder

**This is the key V3 decision - design the evidence ladder:**

Ask the user to define:

1. **Rungs** - What evidence stages do you need?
   - Example: pilot (cheap, quick check) → validation (full evaluation)
   - Each rung has: id, purpose, budget, arms, benchmark, comparison, can_resolve

2. **Per-Rung Budget**
   - model_params: How large is the model?
   - training_tokens: How many tokens to train on?
   - eval_tokens: How many tokens for evaluation?

3. **Arms** - What are you comparing?
   - baseline_arm: Recipe reference or null for new
   - treatment_arm: Base recipe with config_overrides for intervention

4. **Benchmark** - What dataset and metrics?
   - dataset: Name of benchmark dataset
   - metrics: Array of metric names to evaluate

5. **Comparison** - How do you define success?
   - comparison_required: true/false
   - comparison_metric: Which metric to compare?
   - comparison_direction: higher_is_better or lower_is_better
   - success_threshold: What delta qualifies as success?

6. **can_resolve** - Which rung can resolve the experiment?
   - Typically the final/last rung
   - pilot rung should have can_resolve=false

7. **Baseline Requirements per Rung**
   - required: Is a baseline required for this rung?
   - recipe_ref: Existing recipe or null
   - train_from_scratch: Should we train from scratch?

### 4. Create the Experiment

Create experiment directory with:
- experiment.yaml
- hypothesis.md
- protocol.md

### 5. Fill hypothesis.md

Help the user define:
- **Mechanistic Hypothesis**: What mechanism are you testing?
- **Practical Hypothesis**: What practical utility do you expect?

### 6. Create protocol.md

\`\`\`yaml
---
entity_type: protocol
schema: ml-experiment-v3
experiment_id: add-eos-tokens
compute_agreement:
  cpu_cores: 8
  gpu_devices: 1
  gpu_memory_gb: 40
  wall_time_max_hours: 24
  token_budget: 1000000000
evidence_ladder:
  - id: pilot
    purpose: Quick check if intervention works at all
    budget:
      model_params: 124000000
      training_tokens: 1000000
      eval_tokens: 500000
    arms:
      baseline_arm:
        id: baseline
        recipe_ref: baseline-v1
        config_overrides: {}
        train_from_scratch: false
      treatment_arm:
        id: treatment
        recipe_ref: baseline-v1
        config_overrides:
          intervention: eos_tokens
    benchmark:
      dataset: wikipedia
      metrics: [perplexity, accuracy]
    comparison:
      comparison_required: false
    can_resolve: false
  - id: validation
    purpose: Full evaluation with statistical significance
    budget:
      model_params: 124000000
      training_tokens: 1000000000
      eval_tokens: 10000000
    arms:
      baseline_arm:
        id: baseline
        recipe_ref: baseline-v1
        config_overrides: {}
        train_from_scratch: false
      treatment_arm:
        id: treatment
        recipe_ref: baseline-v1
        config_overrides:
          intervention: eos_tokens
    benchmark:
      dataset: wikipedia
      metrics: [perplexity, accuracy]
    comparison:
      comparison_required: true
      comparison_metric: perplexity
      comparison_direction: lower_is_better
      success_threshold: -0.05
    can_resolve: true
baseline_requirements:
  pilot:
    required: true
    recipe_ref: baseline-v1
    train_from_scratch: false
  validation:
    required: true
    recipe_ref: baseline-v1
    train_from_scratch: false
---
\`\`\`

### 7. Validate

\`\`\`bash
mlspec validate
\`\`\`

---

## Protocol Design Questions

When designing the evidence ladder, ask:

1. **How many rungs?**
   - At minimum: pilot (can it work?) + validation (does it work at scale?)
   - Some experiments need intermediate rungs

2. **What token budget per rung?**
   - pilot: ~1M tokens (quick check)
   - validation: ~1B tokens (full evaluation)

3. **Which rung can resolve?**
   - Usually the final/last rung
   - pilot should NOT have can_resolve=true

4. **Is comparison required for pilot?**
   - Usually NO - pilot is just a quick check
   - Usually YES - validation needs formal comparison

---

## Output Format

\`\`\`
## Experiment Created: add-eos-tokens

### Summary
- **Base**: baseline-v1
- **Proposed**: eos-token-v1
- **Change**: Add EOS tokens to improve perplexity

### Evidence Ladder
| Rung | Purpose | Can Resolve |
|------|---------|-------------|
| pilot | Quick check | No |
| validation | Full evaluation | Yes |

### Next Steps
1. Run prepare stage: /mlspec-prepare add-eos-tokens
2. Collect pilot evidence: /mlspec-run add-eos-tokens pilot
3. Collect validation evidence: /mlspec-run add-eos-tokens validation
4. Resolve experiment: /mlspec-resolve add-eos-tokens
\`\`\`

---

## CLI vs Skill Boundary

**CLI (mlspec validate) does:**
- Validates experiment.yaml, hypothesis.md, protocol.md exist
- Validates protocol.md schema
- Validates evidence_ladder is non-empty

**Skill does:**
- Creates experiment files
- Designs evidence ladder with user
- Writes protocol.md

**CLI never:**
- Invokes skills
- Designs experiments
- Makes ML decisions

---

**Boundaries**

**Creates:**
- mlspec/experiments/<id>/experiment.yaml
- mlspec/experiments/<id>/hypothesis.md
- mlspec/experiments/<id>/protocol.md

**Must Define:**
- base_recipe, proposed_recipe, proposed_change
- evidence_ladder with rungs, budgets, arms, benchmarks, comparison
- baseline_requirements per rung

**Forbidden:**
- Run training
- Accept/reject/retry/hold/inconclusive
- Collect evidence
`,
    license: 'MIT',
    compatibility: 'Requires MLSpec v3 workspace',
    metadata: { author: 'mlspec', version: '3.0' },
  };
}

export function getMlspecProposeCommandTemplate(): CommandTemplate {
  return {
    name: 'MLSpec: Propose Experiment',
    description: 'Create a new MLSpec experiment with protocol.md defining the evidence ladder.',
    category: 'Workflow',
    tags: ['workflow', 'mlspec', 'ml', 'experiment', 'propose', 'v3'],
    content: `Create a new MLSpec experiment from an idea.

This skill creates an experiment with protocol.md defining the evidence ladder.

---

**Key V3 Decision:** Design the evidence ladder

Ask the user to define:
1. Rungs (e.g., pilot → validation)
2. Budget per rung (model_params, training_tokens)
3. Arms (baseline vs treatment)
4. Benchmark (dataset, metrics)
5. Comparison (required, metric, threshold)
6. can_resolve (which rung can end the experiment)

---

**Creates:**
- experiment.yaml
- hypothesis.md
- protocol.md

---

**Next Steps:**
1. /mlspec-prepare - engineering readiness
2. /mlspec-run <rung> - collect evidence
3. /mlspec-resolve - assess outcomes

---

**Boundaries**

**Forbidden:** Run training, resolve experiments`,
  };
}
