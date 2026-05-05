## Phase: Infrastructure

<!-- Implementation and setup tasks. Each task should include: file(s) affected, verification command, expected output. -->

- [ ] 1.1 <!-- Model implementation: file(s), verification command, expected output -->
- [ ] 1.2 <!-- Data pipeline: file(s), verification command, expected output -->
- [ ] 1.3 <!-- Tokenizer: file(s), verification command, expected output -->

## Phase: Tiny/Smoke Run

<!-- Quick sanity checks. Run on minimal data/epochs to verify no crashes. -->

- [ ] 2.1 <!-- Smoke run command: batch_size=small, expected: no crashes -->
- [ ] 2.2 <!-- Metric computation sanity: expected values known, verification command -->

## Phase: Protocol Run

<!-- Full protocol execution. These tasks track the actual experiment run. -->

- [ ] 3.1 <!-- Full run command: explicit, matches protocol batch_size/seq_len/steps -->
- [ ] 3.2 <!-- Checkpoint path: verified writable -->
- [ ] 3.3 <!-- Log path: verified writable -->

## Run Readiness

<!-- Required before marking protocol run tasks complete. -->

- [ ] 4.1 <!-- tokenizer exists: verification command and expected output -->
- [ ] 4.2 <!-- train data exists: verification command and expected output -->
- [ ] 4.3 <!-- validation data exists: verification command and expected output -->
- [ ] 4.4 <!-- actual batch_size matches protocol OR deviation recorded in evidence.md -->
- [ ] 4.5 <!-- total_steps × batch × seq_len ≈ target_tokens (within 5%) -->
- [ ] 4.6 <!-- full run command is explicit and runnable -->
- [ ] 4.7 <!-- checkpoint/log paths are writable -->

## Logging

<!-- What metrics and artifacts will be captured during the run. -->

- [ ] 5.1 <!-- Metrics to capture: exact names and collection commands -->
- [ ] 5.2 <!-- Artifacts to save: model checkpoints, logs, configs, paths -->
