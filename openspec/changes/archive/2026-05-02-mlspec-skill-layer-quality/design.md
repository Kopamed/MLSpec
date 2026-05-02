# mlspec-skill-layer-quality Design

## Overview

This change improves MLSpec V2 skill quality by adding operational hardening that OpenSpec skills already have. Changes are confined to skill template files and their corresponding command templates.

## Principles

1. **Don't break existing behavior** — skills should work the same way, just with better guardrails
2. **Match CLI reality** — skill instructions must reflect actual CLI behavior, not assumed behavior
3. **Be explicit about uncertainty** — pause conditions should enumerate specific ambiguous cases
4. **Use CLI when available** — `mlspec next` CLI already has routing logic; skill should use it first

## Design Decisions

### Pause Conditions Format

Following OpenSpec's pattern:

```
**Pause if:**
- <condition 1>
- <condition 2>
...
```

Each condition should be:
- Specific enough to be actionable
- Linked to a consequence (e.g., "CLI will fail")
- Written from agent's perspective (what it should do when condition is met)

### Blocked Output Format Structure

When a skill cannot proceed:

```
## <Skill> Blocked: <target>

### Why Blocked
<specific reason>

### Options
1. **<Option 1>** - <description>
2. **<Option 2>** - <description>
3. **<Option 3>** - <description>

What would you like to do?
```

### mlspec-next CLI-First Routing

**Before:**
```
## What to Inspect
[full file inspection logic]
```

**After:**
```
## Routing

1. **Try CLI first**
   Run: `mlspec next`
   If output shows actions: use CLI routing

2. **Fallback to file inspection**
   If CLI unavailable or unclear: inspect files directly
```

This ensures skill and CLI produce consistent guidance.

### Evidence Handling in mlspec-run

**Critical insight:** `mlspec add-evidence` CLI FAILS if evidence exists. The skill must handle this.

**Before:**
```
Option B: Record existing results
mlspec add-evidence <experiment> --stage <stage> --metrics '{...}'
```

**After:**
```
## Before Recording Evidence

**Check if evidence exists:**
- Path: `mlspec/experiments/<id>/evidence/<stage>.md`
- If exists: CLI will fail with "Evidence at stage '<stage>' already exists"

**If evidence exists:**
Output blocked state:
- Option 1: **Overwrite** → Agent must:
  1. Delete existing `evidence/<stage>.md`
  2. Record new evidence (run training or use CLI)
  3. Write new evidence file
- Option 2: **Skip** → Take no action, suggest /mlspec-next
- Option 3: **Cancel** → Stop

**If evidence does not exist:**
Proceed with recording.
```

Note: There is NO append support. If user wants to add runs to existing evidence, they must manually edit the evidence file after the skill records the initial evidence.

### mlspec-resolve Pre-flight Checks

```
**Pre-flight Checks**

Before resolving:

1. **Check experiment status**
   - Read: `mlspec/experiments/<id>/experiment.yaml` → status field
   - If status === 'resolved':
     - Output blocked state: "Experiment '<id>' is already resolved"
     - Do NOT proceed
     - Suggest /mlspec-next

2. **Check evidence exists**
   - If no evidence files exist:
     - Show warning: "No evidence recorded. Resolving without evidence is not recommended."
     - Allow proceed if user confirms

3. **Check for evidence conflicts**
   - Read recommendation from each evidence file
   - If smoke recommends 'accept' but final recommends 'reject' (or vice versa):
     - Output blocked state: "Evidence conflict detected"
     - Pause asking how to proceed
```

## File Changes

| File | Changes |
|------|---------|
| `mlspec-explore.ts` | Add pause conditions, add blocked output formats |
| `mlspec-propose.ts` | Add pause conditions, add blocked output formats |
| `mlspec-run.ts` | Add pause conditions, fix evidence handling, add blocked output formats |
| `mlspec-resolve.ts` | Fix author metadata, add pause conditions, add pre-flight checks, add blocked output formats |
| `mlspec-next.ts` | Add CLI-first routing, add pause conditions, add output formats |

## Testing Approach

Verification is via:
1. Build the package: `npm run build`
2. Init smoke test: `mkdir -p /tmp/test && cd /tmp/test && node /path/to/mlspec.js init --tools opencode`
3. Generated skill inspection: Verify SKILL.md files have correct pause conditions and output formats
4. Generated command inspection: Verify command files route correctly and are consistent with skills
5. Run existing tests: `npm test`

No new unit tests are required since these are template/text changes.
