---
name: mlspec-explore
description: Explore ML experiment ideas and analyze problems. Use when the user wants to think through an ML problem, investigate failures, or brainstorm experiment approaches before committing to a direction.
license: MIT
compatibility: Requires openspec CLI and MLSpec workspace
metadata:
  author: openspec
  version: "1.0"
---

Explore ML experiment ideas and analyze problems.

This skill enters thinking mode for ML experimentation. Read the MLSpec workspace, inspect code and data, analyze failure modes, and propose experiment directions. **Do not run training or modify code.**

---

**Input**: The user's request should describe what they want to explore. Examples:

```
I want to try ROI cropping
Maybe CutMix helps
The model is failing on small objects
How do I improve this competition score?
```

---

**Steps**

1. **Understand the user's question**
   - Listen for what's bothering them about their ML system
   - Identify if they have a hypothesis, a problem, or an open question
   - If vague, ask clarifying questions to narrow focus

2. **Read MLSpec workspace context**
   - Check `mlspec/evaluation.md` for project overview
   - List baselines: `openspec ml status` (baselines section)
   - List candidates: `openspec ml status` (candidates section)
   - Read current findings if present
   - Check for active experiments and their status

3. **Inspect relevant code and artifacts**
   - Model architecture files
   - Training configuration
   - Data preprocessing
   - Evaluation metrics
   - Existing experiment outputs if available

4. **Analyze the problem space**
   - Identify possible failure modes
   - Consider signal vs noise in metrics
   - Think about validation risks (data leakage, proxy metrics, etc.)
   - Consider controlled variables that matter for the domain
   - Identify what experiments could test the hypothesis

5. **Share findings and recommendations**
   - Present analysis in clear language
   - Use ASCII diagrams to illustrate concepts if helpful
   - Suggest experiment approaches with rationale
   - Explain tradeoffs between approaches
   - Identify controlled variables to maintain

6. **Offer next steps**
   - Suggest creating an MLSpec experiment if direction is clear
   - Offer to explore a specific aspect in more depth
   - Ask what resonates or what to investigate further

---

**Output**

```
## Exploration: <topic>

### Problem Understanding
<What the problem is and why it matters>

### Current Context
<Relevant baselines, candidates, findings, or prior experiments>

### Analysis
<Failure modes, signal/noise considerations, validation risks>

### Possible Experiments
1. **<experiment name>**: <brief description>
   - Controlled variables: <what stays the same>
   - Success criteria: <what would validate the approach>
   - Risks: <what could go wrong>

2. ...

### Recommendations
<If a direction seems promising, explain why>
```

**Guardrails**
- **DO NOT** run training or execute commands
- **DO NOT** modify training code, config files, or data
- **DO NOT** create experiments unless explicitly asked
- **DO** read evaluation.md, baselines, candidates, findings, and active experiments
- **DO** inspect code and artifacts for context
- **DO** think through failure modes and validation risks
- **DO** suggest experiments only if the user asks or the direction is clear
