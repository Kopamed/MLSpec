## Context

The ml-experiment schema dogfood via `eos-token-fix` revealed critical template weaknesses:

1. **Evidence completeness illusion**: `openspec status` only checks file existence. evidence.md could be "complete" with smoke or partial evidence, making invalid experiments appear legitimate.

2. **Resolution validity illusion**: resolution.md could claim "Accepted" or "Rejected" without decision-grade evidence. Partial training (batch 960 OOMed, batch 512 worked, validation didn't run correctly) would still show all artifacts complete.

3. **Checkbox-washing**: prepare.md tasks like `- [ ] 1.1 <!-- Model config -->` were trivially completed by writing `<!-- done -->` without actual file creation or verification.

4. **No experiment classification**: The schema didn't distinguish between baseline-establishment, ablation, intervention comparison, bug-fix, scaling, or reproduction runs—each with different evidence requirements.

5. **No evidence quality tiers**: No way to distinguish smoke evidence, partial-run evidence, full-protocol evidence, or failed-run evidence.

## Goals / Non-Goals

**Goals:**
- Make evidence quality visible through explicit template fields
- Prevent Accepted/Rejected resolutions from smoke or partial evidence
- Require protocol deviations to be recorded and assessed
- Prevent checkbox-washing by requiring file paths, verification commands, and completion conditions
- Distinguish experiment types with different evidence requirements

**Non-Goals:**
- No CLI validation code (schema-only, soft gates)
- No new artifact types or graph changes
- No database, tracker, or dashboard
- No agent slash-command discipline fixes (separate follow-up)
- Does not prevent agents from lying in template fields (trust but verify)

## Decisions

### Decision: Schema-only implementation (no TypeScript changes)

All changes are to `schemas/ml-experiment/` templates and schema.yaml instructions. No changes to `src/core/` TypeScript code.

**Rationale:** Keep changes minimal. CLI validation would require significant code changes. Template hardening makes expectations explicit and catches good-faith agents; bad-faith violations require human review.

### Decision: Add Experiment Type to experiment.md

Add explicit experiment classification: Baseline Establishment | Intervention Comparison | Ablation | Scaling Run | Bug-Fix | Reproduction Run.

**Rationale:** Different experiment types have different evidence requirements. Ablation requires a real baseline. Scaling runs define scale dimensions. Bug-fix reproduces failure then verifies fix. Template instructions make these requirements explicit.

### Decision: Phase-structured prepare.md

Restructure flat checklist into phases: Infrastructure → Tiny/Smoke Run → Protocol Run → Run Readiness → Logging.

**Rationale:** Linear flow makes it clearer what must be done before proceeding. Run Readiness section provides explicit pre-flight checks.

### Decision: Require verification details in prepare.md tasks

Each task should include: affected file(s), verification command, expected output, completion condition.

**Rationale:** Prevents checkbox-washing. "File exists" becomes `test -f <path> && echo "exists"`.

### Decision: Add Evidence Grade to evidence.md

Explicit classification: Smoke | Partial-Run | Full-Protocol | Failed-Run.

**Rationale:** Makes evidence quality visible at a glance. Template instructions link grade to resolution validity.

### Decision: Add Protocol Satisfaction to evidence.md

Classification: Satisfies Protocol | Deviates From Protocol | Does Not Satisfy Protocol.

**Rationale:** Records whether the run matched the plan. Deviations must be recorded and assessed.

### Decision: Add Decision-Grade Evidence to resolution.md

Yes/No field indicating whether evidence is sufficient for Accepted/Rejected.

**Rationale:** Explicit gate. Template instructions enforce: Decision-Grade Evidence = No → cannot claim Accepted/Rejected.

### Decision: Update schema.yaml instructions for evidence/resolution

Instructions explicitly state:
- Planned future runs are NOT evidence
- Smoke/Partial cannot support Accepted/Rejected
- Failed evidence must be Invalid or Needs-Rerun
- Accepted/Rejected require Full-Protocol + Protocol Satisfaction

**Rationale:** Schema instructions are the authority. Agents should read schema instructions before using templates.

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| Agents can still lie in template fields | Medium | Templates make expectations explicit; human review catches violations |
| No CLI validation of evidence quality | Low | Schema-only approach; code changes deferred unless dogfood reveals need |
| prepare.md tasks still checkboxes | Low | Verification commands in task text make intent clearer |
| Resolution decision still agent judgment | Medium | Template fields structure the decision but don't enforce it |

## Migration Plan

1. Update `schemas/ml-experiment/schema.yaml` with revised instructions
2. Replace template files with hardened versions
3. Existing archived experiments are unaffected (immutable)
4. Future ml-experiment changes use hardened templates
5. Rollback: restore original templates from git

## Open Questions

1. Should we add a CLI `openspec validate-evidence` command later for harder enforcement?
2. Should Run Readiness checks be verified automatically (e.g., `test -f <path>`) rather than just checked?
3. Do we need a template version field to track which version of templates an experiment used?
