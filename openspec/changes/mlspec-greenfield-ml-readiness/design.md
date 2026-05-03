## Context

MLSpec 2.1.1 skills were designed for projects with existing infrastructure. When applied to greenfield ML projects, agents resort to:
- Inline Python training commands (e.g., `python -c "..."`)
- Ignoring accelerator availability (CUDA/ROCm/MPS)
- Repeated data preprocessing without deterministic caching
- Bad logging patterns (`2>&1 | tail -30`)
- Running full training during debugging
- Manually creating invalid evidence files
- Training models with potential target-leakage (autoregressive label shift issues)

This change focuses on skill template improvements for greenfield ML run-readiness, without introducing new CLI commands.

## Goals / Non-Goals

**Goals:**
- Add dataset profiling requirements to `mlspec-run` skill template
- Require target-leakage sanity check evidence in `mlspec-run`
- Add generation-collapse metrics guidance (repetition, distinct-n) instead of BLEU/ROUGE
- Fix `mlspec next --json` to not recommend duplicate evidence stages
- Add training ladder checklist items as Markdown body sections inside evidence files
- Add live logging guidance to skills
- Add accelerator-aware preflight awareness to skills

**Non-Goals:**
- New CLI commands (profile-data, build-cache, run-preflight) - defer to separate changes
- Modifying evidence frontmatter schema (fields go in Markdown body sections)
- Changing core MLSpec stage definitions (smoke/validation/final)
- Version-controlling binary caches or checkpoints
- Implementing actual training scripts (project-specific)

## Decisions

### 1. Training ladder as Markdown body sections inside evidence

**Decision:** Instead of new evidence stages or frontmatter fields, represent the training ladder as Markdown body sections inside existing evidence files at `mlspec/experiments/<id>/evidence/{smoke,validation,final}.md`.

**Rationale:** The evidence stages (smoke/validation/final) are established. Adding ladder stages as body sections preserves frontmatter schema while providing granular progress tracking.

### 2. Generation-collapse metrics over BLEU/ROUGE

**Decision:** Use repetition_rate, distinct-1, distinct-2, max-token-run, punctuation-only ratio, special-token ratio, top-token frequency instead of BLEU/ROUGE for sanity checks.

**Rationale:** BLEU/ROUGE require reference strings. Generation-collapse metrics detect model failure modes (repetition, collapse) directly without references.

### 3. Target-leakage as evidence requirement

**Decision:** `mlspec-run` skill must require evidence that autoregressive training is correctly shifted. Specifically: logits[:, :-1, :] must be compared to input_ids[:, 1:]; logits at position t must predict token t+1, not token t.

**Rationale:** Near-zero loss with bad generation in the dogfooding run suggests the model may have been trained on current token instead of next token.

### 4. `mlspec next --json` duplicate check

**Decision:** `mlspec next --json` must check `mlspec/experiments/<id>/evidence/{smoke,validation,final}.md` before recommending adding evidence.

**Rationale:** Current bug: it recommends adding evidence for stages that already exist.

### 5. Accelerator-aware preflight as guidance

**Decision:** Instead of new CLI preflight command, add accelerator detection guidance to `mlspec-run` skill template.

**Rationale:** New CLI commands require justification. Skill template updates are lower risk.

### 6. Live logging guidance over enforcement

**Decision:** Add guidance to `mlspec-run` skill template about using `tee` for live logging.

**Rationale:** Enforcement would require new CLI commands. Guidance in skill template is sufficient.

### 7. Path conventions

**Decision:** Use these paths:
- Evidence: `mlspec/experiments/<id>/evidence/{smoke,validation,final}.md`
- Logs: `outputs/<experiment-id>/logs/` (runtime-only, not version-controlled)
- Cache: `outputs/<experiment-id>/cache/` (runtime-only, not version-controlled)

**Rationale:** These follow existing project/workspace conventions. Runtime artifacts go in `outputs/`, not `.mlspec/`.

## Risks / Trade-offs

- **Risk:** Skill template updates don't enforce behavior
  - **Mitigation:** Agents using skills will follow guidance; enforcement via code review
- **Risk:** Dataset profiling requirements may be unclear for some projects
  - **Mitigation:** Provide example checklist items that can be adapted
- **Risk:** Target-leakage check may be hard to implement for some architectures
  - **Mitigation:** Provide multiple approaches (attention mask inspection, loss-on-special-token, etc.)

## Open Questions

1. Should the training ladder checklist items be required or suggested in evidence?
2. What threshold values for generation-collapse metrics should trigger warnings?
3. How to handle resume/checkpointing in the evidence metadata?