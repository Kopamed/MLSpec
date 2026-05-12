## ADDED Requirements

### Requirement: Skills are defined in SKILL.md with structured contract

Each skill SHALL have a `SKILL.md` file in `.opencode/skills/<skill-name>/` with:
- YAML frontmatter: `name` (required), `description` (required), `license`, `compatibility`, `metadata`
- Plain-text contract body with sections: Goal, Inputs, Preconditions, Default next steps, Required CLI mutations, Maximum allowed claim, Refuse if, Outputs

The contract body is the authoritative definition of what the skill does, not frontmatter fields.

#### Scenario: Skill discovered by OpenCode agent
- **WHEN** an OpenCode agent calls the skill tool with `name: "ml-spec-run-candidate"`
- **THEN** OpenCode loads `.opencode/skills/ml-spec-run-candidate/SKILL.md`
- **AND** the agent sees the skill contract with Goal, Preconditions, Steps, Refuse if, Outputs

### Requirement: Skills invoke CLI commands, not MLSpec state directly

A skill SHALL NOT write MLSpec state directly. All state mutations SHALL go through CLI commands (`mlspec case create`, `mlspec run begin`, etc.).

A skill encodes the sequence of CLI calls, the preconditions for each step, and the conditions under which the skill should abort or refuse.

#### Scenario: Skill invokes CLI in sequence
- **WHEN** `ml-spec-run-candidate` skill is loaded and executed
- **THEN** the agent calls in order:
  1. `mlspec case show --case <id>` (read state)
  2. `mlspec snapshot create --case <id>` (mutation)
  3. `mlspec run begin --case <id> --protocol <id> --kind full` (mutation)
  4. [external execution]
  5. `mlspec run end --run <id> --status completed --resources @resources.json` (mutation)
  6. `mlspec evidence classify --run <id>` (mutation + compute)
  7. `mlspec audit --case <id>` (read + checks)

### Requirement: Skills have refusal conditions

Each skill SHALL define `Refuse if` conditions — circumstances under which the skill must not proceed. The agent SHALL evaluate these before each major step and abort with a clear message if any condition is true.

#### Scenario: Skill refuses when protocol not locked
- **WHEN** `ml-spec-run-candidate` skill is loaded for a Case whose Protocol is not locked
- **THEN** the skill SHALL refuse with message "Protocol must be locked before running structured experiment"
- **AND** no CLI commands are executed

### Requirement: Skills encode maximum allowed claim

Each skill SHALL define `Maximum allowed claim` — the strongest Evidence grade the skill can produce. The agent SHALL NOT claim stronger evidence than what the skill permits.

#### Scenario: run_candidate max claim is evidence grade returned
- **WHEN** `ml-spec-run-candidate` executes and calls `mlspec evidence classify`
- **AND** the returned grade is `partial`
- **THEN** the skill output's `maximum_allowed_claim` is `partial`
- **AND** the agent cannot issue a Decision with status `accept` using this Evidence alone

### Requirement: Skill output is structured

The skill output SHALL be structured and include: `run_id`, `evidence_id`, `audit_report`, `bounded_summary`, and `next_cheapest_step` (if evidence grade is below decision_grade).

The agent presents this to the human as: what changed, what evidence exists, what is allowed next.

#### Scenario: Skill returns bounded summary
- **WHEN** `ml-spec-run-candidate` completes
- **THEN** the agent receives:
  ```json
  {
    "run_id": "run_01JV...",
    "evidence_id": "ev_01JV...",
    "grade": "partial",
    "audit_report": { "ok": true, "checks": [...] },
    "bounded_summary": "Partial evidence suggests direction but 3 more seeds needed for decision_grade",
    "next_cheapest_step": "rerun with seeds=3"
  }
  ```

### Requirement: Eight MVP skills

The MVP SHALL ship with these eight skills:
- `ml-spec-frame-case`: Define question, draft protocol, set compute budget
- `ml-spec-run-candidate`: Execute structured experiment against locked protocol
- `ml-spec-decide-case`: Issue bounded decision or explain blockers
- `ml-spec-audit-case`: Run full invariant audit and report
- `ml-spec-import-project`: Import brownfield repo under MLSpec with lineage gaps marked
- `ml-spec-compare-to-baseline`: Produce comparison-ready evidence with matched baseline
- `ml-spec-patch-code`: Implement candidate change with local validation
- `ml-spec-handoff-state`: Preserve context across sessions/agents

#### Scenario: Skill routing based on intent
- **WHEN** human says "try label smoothing"
- **THEN** agent loads `ml-spec-run-candidate`
- **WHEN** human says "should we accept this?"
- **THEN** agent loads `ml-spec-decide-case`
- **WHEN** human says "what's the status?"
- **THEN** agent loads `ml-spec-audit-case`
- **WHEN** human says "bring this repo under MLSpec"
- **THEN** agent loads `ml-spec-import-project`
- **WHEN** human says "compare to baseline"
- **THEN** agent loads `ml-spec-compare-to-baseline`
