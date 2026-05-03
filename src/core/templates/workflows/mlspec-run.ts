/**
 * MLSpec Run Skill Template
 *
 * Skill for running or recording evidence for experiments.
 */
import type { SkillTemplate, CommandTemplate } from "../types.js";

export function getMlspecRunSkillTemplate(): SkillTemplate {
  return {
    name: "mlspec-run",
    description:
      "Run or record evidence for an experiment at a specific stage (smoke, validation, final). Infers experiment ID and stage from context.",
    instructions: `Run or record evidence for an experiment.

This skill records evidence for an experiment at a specific stage. It infers the experiment ID and stage from workspace state and conversation context.

---

**Pause if:**
- Evidence file already exists for the target stage → output blocked state with overwrite/skip options
- Base recipe has no metrics → "Cannot compare results without baseline metrics."
- User provides unclear or incomplete results → ask for clarification

---

## Baseline Evaluation Mode

**FIRST**: Check if experiments exist in \`mlspec/experiments/\`.

If no experiments exist but baseline recipe(s) exist, enter **baseline evaluation mode**:

### Baseline Evaluation Steps

1. **Identify Baseline Recipe**
   - Find recipe with current-best tag
   - If no current-best tag, use the baseline-tagged recipe
   - If multiple baseline recipes, infer or ask which to evaluate

2. **Check for Existing Metrics**
   - If baseline already has metrics: suggest they are established and recommend /mlspec-propose
   - If baseline has no metrics: offer to run evaluation

3. **Show Inferred Action**

   \`\`\`
   I'm going to evaluate the baseline recipe:
   - Recipe: <baseline-id>
   - Goal: Establish baseline metrics for comparison

   Proceeding...
   \`\`\`

4. **Record Baseline Metrics**
   - Update mlspec/recipes/<id>/recipe.yaml top-level \`metrics\` field
   - May update mlspec/recipes/<id>/summary.md
   - Must NOT create experiment evidence files (those go under mlspec/experiments/<id>/evidence/)

5. **Baseline Evaluation Output Format**

   \`\`\`
   ## Baseline Evaluation Complete: <baseline-id>

   ### Metrics Established
   | Metric | Value |
   |--------|-------|
   | accuracy | 0.934 |
   | f1 | 0.921 |

   ### Summary
   <Brief summary of baseline behavior>

   ### Next Steps
   1. Propose first experiment: /mlspec-propose <experiment-id> --from <baseline-id>
   2. Explore alternatives: /mlspec-explore

   Next: /mlspec-propose
   \`\`\`

---

## Normal Mode: Experiment Evidence

(When experiments exist, proceed with normal evidence recording below)

**Input**: Optional experiment ID and/or stage.

---

**Stage Inference Rules**

| Evidence State | Default Stage |
|----------------|---------------|
| No evidence yet | smoke |
| smoke exists, no validation | validation |
| validation exists | ask (could be more validation or final) |
| final exists | ask (experiment may be ready for resolution) |

---

**Steps**

1. **Infer or Confirm**
   - experiment ID (from context, conversation, or ask)
   - stage (from evidence state or ask)
   - Confirm base_recipe and proposed_change match intent

2. **Show Inferred Action**

   \`\`\`
   I'm going to record evidence for experiment "add-roi-cropping":
   - Stage: validation
   - Base: rf-mfcc-v1
   - Proposed change: Add ROI cropping

   Proceeding...
   \`\`\`

3. **Before Recording Evidence**

   **Pre-flight Check (use JSON if available):**

   Run: \`mlspec status --experiment <id> --json\`

   If JSON output is available, use it to determine:
   - \`missing_stages\`: Array of stages that have no evidence yet
   - \`ready_to_resolve\`: Whether the experiment has recommendations and is ready to resolve
   - \`evidence_stages.<stage>.exists\`: Whether evidence for this stage exists

   If JSON command fails, fall back to file inspection:
   - Path: \`mlspec/experiments/<id>/evidence/<stage>.md\`
   - If exists: CLI will fail with "Evidence at stage '<stage>' already exists"

   **If evidence exists:**
   Output blocked state (see below).
   Do NOT call \`mlspec add-evidence\`.

   **If evidence does not exist:**
   Proceed with recording.

4. **Run or Record**

   Option A: Run actual training
   \`\`\`bash
   # Run your training command
   python train.py --config mlspec/recipes/rf-mfcc-v1/config.yaml --modifications roi-cropping
   \`\`\`

   Option B: Record existing results
   \`\`\`bash
   mlspec add-evidence <experiment> --stage <stage> --metrics '{"accuracy": 0.945}'
   \`\`\`

5. **Update Evidence File**
   - Read experiment.yaml and hypothesis.md
   - Create/update mlspec/experiments/<id>/evidence/<stage>.md
   - Record runs, metrics, artifacts
   - Set recommendation based on results

6. **Show Summary**

   \`\`\`
   ## Evidence Recorded: add-roi-cropping (validation)

   ### Results
   | Seed | Accuracy | F1 |
   |------|----------|-----|
   | 42 | 0.945 | 0.932 |
   | 43 | 0.942 | 0.929 |
   | 44 | 0.947 | 0.934 |

   ### Aggregate
   - Accuracy: 0.945 ± 0.002
   - F1: 0.932 ± 0.002

   ### Comparison to Base (rf-mfcc-v1)
   - Accuracy: +1.1% (0.934 -> 0.945)
   - F1: +0.8% (0.924 -> 0.932)

   ### Recommendation
   Positive signal! Consider proceeding to final or resolving.

    Next: /mlspec-resolve add-roi-cropping
    \`\`\`

### Blocked: Evidence Exists

\`\`\`
## Evidence Recording Blocked

Evidence at stage '<stage>' already exists for experiment '<id>'.
The CLI will fail if you try to overwrite.

**Options:**
1. **Overwrite** - Delete existing evidence file and record new results
2. **Skip** - Use existing evidence and take no action
3. **Cancel** - Stop and use /mlspec-next to find other actions

What would you like to do?
\`\`\`

---

**Evidence File Structure**

Each evidence file (smoke.md, validation.md, final.md) contains:

\`\`\`yaml
---
entity_type: evidence
experiment_id: add-roi-cropping
stage: validation
created: 2026-05-01T12:00:00Z
runs:
  - seed: 42
    command: python train.py ...
    completed: 2026-05-01T12:30:00Z
    duration_minutes: 30
    metrics:
      accuracy: 0.945
      f1: 0.932
aggregate:
  accuracy:
    mean: 0.945
    std: 0.002
  f1:
    mean: 0.932
    std: 0.002
summary: "ROI cropping improves accuracy by ~1%"
recommendation: accept
---

## Evidence Summary
...
\`\`\`

---

## Run-Readiness: Dataset Profiling

Before recording evidence for full training runs (not smoke), ensure dataset profiling is documented in the evidence body.

### Dataset Profiling Checklist

In the evidence Markdown body, include a section like:

\`\`\`markdown
## Dataset Profile

- raw_examples: <count>
- raw_token_count: <count>
- generated_sequences: <count after tokenization/chunking>
- generated_tokens: <count>
- seq_len: <e.g., 256, 512, 1024>
- chunking_strategy: <e.g., first, random, sliding-window>
- packing_strategy: <e.g., none, greedy, sorted>
- avg_raw_tokens_per_example: <average tokens per raw example>
- tokens_per_epoch: <estimated tokens per epoch>
- planned_training_tokens: <tokens_per_epoch * num_epochs>

### Dataset Efficiency Metrics

- generated_tokens / raw_token_count: <retention ratio>
- dropped_token_ratio: <tokens lost to chunking/packing>
- padding_ratio: <fraction of sequence that is padding>
- avg_tokens_per_sequence: <generated_tokens / generated_sequences>
- sequence_utilization: <avg_tokens_per_sequence / seq_len>
\`\`\`

### TinyStories Anomaly Detection

If avg_raw_tokens_per_example is 50-70 tokens with seq_len=256, flag:
> "High chunking overhead: avg example 50-70 tokens with seq_len=256 means most of sequence is padding"

If generated_tokens is much smaller than raw_token_count (e.g., < 0.3x), flag:
> "Suspiciously low generated_tokens relative to raw_token_count - verify chunking/packing is intentional"

---

## Run-Readiness: Accelerator Preflight

Before running training, check accelerator availability:

- CUDA availability and GPU count
- ROCm availability and GPU count
- MPS (Apple Silicon) availability
- CPU-only fallback
- dtype support: bf16, fp16, fp32

### Full Training Requires Accelerator

If full training is requested and no accelerator is available:
> "Full training on CPU is not recommended; use smoke stages only or explicitly acknowledge CPU intent"

### Smoke Stages on CPU

Smoke-import and smoke-onebatch may proceed on CPU with explicit user acknowledgment.

---

## Run-Readiness: Training Ladder

For evidence body, include training ladder checklist:

\`\`\`markdown
## Training Ladder

- [ ] smoke-import: completed (N steps)
- [ ] smoke-onebatch: completed (N steps)
- [ ] smoke-tinyoverfit: completed (N steps, overfit_loss=X)
- [ ] checkpoint-short: completed (path: ...)
- [ ] resume-checkpoint: completed
- [ ] full-run: completed (max_steps=N, max_tokens=N)
\`\`\`

Full-run evidence requires earlier ladder stages to be completed.

---

## Run-Readiness: Live Logging

When running training, use live logging with tee:

- Recommended: Pipe output through \`tee outputs/<experiment-id>/logs/training.log\`
- NOT recommended: \`| tail -30\` or tail-only patterns

Create log directory before training: \`outputs/<experiment-id>/logs/\` (runtime-only, not version-controlled)

---

## Run-Readiness: Preprocessing Cache

In the evidence body, document preprocessing cache:

\`\`\`markdown
## Preprocessing Cache

- cache_key: <hash-of-data-and-preprocessing>
- cache_valid: true/false
- data_hash: <hex-string>
- preprocessing_version: <version-string>
- cache_location: outputs/<experiment-id>/cache/
\`\`\`

Cache artifacts are runtime-only state; do not commit to version control.

---

## Target-Leakage Sanity Check

Before accepting training evidence, verify autoregressive training is correctly shifted.

### Label Shift Check

Evidence Markdown body SHALL include one of:
- \`autoregressive_shift_verified: true\` with verification method description
- \`autoregressive_shift_not_applicable: true\` with reason

### Causal LM Verification

When claiming \`autoregressive_shift_verified: true\`, document the verification method:

**Code review:** Cite specific file and line where loss is computed, the slice used (\`logits[:, :-1, :]\` vs \`logits[:, 1:, :]\`), confirmation that input_ids is shifted correctly.

**Unit test:** Include test name/location, verify with input_ids \`[A, B, C, D]\` loss at position 0 is computed against token B not A, test output showing loss is non-zero on shifted targets.

### Near-Zero Loss Warning

If training loss drops below 0.01:
> "Near-zero loss detected. Verify autoregressive shift is correct."

Include \`loss_sanity_note\` in evidence explaining why loss is reasonable.

### Loss-Generation Consistency

If loss is near-zero AND generation collapse metrics indicate bad generation:
> "SANITY CHECK FAILED: Near-zero loss with bad generation indicates possible target-leakage"

The skill SHALL stop and require an investigation note before writing/accepting evidence.

With investigation note, evidence MAY be recorded with \`sanity_override: true\`.

---

## Generation-Collapse Metrics

Evidence Markdown body SHALL include:

\`\`\`markdown
## Generation Collapse Metrics

- repetition_rate: <ratio of repeated n-grams>
- distinct_1: <ratio of unique unigrams to total tokens>
- distinct_2: <ratio of unique bigrams to total tokens>
- max_token_run: <longest run of repeated tokens>
- punctuation_only_ratio: <ratio of punctuation-only tokens>
- special_token_ratio: <ratio of special tokens>
- top_token_frequency: <frequency of most common token>
\`\`\`

### Warning Thresholds

- repetition_rate > 0.3: "High repetition detected"
- distinct_1 < 0.3: "Low vocabulary diversity"
- max_token_run > 10: "Long repeated token run detected"

### Collapse Threshold

If repetition_rate > 0.7 OR distinct_1 < 0.1 OR max_token_run > 50:
> "Generation collapse detected"

The skill SHALL stop and require an investigation note before writing/accepting evidence.

### Fixed-Prompt Samples

Include samples from 3-5 fixed prompts in evidence. Document prompts for reproducibility.
Generate samples using fixed temperature (e.g., 0.8) and top-p (e.g., 0.9).

---

**Boundaries**

**Baseline Evaluation Mode (no experiments):**
- Updates: mlspec/recipes/<id>/recipe.yaml top-level \`metrics\` field
- May update: mlspec/recipes/<id>/summary.md
- Forbidden: Create experiment evidence files (those go under mlspec/experiments/<id>/evidence/)

**Normal Mode (experiments exist):**
**Must Do:**
- Read experiment.yaml and hypothesis.md
- Confirm base_recipe and proposed_change
- Create/update evidence/<stage>.md
- Record metrics, artifacts, runs

**Forbidden:**
- Accept/reject/retry/hold/inconclusive
- Create recipe nodes
- Tag current-best

---

**When Ambiguous**

If multiple experiments or stages are plausible, ask one question:
\`\`\`
I see two active experiments:
1. add-roi-cropping (smoke complete, needs validation)
2. tune-n-estimators (draft, no evidence)

Which experiment should I record evidence for?
\`\`\`
`,
    license: "MIT",
    compatibility: "Requires MLSpec v2 workspace",
    metadata: { author: "mlspec", version: "2.0" },
  };
}

export function getMlspecRunCommandTemplate(): CommandTemplate {
  return {
    name: "MLSpec: Run Evidence",
    description:
      "Run or record evidence for an experiment at smoke, validation, or final stage.",
    category: "Workflow",
    tags: ["workflow", "mlspec", "ml", "experiment", "run", "evidence"],
    content: `Run or record evidence for an experiment.

This skill records evidence at a specific stage (smoke/validation/final).

---

**Pause if:**
- Evidence file already exists → blocked state (overwrite/skip/cancel)
- Base recipe has no metrics → "Cannot compare without baseline metrics"

---

**Input**: Optional experiment ID and stage.

---

**Stage Inference**

| State | Default Stage |
|-------|--------------|
| No evidence | smoke |
| smoke complete | validation |
| validation complete | ask |

---

**Before Recording Evidence**

Run \`mlspec status --experiment <id> --json\` for pre-flight checks.
Use \`missing_stages\` and \`evidence_stages.<stage>.exists\` to determine state.

If JSON command fails, fall back to checking file existence at:
\`mlspec/experiments/<id>/evidence/<stage>.md\`

---

**Steps**

1. **Infer/Confirm** experiment ID and stage
2. **Show Inferred Action**
3. **Check for existing evidence** (if exists → blocked state)
4. **Run Training or Record Results**
5. **Update evidence/<stage>.md**
6. **Show Summary**

---

**Blocked State: Evidence Exists**

Options:
1. **Overwrite** - Delete file and record new results
2. **Skip** - Use existing evidence, take no action
3. **Cancel** - Stop, use /mlspec-next

---

**Evidence Structure**

runs: [{seed, command, metrics, ...}]
aggregate: {metric: {mean, std}, ...}
recommendation: accept/reject/none

---

**Boundaries**

**Allowed:** Record evidence, run training
**Forbidden:** Resolve, create recipes, tag current-best

---

**When Ambiguous**

Ask one question about which experiment or stage.`,
  };
}
