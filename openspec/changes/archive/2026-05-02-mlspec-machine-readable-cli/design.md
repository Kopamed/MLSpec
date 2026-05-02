## Context

The MLSpec CLI currently outputs only human-readable markdown to stdout. The skill templates (introduced in 2.0.2) describe CLI-first routing, but the CLI provides no structured output. Skills must either parse fragile markdown or perform direct file inspection, defeating the purpose of CLI-first design.

**Current state:**
- `mlspec next`: Outputs human-readable suggestions (lines 1485-1493 of `src/mlspec/cli/index.ts`)
- `mlspec status`: Outputs human-readable workspace summary (lines 1516-1570)
- `mlspec show evidence`: Outputs human-readable evidence summary (lines 872-904)
- `mlspec show recipe`: Outputs human-readable recipe details (exists but not shown)

**Constraints:**
- Human-readable output must remain the default (backward compatibility)
- JSON output is opt-in via `--json` flag
- Cross-platform: use `path.join()` for paths, not hardcoded slashes
- Existing entity schemas in `src/mlspec/entity-types.ts` define the data shapes
- Stage universe is fixed: smoke, validation, final

## Goals / Non-Goals

**Goals:**
- Add `--json` flag to `next`, `status`, `show recipe`, `show evidence` commands
- Add `status --experiment <id>` subcommand with `--json` support only
- Update skill templates to prefer JSON CLI output with fallback to file inspection
- Maintain backward compatibility: human-readable remains default

**Non-Goals:**
- Evidence mutation lifecycle (`--overwrite`, `--append-run`)
- Recipe metrics setter command
- Schema or file format changes
- Human-readable experiment status (use `--json` only)
- Changing default human-readable output

## Decisions

### Decision 1: JSON structure for `mlspec next --json`

**Choice:** Return an object with `workspace_state` and `actions` array. Actions sorted by ascending priority. Each action includes `action_type`.

```typescript
interface NextJsonOutput {
  workspace_state: {
    recipes_count: number;
    experiments_count: number;
    current_best_recipes: string[];  // All recipes with 'current-best' tag
    current_best_recipe: string | null;  // Only when exactly 1 exists
  };
  actions: Array<{
    priority: number;  // Lower number = higher priority; sorted ascending
    action_type: 'explore' | 'propose' | 'run' | 'resolve' | 'bootstrap' | 'none';
    suggested_command: string;
    reason: string;
    target?: {
      type: 'experiment' | 'recipe';
      id: string;
    };
  }>;
}
```

**Rationale:** Matches the skill template's priority ordering logic. `action_type` enables skills to route to correct sub-skill without parsing `suggested_command`. `current_best_recipes` array allows skills to detect ambiguity.

### Decision 2: JSON structure for `mlspec status --json`

**Choice:** Return workspace summary with structured counts and current_best references.

```typescript
interface StatusJsonOutput {
  recipes: Array<{
    id: string;
    tags: string[];
    has_metrics: boolean;
  }>;
  experiments: {
    total: number;
    by_status: {
      draft: string[];
      running: string[];
      resolved: string[];
    };
  };
  current_best_recipes: string[];  // All recipes with 'current-best' tag
  current_best_recipe: string | null;  // Only when exactly 1 exists
  warnings: string[];
  errors: string[];
}
```

**Rationale:** Mirrors the human-readable output structure but in parseable form. Warnings/errors array allows skills to detect issues.

### Decision 3: JSON structure for `mlspec status --experiment <id> --json`

**Choice:** Return experiment-specific state including evidence stages and readiness flags. This command requires `--json` flag; without it, returns an error.

```typescript
interface ExperimentStatusJsonOutput {
  experiment_id: string;
  status: 'draft' | 'running' | 'resolved';
  base_recipe: string;
  proposed_recipe: string;
  evidence_stages: {
    smoke: {
      exists: boolean;
      path: string | null;
      recommendation: string | null;
    };
    validation: {
      exists: boolean;
      path: string | null;
      recommendation: string | null;
    };
    final: {
      exists: boolean;
      path: string | null;
      recommendation: string | null;
    };
  };
  missing_stages: string[];  // Subset of ['smoke', 'validation', 'final']
  has_recommendation: boolean;  // At least one stage has non-null recommendation
  ready_to_resolve: boolean;  // See Decision 3a
}
```

**Rationale:** Fixed stage keys ensure consistent structure. `ready_to_resolve` defined in Decision 3a.

#### Decision 3a: Definition of `ready_to_resolve`

**Rule:** `ready_to_resolve` is `true` when:
1. `experiment.status !== 'resolved'`, AND
2. At least one evidence stage has a non-null `recommendation`

**Rationale:** An experiment is ready to resolve when it has evidence with a recommendation. The experiment must not already be resolved. No requirement for "complete" evidence across all stages—some workflows resolve from smoke evidence alone.

### Decision 4: JSON structure for `mlspec show recipe <id> --json`

**Choice:** Return full recipe metadata.

```typescript
interface RecipeShowJsonOutput {
  id: string;
  name: string;
  tags: string[];
  parent_recipe: string | null;
  created_by_experiment: string | null;
  config: RecipeConfig | null;
  metrics: Record<string, number> | null;
  summary_path: string | null;
  created: string;
}
```

**Rationale:** Aligns with `RecipeMetadataSchema` in `entity-types.ts`.

### Decision 5: JSON structure for `mlspec show evidence <experiment> --json`

**Choice:** Return all three fixed evidence stages with explicit keys. Missing stages are explicitly represented.

```typescript
interface EvidenceShowJsonOutput {
  experiment_id: string;
  stages: {
    smoke: {
      exists: boolean;
      path: string | null;
      runs: EvidenceRun[] | null;
      aggregate: Record<string, { mean: number | null; std: number | null }> | null;
      summary: string | null;
      recommendation: string | null;
    };
    validation: {
      exists: boolean;
      path: string | null;
      runs: EvidenceRun[] | null;
      aggregate: Record<string, { mean: number | null; std: number | null }> | null;
      summary: string | null;
      recommendation: string | null;
    };
    final: {
      exists: boolean;
      path: string | null;
      runs: EvidenceRun[] | null;
      aggregate: Record<string, { mean: number | null; std: number | null }> | null;
      summary: string | null;
      recommendation: string | null;
    };
  };
}
```

**Rationale:** Always includes explicit keys for all three fixed stages (smoke, validation, final), even when missing. Skills can always rely on `stages.smoke`, `stages.validation`, `stages.final`.

### Decision 6: Skill template updates

**Approach:** Update skill templates to:
1. Try JSON command first
2. If JSON command fails (non-zero exit or parse error), fall back to file inspection
3. Document fallback behavior in skill instructions

**Rationale:** This maintains robustness while enabling the CLI-first design. Skills remain functional even if JSON output is unavailable.

### Decision 7: JSON mode error handling

**Rule:** When `--json` flag is passed, stdout MUST contain only valid JSON.

```typescript
// Error case: mlspec status --experiment nonexistent --json
// stdout ONLY:
{
  "error": "Experiment 'nonexistent' not found",
  "experiment_id": "nonexistent"
}
// Exit code: 1

// No spinners, banners, checkmarks, markdown, or extra logs on stdout.
```

**Rule:** When `--json` flag is NOT passed, behavior is unchanged (human-readable).

**Rule:** When `--json` flag is passed and an error occurs:
- stdout contains only valid JSON with `error` field
- exit code is non-zero
- stderr may contain additional diagnostic info (spinners ok on stderr)

**Rationale:** Skills parsing JSON can rely on stdout being clean. stderr remains available for debugging.

### Decision 8: `mlspec status --experiment <id>` without `--json`

**Choice:** Error and instruct user to pass `--json`.

```typescript
// mlspec status --experiment <id> (without --json)
// stdout ONLY:
{
  "error": "This command requires --json flag",
  "experiment_id": "<id>"
}
// Exit code: 1
```

**Rationale:** Human-readable experiment status is out of scope for 2.1.0. Requiring `--json` keeps the surface area minimal.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| JSON output becomes out of sync with human-readable | Both output from same data sources; tests verify consistency |
| Skill templates may not handle all error cases | Explicit fallback to file inspection documented |
| Large workspaces may have performance issues | JSON output does not add significant overhead; same file reads |
| Cross-platform path handling | Use `path.join()` in tests and `resolveMlspecPath()` utility |

## Migration Plan

1. **Implement JSON flags** in CLI commands (no behavior change to defaults)
2. **Add comprehensive tests** for JSON output, error cases, backward compatibility
3. **Update skill templates** to prefer JSON with fallback
4. **Verify skill generation** by running `node bin/mlspec.js init --tools opencode` in a fresh temp workspace
5. **Run existing MLSpec tests** to ensure no regressions

**Rollback:** If issues arise, skill templates can be reverted to file-inspection approach (they already have this logic). JSON flags are additive and opt-in.

## Open Questions

1. ~~Should `mlspec next --json` include bootstrap routing context?~~ → **Resolved**: Yes, `workspace_state.current_best_recipes` array and `experiments_count` allow skills to detect bootstrap state.

2. ~~Should JSON output be streamed or complete object?~~ → **Resolved**: Complete object only.

3. ~~Should JSON be pretty-printed or minified?~~ → **Resolved**: Pretty-print with 2-space indent.

4. ~~What is the exact definition of `ready_to_resolve`?~~ → **Resolved**: See Decision 3a.
