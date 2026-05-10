## Context

MLS pec currently tests fixtures using vitest with substring matching on `expected.txt`. This approach:
- Requires text parsing which is fragile
- Doesn't verify the agent actually used MLSpec correctly
- Can't support structured output validation
- Fixtures contain `prompt.md` and `expected.txt` which could leak context

The new approach launches Claude Code as an agent against clean fixture environments, uses structured output to deterministically validate results, and supports both static (mlspec correctness) and dynamic (agent behavior) testing.

## Goals / Non-Goals

**Goals:**
- Replace substring matching with structured output validation
- Ensure agents actually use MLSpec (not just pattern-match responses)
- Clean fixture environment (no validation artifacts visible to agent)
- Deterministic pass/fail based on schema validation
- Support future fixtures where agent writes things

**Non-Goals:**
- Don't change MLSpec's actual functionality (that's separate)
- Don't implement LLM-as-judge for semantic comparison (yet)
- Don't support multi-agent orchestration (yet)

## Decisions

### Decision: Workspace Copy Instead of Read-Only Mount

**Choice:** Copy `environment/` to `/tmp/mlspec-test-$UUID/` for each test, launch agent with full write permissions, then discard workspace.

**Rationale:** Simpler than read-only mounting, allows future fixtures where agent writes files, agent can create scratch space for analysis.

**Alternative:** Read-only mount of environment, agent can only read and run commands. Rejected because future fixtures may need write access.

### Decision: Copy dist/index.js Into Workspace

**Choice:** Copy `dist/index.js` to workspace root alongside environment contents.

**Rationale:** Agent needs access to our built MLSpec, not a system-installed one. Workspace is self-contained.

**Alternative:** npm link or PATH manipulation. More complex, less predictable.

### Decision: Flatten environment/ Contents to Workspace Root

**Choice:** `cp -r environment/* /tmp/workspace/` (not `cp -r environment/ /tmp/workspace/`)

**Rationale:** Agent's cwd is workspace root. MLSpec expects `mlspec/experiments/...` relative to cwd. Flattening avoids `--root` flag complexity.

### Decision: Structured Output with Partial Matching

**Choice:** Agent outputs JSON matching schema, but comparison is partial:
- `verdict`: exact match required
- `failed_checks`: must contain all expected items (order无关)
- `reasoning`: not compared (free text)

**Rationale:** Verdict and failed_checks are controlled vocab. Reasoning flexibility allows agent personality while still validating correctness.

**Alternative:** Full JSON match. Too rigid - agent might word things differently legitimately.

### Decision: Claude Code CLI with --output-format json --json-schema

**Choice:** Use `claude -p "..." --output-format json --json-schema <schema>`

**Rationale:** Native support for structured output, no need for custom parsing. Agent SDK or headless mode provides programmatic control.

**Alternative:** Parse text output with regex. Fragile, defeats purpose of structured approach.

## Fixture Structure

```
fixtures/<id>/
├── environment/                  ← COPIED to workspace
│   └── mlspec/experiments/...   ← experiment data only
└── fixture.yaml                  ← NOT copied (lives outside)
    ├── prompt: <text>
    ├── output_schema: <JSON schema>
    └── expected:
        ├── verdict: <string>
        └── failed_checks: [<strings>]
```

## Harness Flow

```
┌─────────────────────────────────────────────────────────────┐
│  1. Build MLSpec: bun build.ts                             │
│  2. Create temp workspace: /tmp/mlspec-test-$UUID/        │
│  3. Copy environment/* → workspace/                        │
│  4. Copy dist/index.js → workspace/                        │
│  5. Launch Claude Code:                                    │
│     claude -p "<prompt>"                                 │
│       --output-format json                                │
│       --json-schema <schema>                              │
│       --working-dir /tmp/mlspec-test-$UUID/              │
│  6. Parse agent JSON output                               │
│  7. Compare:                                              │
│     - verdict == expected.verdict                          │
│     - expected.failed_checks ⊆ actual.failed_checks       │
│  8. Cleanup: rm -rf /tmp/mlspec-test-$UUID/              │
└─────────────────────────────────────────────────────────────┘
```

## Risks / Trade-offs

- **Risk:** Agent discovers dist/index.js path differently than expected
  - **Mitigation:** Prompt tells agent "MLSpec is at: ./dist/index.js"

- **Risk:** Structured output schema too rigid for complex reasoning
  - **Mitigation:** Only validate verdict + failed_checks, ignore reasoning

- **Risk:** Temp workspace not cleaned up on crash
  - **Mitigation:** Use UUID, cleanup is best-effort (acceptable for test)

- **Risk:** Fixture migration breaks existing vitest tests
  - **Mitigation:** Migrate one fixture at a time, keep old test working until new works

## Open Questions

1. Should harness run fixtures sequentially or in parallel?
2. Do we need timeout per fixture?
3. Should failed checks show diff of what agent output vs expected?
4. How to handle fixtures that require multiple agent interactions?
