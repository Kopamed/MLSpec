## Context

MLSpec was implemented in `add-ml-experiment-workflow` to provide a repo-native intent/evidence/decision layer for ML experimentation. It includes:

- `openspec ml` CLI with commands: init, new baseline/candidate/experiment, add-evidence, decide, promote, archive, status, validate
- Templates for hypothesis.md, evidence.md, decision.md, baseline.md, recipe.md, finding.md
- Validation for structural errors (malformed YAML, missing frontmatter, broken refs) and ML quality warnings (E2<E1, thin evidence for promote, skipped levels)

However, the current templates and validation do not enforce a disciplined experiment protocol. An agent can:
- Run an experiment without creating a hypothesis first
- Record vague results without actual metrics
- Change multiple things at once without controlled variables
- Make promote/reject decisions without rigorous evidence
- Skip evidence levels arbitrarily

This design adds the behavioral layer—the agent experiment protocol—that makes MLSpec a true discipline for empirical claims, not just a file structure.

## Goals / Non-Goals

**Goals:**
- Define a clear before/during/after protocol for agents running ML experiments
- Create AGENTS.md that documents the protocol and is created by `ml init`
- Enhance templates with explicit structured fields (controlled variables, actual_command, interpretation)
- Add validation warnings for missing actual_command and artifact paths (not hard errors—evidence may be reconstructed)
- Add validation error for evidence existing without hypothesis (broken state)
- Add validation warnings for placeholder values like `_auc_delta: _`
- Improve `ml status` to show protocol state: needs hypothesis / needs evidence / needs decision / needs promotion / needs archive

**Non-Goals:**
- No `ml plan-run` command (template editing is sufficient)
- No `ml check` command (validation covers it)
- No enforcement of output conventions (only recommended paths in AGENTS.md)
- No W&B/MLflow/DVC integration (local file workflows supported via recommended paths)
- No automatic decision-making
- No brownfield adoption support (future change)

## Decisions

### 1. AGENTS.md as protocol documentation (vs. CLI prompts)

**Decision:** Create `mlspec/AGENTS.md` during `openspec ml init` that documents the full agent protocol.

**Rationale:**
- Agents can read the file once at session start and internalize the protocol
- CLI prompts interrupt workflow; documentation can be referenced on demand
- The file serves as a contract: "this is how experiments should be run"
- Future agent integrations could check AGENTS.md existence as a precondition

**Alternatives considered:**
- CLI prompts on each command: Too interruptive for automated workflows
- Agent-specific config file: Adds complexity without benefit—markdown is universal
- Hard validation in CLI: Can't prevent agents from running raw scripts without MLSpec

### 2. Warnings, not errors, for missing actual_command and artifacts

**Decision:** Validation warns (not errors) when evidence lacks `actual_command` or `artifacts` paths.

**Rationale:**
- Evidence may be reconstructed post-hoc from logs or memory
- Cloud/remote training runs may not have local command paths
- Agents may import evidence from other systems
- Hard errors would break legitimate workflows where evidence is recorded manually

**The warning:**
```
Evidence file has no actual command recorded.
Evidence may be reconstructed, imported, or recorded manually.
```

**Alternatives considered:**
- Errors: Too strict; breaks post-hoc evidence recording
- No warning: Agent might not realize this is expected
- Info level: Warning is appropriate—something is likely missing

### 2b. Placeholder Values: Errors vs Warnings by Field Type

**Decision:**
- **Metric placeholders** (e.g., `auc_delta: _0.006_`) produce **schema validation errors** because `metrics` is defined as `Record<string, number>`. String values fail type validation.
- **Decision/reasoning placeholders** (e.g., `rejection_reason: _reason_`) produce **warnings** because those fields are strings where `_placeholder_` is a valid string value.

**Rationale:**
- Metrics should always be numeric—recording a string like `_0.006_` instead of a number is a structural error that indicates the evidence was not properly filled in.
- Decision fields are free-form text where `_reason_` is a plausible placeholder—warn but don't error.

### 3. Enhanced hypothesis.md template with controlled variables

**Decision:** Add explicit fields to hypothesis.md:
- Controlled variables (what stays fixed)
- Success criteria (metric thresholds)
- Abort criteria (when to stop early)
- Evidence level plan (E1 → E2 → ...)
- Planned command (optional)
- Expected output path (optional)

**Rationale:**
- Forces agent to think about what is being tested vs. what is being changed
- Makes experiments reproducible and reviewable
- Prevents "everything changed at once" experiments

**Template structure:**
```markdown
## Hypothesis

_What are we trying to test? State the hypothesis clearly._

## Comparison Reference

- **Type**: baseline | candidate
- **Name**: _name_

## Intended Change

_What is being added, removed, or modified? Be specific._

## Controlled Variables

_What stays the same during this experiment?_
- Model / architecture
- Dataset split or sampling strategy
- Preprocessing / input representation
- Optimizer and learning-rate schedule
- Batch size / accumulation
- Seed(s)
- Training budget / epochs / steps / tokens
- Evaluation procedure
- (Add domain-specific variables as relevant, e.g., image size for vision)

## Success Criteria

_What metric improvements justify promotion to the next evidence level?_
- AUC delta > +0.005
- F1 delta > +0.005

## Abort Criteria

_What results would indicate this experiment should be stopped early?_
- AUC delta < -0.010
- Training divergence observed
- Runtime > 2x baseline

## Evidence Level Plan

- [ ] E1: Cheap proxy (1 seed, 10% data)
- [ ] E2: Controlled (3 seeds, full data)
- [ ] E3: Validation (5 seeds, realistic scale)

## Planned Command

Expected command, if known:
```bash
python train.py --config exp-017-cutmix.yaml
```

## Expected Output Location

```
outputs/exp-017-cutmix/E1/
```
```

### 4. Enhanced evidence.md template with actual_command and interpretation

**Decision:** Add explicit fields to evidence.md:
- `actual_command`: The exact command run (not planned command)
- `changed_files`: What was actually modified
- `interpretation`: What the results mean
- `recommendation`: Next action

**Rationale:**
- The gap between "planned" and "actual" is often where experiments fail
- Agents change things during execution; actual_command captures this
- Interpretation forces analysis, not just metric reporting

**Template structure:**
```markdown
---
evidence_level: E1
recommendation: none
comparison_ref:
  entity_type: baseline
  name: baseline-v1
metrics:
  auc_delta: +0.006
  f1_delta: -0.001
compute:
  dataset_fraction: 0.1
  epochs: 10
  seeds: [42]
  runtime: 45m
commands:
  planned: "python train.py --config exp-017-cutmix.yaml"
  executed: "python train.py --config exp-017-cutmix.yaml --cutmix-alpha 0.2"
artifacts:
  metrics_file: outputs/exp-017-cutmix/E1/metrics.json
  checkpoint: outputs/exp-017-cutmix/E1/checkpoint.pt
  log_file: outputs/exp-017-cutmix/E1/train.log
---

## What Was Done

_Describe the experiment setup and what was executed._

## Changed Files

_List the files actually modified for this experiment:_
- `config/augmentation.py`: Added CutMix with alpha=0.2
- `config/train.yaml`: No changes (intentional)

## Results

| Metric | Baseline | This Experiment | Delta |
|--------|----------|-----------------|-------|
| AUC | 0.847 | 0.853 | +0.006 |
| F1 | 0.721 | 0.720 | -0.001 |

## Interpretation

_CutMix shows marginal AUC improvement (+0.006) but slight F1 regression (-0.001).
Signal is weak—possibly noise. Transfer to full dataset uncertain.
Recommend E2 with more seeds to validate._

## Recommendation

- [ ] **promote**: Continue to next evidence level
- [x] **reject**: Abandon this direction
- [ ] **inconclusive**: Need more evidence
- [ ] **retry**: Re-run with modifications
- [ ] **hold**: Wait for other experiments
```

### 5. Enhanced decision.md template with explicit reasoning

**Decision:** Add explicit fields to decision.md:
- Evidence considered (list of evidence files)
- Reasoning (why this decision was made)
- What this does and does not prove

**Template structure:**
```markdown
---
decision: reject
rejection_reason: CutMix showed marginal AUC improvement (+0.006) with slight F1 regression (-0.001).
Signal is within noise range for single-seed E1. Not worth pursuing without stronger evidence.
---

## Decision: Reject

### Evidence Considered

- `evidence/E1.md`: AUC +0.006, F1 -0.001, single seed

### Reasoning

CutMix augmentation provided negligible AUC improvement that is within noise range
for a single-seed experiment. The slight F1 regression is concerning.
Given the added complexity of CutMix implementation and marginal benefit,
this direction does not justify further investment.

### What This Decision Proves

- CutMix with alpha=0.2 does not dramatically improve AUC on this dataset
- The implementation is correct (training completed, no divergence)

### What This Decision Does Not Prove

- CutMix cannot help on this dataset (need E2 with multiple seeds)
- Other alpha values were not tested
- Interaction with other augmentation strategies not explored
```

### 6. Protocol state in status (not a task system)

**Decision:** `openspec ml status` shows protocol state based on file presence and content:

**Active experiment states:**

| State | Condition |
|-------|-----------|
| `needs hypothesis` | No hypothesis.md in experiment directory |
| `needs evidence` | hypothesis.md exists, no evidence files |
| `needs decision` | Has evidence, no decision.md |
| `needs promotion` | decision.md with decision=promote, and no candidate version lists this experiment under `supporting_experiments` |
| `needs archive` | Has decision.md (promoted or not), not yet archived |

**Archived experiments** are shown separately under their archive subdirectory (promoted/rejected/inconclusive/hold/retry).

**Rationale:**
- Existing files and content determine state—no separate task tracking needed
- Agents can check status to know next action
- No new data structures or persistence needed
- Same data, better presentation
- Archived experiments are tracked via their archive location, not a `complete` state

**Implementation:**
```typescript
type ProtocolState = 'needs hypothesis' | 'needs evidence' | 'needs decision' | 'needs promotion' | 'needs archive';

function getProtocolState(experimentDir: string, projectPath: string, experiment: string): ProtocolState {
  const hypothesisPath = path.join(experimentDir, 'hypothesis.md');
  const evidenceDir = path.join(experimentDir, 'evidence');
  const decisionPath = path.join(experimentDir, 'decision.md');
  const experimentMeta = loadExperimentMetadata(projectPath, experiment);

  if (!fs.existsSync(hypothesisPath)) return 'needs hypothesis';
  if (!fs.existsSync(evidenceDir) || fs.readdirSync(evidenceDir).filter(f => f.endsWith('.md')).length === 0) {
    return 'needs evidence';
  }
  if (!fs.existsSync(decisionPath)) return 'needs decision';

  const decision = loadDecision(decisionPath);
  if (decision.decision === 'promote' && decision.target_candidate) {
    // Check if this experiment is listed in any candidate version's supporting_experiments
    const candidateMeta = loadCandidateMetadata(projectPath, decision.target_candidate);
    const hasBeenPromoted = candidateMeta?.versions.some(v =>
      v.supporting_experiments?.includes(experiment)
    );
    if (!hasBeenPromoted) return 'needs promotion';
  }
  if (!isArchived(experimentDir)) return 'needs archive';

  // If archived, it's no longer "active" — shown under archived section instead
  return 'needs archive'; // fallback (shouldn't reach here if archived)
}
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Agents ignore AGENTS.md and run sloppy experiments | Validation catches structural problems; status shows state |
| Placeholder values like `_auc_delta: _` pass validation | Warning generated; agent sees it on `ml validate` |
| Output conventions not followed; artifacts scattered | AGENTS.md documents recommended paths; artifacts field captures actual locations |
| Evidence reconstructed post-hoc has no actual_command | Warning explains evidence may be manual; not a blocker |
| Multiple experiments in flight; unclear which is "active" | Status shows all with state; agent manages queue |

## Recommended Local Output Convention

AGENTS.md documents this as the recommended path structure for local repo-script workflows:

```
outputs/
└── <experiment-name>/
    └── <evidence-level>/
        ├── command.txt      # Actual command executed
        ├── metrics.json     # Numeric metrics
        ├── train.log        # Training logs
        ├── predictions.csv  # Predictions on test set
        ├── checkpoint.pt    # Model checkpoint
        └── diff.patch       # Changes made to codebase
```

This is documented in AGENTS.md, not enforced by validation. Agents using W&B, MLflow, or cloud training can reference those paths in the `artifacts` field instead.