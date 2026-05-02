## Context

The current MLSpec implementation (`schemas/ml-experiment/schema.yaml` v1) uses a promotion-track model:
- `baselines/` and `candidates/` as separate entity types
- Linear version numbers on candidates
- E1/E2/E3/E4/E5 evidence levels
- promote/decide redundancy
- Skills require explicit arguments

Real ML engineering practice shows:
- Recipe branching is common (fast inference variant, robust variant, etc.)
- Evidence comes from runs with multiple seeds
- "Accept" better describes adding a new recipe than "promote"
- Evidence stages should be semantic (smoke/validation/final), not numbered
- Skills should infer context to reduce friction

## Goals / Non-Goals

**Goals:**
- Replace baseline/candidate model with recipe graph (parent links)
- Make evidence stages semantic (smoke/validation/final) not numbered (E1-E5)
- Replace decide/promote with direct resolution verbs (accept/reject/retry/hold/inconclusive)
- Make skills conversational with context inference
- Support recipe branching naturally via parent links
- Keep lightweight: no graph database, filesystem + YAML is sufficient

**Non-Goals:**
- Backwards compatibility or migration path
- Graph database for recipe relationships
- Automated decision rules or auto-accept thresholds
- External experiment tracker integration (W&B, MLflow)
- Environment or data version hashing
- Complex ASCII graph layout (agents are bad at rendering)

## Decisions

### Decision 1: Recipe Graph as Tree/Forest, Not Graph Database

**Choice**: Each recipe has `parent_recipe` forming a tree/forest. No multi-parent recipes.

**Rationale**:
- Simple: filesystem + YAML is sufficient for V1
- Traceable: parent chain gives full lineage
- Natural for ML: experiments branch from a base recipe
- No merge semantics needed for V2
- Can add multi-parent later if needed

**Important**: `parent_recipe` represents experimental derivation, not model taxonomy.

**Example**: If testing LSTM against RNN baseline:
```yaml
base_recipe: rnn-mfcc-v1
proposed_recipe: lstm-mfcc-v1
proposed_change: Replace RNN with LSTM, keeping rest of pipeline fixed.
```
This creates lineage `rnn-mfcc-v1 -> lstm-mfcc-v1` because the experiment derived LSTM from RNN, not because they're the "same family."

**Alternatives considered**:
- Full graph database (e.g., Neo4j): Overkill for V1, adds complexity
- Multi-parent recipes: Adds merge semantics complexity not needed for V2

### Decision 2: Semantic Recipe IDs, Not Ancestry-Encoded

**Choice**: Recipe IDs are semantic (`rf-mfcc-v1`), parent link captures lineage.

**Rationale**:
- Short, readable IDs
- Parent link (`parent_recipe: svc-mfcc-v1`) clearly shows lineage
- ID doesn't need to encode full ancestry (would be `rf-from-svc-mfcc-v1-from-original`)

**Alternatives considered**:
- Ancestry-encoded IDs (`rf-from-svc-mfcc-v1-from-original`): Too long, redundant with parent link

### Decision 3: Evidence Stages: smoke / validation / final

**Choice**: Three semantic stages replace E1-E5.

**Rationale**:
- Names describe purpose, not number
- `smoke`: cheap signal check (does it run? is there signal?)
- `validation`: trusted local evaluation (does it beat base?)
- `final`: external/submission/production result
- Not all experiments need all stages; weak ideas die at smoke

**Alternatives considered**:
- Keep E1-E5: Arbitrary numbers add ceremony, not grounded in practice
- Different names: These match common ML vocabulary

### Decision 4: accept Creates New Recipe Node, Not New Version

**Choice**: Accepting an experiment creates a new recipe with unique ID, not a version increment.

**Rationale**:
- Branching is natural: `rf-mfcc-v1` and `rf-mfcc-roi-v1` are siblings
- Each recipe is immutable once created
- Clear identity: recipe ID = what this recipe is, not when it was created

**Alternatives considered**:
- Linear versions (`rf-mfcc v1, v2, v3`): Implies v3 > v2 > v1, doesn't capture branching

### Decision 5: Skills Infer from Workspace State, Not Conversation Inference in TypeScript

**Choice**: Skills read workspace files to infer context. CLI stays explicit and scriptable.

**Rationale**:
- CLI must be deterministic for scripting
- Skills are markdown instructions for agents, not TypeScript inference logic
- Workspace files are durable source of truth
- Skills instruct agents to infer from workspace state

**Alternatives considered**:
- TypeScript conversation inference in CLI: Overcomplicates CLI, duplicates agent reasoning
- Temp context files: Fragile, hidden state

### Decision 6: No Auto-Archive

**Choice**: Resolved experiments stay in `experiments/`. Archive is manual optional cleanup.

**Rationale**:
- Resolved experiments are graph edges, part of history
- Auto-archive hides context that may be useful later
- Manual archive only when workspace gets cluttered

### Decision 7: Tags on Recipes, Not Separate Entity Types

**Choice**: `baseline`, `candidate`, `current-best`, `variant`, `archived` are tags on recipes.

**Rationale**:
- A recipe can have multiple tags (e.g., `candidate` + `variant`)
- Flexible: can add new tags without schema changes
- Simpler than multiple entity types

**Alternatives considered**:
- Separate entity types: More rigid, what is a baseline that becomes current-best?

### Decision 8: Skills Use Conversation Context, Not Hidden State Files

**Choice**: Skills read workspace files + conversation history. No required `.mlspec/.context.yaml`.

**Rationale**:
- Durable truth is visible workspace files
- Conversation context is ephemeral but useful for inference
- Skills that can't infer can ask one focused question

### Decision 9: Graph Visualization via Multiple Formats

**Choice**: `mlspec graph` supports text, mermaid, and dot formats.

**Rationale**:
- Text format is robust and agent-readable
- Mermaid is best long-term visualization format
- DOT for Graphviz users
- Simple adjacency/tree listing instead of complex ASCII layout

**Implementation**: If graph algorithms needed, use `@dagrejs/graphlib`. No complex terminal layout.

**[Risk] Cycle in Parent Chain** → Mitigation: Validate on experiment creation. Reject if proposed_recipe's parent chain would create cycle.

**[Risk] Multiple current-best Tags** → Mitigation: Warning on validate, not block. User convention handles this.

**[Risk] Accepting Without Sufficient Evidence** → Mitigation: Warnings based on stage vs tag matrix, not blocks. User agency.

**[Risk] Evidence Stage Drift** → Mitigation: Template suggestions, user conventions. Validation warns on suspicious ordering.

**[Risk] Tag Inflation** → Mitigation: Document semantics clearly. Validate warns on invalid tags.

**[Risk] Skill Inference Failures** → Mitigation: Skills ask one focused question when ambiguous. Always show inferred action before executing.

## Migration Plan

This is a breaking redesign with NO backwards compatibility.

1. Create new schema at `schemas/ml-experiment-v2/schema.yaml`
2. Create new templates in `schemas/ml-experiment-v2/templates/`
3. Replace old MLSpec commands with V2 commands
4. Create new skills at `.opencode/skills/mlspec-*/SKILL.md`
5. Remove old skills and commands
6. Update documentation (README, AGENTS.md)
7. Add tests for new behavior
8. Publish as MLSpec v2

Existing v1 workspaces are abandoned. Users must create new v2 workspaces.

## Open Questions

**Q: Should proposed_recipe ID be validated against naming convention at experiment creation?**
A: Yes. Proposed recipe ID should follow same semantic ID rules. Validation should warn if it looks like ancestry-encoded.

**Q: How to handle evidence aggregation across multiple runs?**
A: Evidence files have `runs[]` array with per-run metrics + command. `aggregate{}` field has mean/std computed. No separate Run entity.

**Q: Should evidence files be allowed to be named flexibly (e.g., `smoke-knn-k5.md`)?**
A: V1 keeps simple path (`smoke.md`, `validation.md`, `final.md`). Future can support `smoke-knn-k5.md` if needed.

**Q: What triggers warnings on evidence stage transitions?**
A: Validation warns if:
- Going backwards (validation → smoke)
- Accepting as `current-best` from `smoke`

These are warnings, not blocks.
