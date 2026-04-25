---
name: mlspec-propose-experiment
description: Create a new MLSpec experiment with a filled hypothesis. Use when the user wants to formalize an experiment idea with clear hypothesis, success criteria, and evidence plan.
license: MIT
compatibility: Requires openspec CLI and MLSpec workspace
metadata:
  author: openspec
  version: "1.0"
---

Create a new MLSpec experiment with a filled hypothesis.

This skill creates an experiment entry and populates `hypothesis.md` with a well-structured experimental plan. **Do not run training.**

---

**Input**: The experiment name (kebab-case) and context about what to test.

Examples:
```
mlspec-propose-experiment roi-cropping
mlspec-propose-experiment cutmix-augmentation
```

---

**Steps**

1. **Get experiment context**
   - Ask user for the experiment name if not provided
   - Confirm MLSpec workspace exists (run `openspec ml status`)
   - Read `mlspec/evaluation.md` for project context
   - Read relevant baselines and candidates

2. **Create the experiment**
   ```bash
   openspec ml new experiment <name>
   ```
   This creates `experiments/<name>/` with:
   - `.experiment.yaml` metadata
   - `hypothesis.md` (template)

3. **Fill hypothesis.md**
   Read the generated `hypothesis.md` and help the user fill:
   - **Hypothesis**: What are we trying to test? State clearly.
   - **Comparison Reference**: baseline or candidate + name
   - **Intended Change**: What is being added, removed, or modified?
   - **Controlled Variables**: What stays the same? (model, data split, preprocessing, optimizer, seed, budget, evaluation procedure)
   - **Success Criteria**: What metric improvements justify promotion?
   - **Abort Criteria**: What results indicate stopping early?
   - **Evidence Level Plan**: E1-E5 with cheap-to-expensive progression
   - **Planned Command**: Expected training command if known
   - **Expected Output Location**: Where outputs will be saved

4. **Update comparison_ref**
   If user specified a baseline or candidate to compare against, update `.experiment.yaml`:
   ```bash
   # Edit .experiment.yaml to set comparison_ref
   ```

5. **Validate the experiment**
   ```bash
   openspec ml validate
   ```
   Fix any errors before finishing.

6. **Confirm completion**
   Show the experiment structure and summary of hypothesis.

---

**Output**

```
## Experiment Created: <name>

### Hypothesis Summary
<1-2 sentence hypothesis>

### Comparison Reference
<baseline|candidate>: <name>

### Evidence Plan
- E1: <cheap proxy description>
- E2: <controlled description>
- E3: <validation description>
- ...

### Next Steps
1. Run E1 evidence (mlspec-run-evidence)
2. Explore alternatives first (mlspec-explore)
3. Edit hypothesis before proceeding

What would you like to do?
```

**Guardrails**
- **DO NOT** run training or execute commands
- **DO NOT** auto-invoke `mlspec-run-evidence` after creating experiment
- **DO** fill all hypothesis sections with user input
- **DO** ensure comparison_ref is set to a valid baseline or candidate
- **DO** stop before running evidence; ask user what to do next
- **DO** validate the experiment before finishing
