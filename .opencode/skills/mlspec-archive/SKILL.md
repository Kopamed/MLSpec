---
name: mlspec-archive
description: Archive a decided MLSpec experiment. Use when an experiment has been decided and should be moved to the archive.
license: MIT
compatibility: Requires openspec CLI and MLSpec workspace
metadata:
  author: openspec
  version: "1.0"
---

Archive a decided MLSpec experiment.

This skill verifies the experiment has a decision, checks if promotion was already completed (for promote decisions), archives the experiment, and reminds to update findings. **Does not promote.**

---

**Input**: Experiment name.

Example:
```
mlspec-archive roi-cropping
```

---

**Steps**

1. **Validate prerequisites**
   - Confirm MLSpec workspace exists
   - Confirm experiment exists

2. **Check decision exists**
   - Read `experiments/<name>/decision.md`
   - Verify frontmatter has `decision` field
   - If no decision, prompt user to run `mlspec-decide` first

3. **Check promotion status (for promote decisions)**
   - If decision is `promote`:
     - Check if `target_candidate` exists in decision
     - Verify the candidate metadata includes this experiment in supporting_experiments
     - If promotion not done, prompt user to run `mlspec-promote` first

4. **Archive the experiment**
   ```bash
   openspec ml archive <experiment>
   ```
   This moves the experiment to `archive/<decision_subdir>/<name>/`

5. **Confirm archive location**
   - Show the archive subdirectory based on decision:
     - `promote` → `archive/promoted/`
     - `reject` → `archive/rejected/`
     - `inconclusive` → `archive/inconclusive/`
     - `hold` → `archive/held/`
     - `retry` → `archive/retry/`

6. **Remind to update findings**
   - Remind user to update relevant files under `mlspec/findings/` and, if the result changes evaluation assumptions, `mlspec/evaluation.md`.

7. **Validate workspace**
   ```bash
   openspec ml validate
   ```
   Fix any errors.

---

**Output**

```
## Archived: <experiment>

**Decision**: <decision>
**Archive Location**: archive/<subdir>/<name>/

### Summary
<Brief summary of what was decided and key findings>

### After Archiving
- Experiment is no longer active
- Findings should be captured under `mlspec/findings/` when relevant.

### Next Steps
1. Update relevant files under `mlspec/findings/` if this result changes experiment knowledge
2. Start a new experiment (mlspec-propose-experiment)
3. Explore other areas (mlspec-explore)

Done! The experiment has been archived.
```

**Guardrails**
- **DO NOT** promote the experiment
- **DO NOT** archive without a decision
- **DO NOT** archive promote decisions that haven't been promoted yet
- **DO** verify decision.md exists with a valid decision
- **DO** check promotion was completed for promote decisions
- **DO** remind user to update findings
- **DO** validate workspace after archiving
