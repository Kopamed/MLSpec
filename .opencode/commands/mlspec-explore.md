---
description: Explore ML experiments, recipes, evidence, and identify promising directions (MLSpec V2)
---

Explore the MLSpec workspace to understand current recipes, experiments, evidence, and findings.

**Usage**: `/mlspec-explore` or `/mlspec-explore <optional-focus-question>`

**When to use**:
- Want to understand the current ML workspace state
- Identifying promising experiment directions
- Inspecting recipe lineage and performance
- Reviewing active experiments and their status
- Reasoning about failure modes

**What it does**:
1. Inspects recipes (mlspec/recipes/*/recipe.yaml) for current-best and variants
2. Reviews active experiments (mlspec/experiments/*/experiment.yaml)
3. Examines evidence files (mlspec/experiments/*/evidence/*.md)
4. Considers findings and past experiments
5. Identifies opportunities for new experiments

**Output**: Exploration results with current best recipe, active experiments, and recommended next experiment

**Next step**: After exploration, use `/mlspec-propose` to formalize a new experiment

For detailed skill instructions, see: `.opencode/skills/mlspec-explore/SKILL.md`
