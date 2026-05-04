## 1. mlspec-run Skill Template Updates

- [x] 1.1 Add dataset profiling body section to mlspec-run template (raw_examples, raw_token_count, generated_sequences, generated_tokens, seq_len, chunking_strategy, packing_strategy, avg_raw_tokens_per_example, tokens_per_epoch, planned_training_tokens, efficiency metrics)
- [x] 1.2 Add dataset efficiency metrics guidance (generated_tokens/raw_token_count, dropped_token_ratio, padding_ratio, avg_tokens_per_sequence, sequence_utilization)
- [x] 1.3 Add TinyStories anomaly detection guidance (short examples + seq_len=256 + low generated_tokens)
- [x] 1.4 Add accelerator preflight awareness (CUDA/ROCm/MPS/CPU detection, dtype support)
- [x] 1.5 Add training ladder Markdown body section checklist to evidence guidance
- [x] 1.6 Add live logging guidance (use tee, not tail-only, outputs/<experiment-id>/logs/)
- [x] 1.7 Add deterministic preprocessing cache body section guidance (outputs/<experiment-id>/cache/, runtime-only)

## 2. mlspec-run Target-Leakage Requirements

- [x] 2.1 Add autoregressive shift verification requirement (logits[:, :-1, :] vs input_ids[:, 1:])
- [x] 2.2 Require evidence citing specific code location for loss computation
- [x] 2.3 Add near-zero loss warning guidance
- [x] 2.4 Add loss-generation consistency check guidance

## 3. mlspec-run Generation-Collapse Metrics

- [x] 3.1 Add generation-collapse metrics body section to evidence guidance
- [x] 3.2 Define thresholds for warnings (repetition_rate > 0.3, distinct_1 < 0.3, max_token_run > 10)
- [x] 3.3 Define collapse threshold (repetition_rate > 0.7, distinct_1 < 0.1, max_token_run > 50)
- [x] 3.4 Add fixed-prompt sampling requirement for evidence
- [x] 3.5 Change "shall not be recorded" to "skill shall stop and require investigation note"

## 4. mlspec-next Skill Template Updates

- [x] 4.1 Update mlspec-next template to use `mlspec next --json`
- [x] 4.2 Add check for existing evidence stages before recommending
- [x] 4.3 Document correct evidence path: `mlspec/experiments/<id>/evidence/{smoke,validation,final}.md`
- [x] 4.4 Use snake_case field names: `existing_stages` not `existingStages`

## 5. mlspec-next --json Duplicate Stage Fix

- [x] 5.1 Fix `mlspec next --json` to check `mlspec/experiments/<id>/evidence/smoke.md`
- [x] 5.2 Fix `mlspec next --json` to check `mlspec/experiments/<id>/evidence/validation.md`
- [x] 5.3 Fix `mlspec next --json` to check `mlspec/experiments/<id>/evidence/final.md`
- [x] 5.4 Add `existing_stages` field to JSON output (snake_case)
- [x] 5.5 Ensure duplicate stages are not in actions list

## 6. Evidence Template Updates

- [x] 6.1 Update evidence template to include training_ladder Markdown body section
- [x] 6.2 Update evidence template to include generation_collapse_metrics body section
- [x] 6.3 Update evidence template to include autoregressive_shift_verified guidance
- [x] 6.4 Update evidence template to include preprocessing_cache body section
- [x] 6.5 Ensure all new content is in Markdown body, not frontmatter

## 7. Skill Template Guardrails

- [x] 7.1 Verify mlspec-explore has read-only guardrails (verified: "Explore mode is for analysis only")
- [x] 7.2 Verify mlspec-propose has no-training guardrails (verified: "Training happens during /mlspec-run, not /mlspec-propose")
- [x] 7.3 Verify mlspec-run has preflight/ladder guardrails (verified: new sections added)

## 8. Generated Skills Regeneration

- [ ] 8.1 Regenerate mlspec-explore skill from updated template
- [ ] 8.2 Regenerate mlspec-propose skill from updated template
- [ ] 8.3 Regenerate mlspec-run skill from updated template
- [ ] 8.4 Regenerate mlspec-resolve skill from updated template
- [ ] 8.5 Regenerate mlspec-next skill from updated template

## 9. Testing

- [x] 9.1 Test mlspec next --json does not recommend existing evidence stages (verified manually)
- [x] 9.2 Test mlspec-next correctly identifies existing evidence files at mlspec/experiments/<id>/evidence/{smoke,validation,final}.md (verified manually)
- [x] 9.3 Test evidence template includes all required body sections (verified via build)
- [ ] 9.4 Verify cross-platform path handling (Windows)