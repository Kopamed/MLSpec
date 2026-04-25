---
description: Promote an MLSpec experiment to a candidate version. Use when an experiment has a promote decision and should be incorporated into a candidate recipe.
---

Promote an MLSpec experiment to a candidate version.

This skill verifies the decision is `promote`, promotes the experiment to a new candidate version, and reminds the user to finalize the draft recipe. **Does not archive.**

---

**Input**: Experiment name and target candidate.

Required:
- Experiment name (e.g., `roi-cropping`)
- Target candidate name (e.g., `resnet-v2`)

Example:
```
mlspec-promote roi-cropping --to resnet-v2
```

---

**Steps**

1. **Validate prerequisites**
   - Confirm MLSpec workspace exists
   - Confirm experiment exists
   - Confirm target candidate exists

2. **Verify decision**
   - Read `experiments/<name>/decision.md`
   - Verify frontmatter has `decision: promote`
   - Verify frontmatter has `target_candidate: <candidate>`
   - Verify target matches the --to argument
   - If decision is not `promote` or target doesn't match, abort with error

3. **Promote the experiment**
   ```bash
   mlspec promote <experiment> --to <candidate>
   ```
   This:
   - Creates a new candidate version (e.g., v1 → v2)
   - Records the experiment as supporting evidence
   - Creates a draft recipe file

4. **Explain the result**
   - Show the new candidate version number
   - Show the draft recipe file location
   - Explain the recipe is in draft status

5. **Remind about next steps**
   - Remind user to edit the draft recipe
   - Explain recipe should be finalized before use
   - Do not archive automatically

6. **Validate workspace**
   ```bash
   mlspec validate
   ```
   Fix any errors.

---

**Output**

```
## Promoted: <experiment> → <candidate>

**New Version**: v<number> (draft)

### What Changed
- Experiment '<experiment>' is now supporting evidence for <candidate>
- New recipe version created: <candidate>/recipe-v<number>.yaml

### Draft Recipe
Location: candidates/<candidate>/recipe-v<number>.yaml

**Important**: This recipe is a draft. Review and finalize before using in training.

### Next Steps
1. Edit candidates/<candidate>/recipe-v<number>.yaml
2. Finalize the recipe when ready
3. Archive the experiment (mlspec-archive)

What would you like to do?
```

**Guardrails**
- **DO NOT** archive the experiment automatically
- **DO NOT** promote if decision is not `promote`
- **DO NOT** promote if target_candidate doesn't match
- **DO** verify decision.md exists and says `promote`
- **DO** verify target candidate exists
- **DO** remind user to edit/finalize the draft recipe
- **DO** validate workspace after promotion
