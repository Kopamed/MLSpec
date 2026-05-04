# mlspec-run-readiness Specification

## Purpose

This capability defines requirements for the `mlspec-run` skill template to enforce run-readiness discipline for greenfield ML projects. It ensures dataset profiling, accelerator preflight, and training ladder checklist are addressed before recording evidence.

## ADDED Requirements

### Requirement: mlspec-run requires dataset profiling

The `mlspec-run` skill template SHALL require dataset profiling evidence before allowing full training runs.

#### Scenario: Dataset profiling checklist
- **WHEN** `mlspec-run` skill is used for a full training stage (not smoke)
- **THEN** the skill SHALL include a checklist in the evidence body requiring:
  - `raw_examples`: Count of raw examples in dataset
  - `raw_token_count`: Total tokens in raw examples
  - `generated_sequences`: Number of sequences after tokenization/chunking
  - `generated_tokens`: Total tokens in generated sequences
  - `seq_len`: Sequence length used (e.g., 256, 512, 1024)
  - `chunking_strategy`: How examples are chunked (e.g., first, random, sliding-window)
  - `packing_strategy`: If sequences are packed (e.g., none, greedy, sorted)
  - `avg_raw_tokens_per_example`: Average number of tokens per raw example
  - `tokens_per_epoch`: Estimated tokens per training epoch
  - `planned_training_tokens`: `tokens_per_epoch * num_epochs`

#### Scenario: Dataset efficiency metrics
- **WHEN** `mlspec-run` skill profiles dataset
- **THEN** it SHALL compute:
  - `generated_tokens / raw_token_count`: retention ratio. Low values indicate dropped data; high values may indicate padding or duplication
  - `dropped_token_ratio`: tokens lost to chunking/packing boundaries
  - `padding_ratio`: fraction of sequence that is padding (relevant when avg_tokens_per_sequence << seq_len)
  - `avg_tokens_per_sequence`: `generated_tokens / generated_sequences`
  - `sequence_utilization`: `avg_tokens_per_sequence / seq_len`

#### Scenario: TinyStories anomaly detection
- **WHEN** dataset has avg_raw_tokens_per_example 50-70 tokens with seq_len=256
- **THEN** the skill SHALL flag: "High chunking overhead: avg example 50-70 tokens with seq_len=256 means most of sequence is padding"
- **AND** if generated_tokens is much smaller than raw_token_count (e.g., < 0.3x), the skill SHALL flag: "Suspiciously low generated_tokens relative to raw_token_count - verify chunking/packing is intentional"

---

### Requirement: mlspec-run requires accelerator preflight awareness

The `mlspec-run` skill template SHALL include accelerator detection guidance.

#### Scenario: Accelerator detection
- **WHEN** `mlspec-run` skill prepares to run training
- **THEN** it SHALL check/detect:
  - CUDA availability and GPU count
  - ROCm availability and GPU count
  - MPS (Apple Silicon) availability
  - CPU-only fallback
  - dtype support: bf16, fp16, fp32

#### Scenario: Full training requires accelerator
- **WHEN** full training is requested and no accelerator is available
- **THEN** the skill SHALL warn: "Full training on CPU is not recommended; use smoke stages only or explicitly acknowledge CPU intent"

#### Scenario: Smoke stages allowed on CPU with acknowledgment
- **WHEN** smoke-import or smoke-onebatch is requested on CPU
- **THEN** the skill SHALL proceed if user explicitly acknowledges CPU-only intent

---

### Requirement: mlspec-run includes training ladder checklist

The `mlspec-run` skill template SHALL include training ladder checklist items as Markdown body sections inside evidence files.

#### Scenario: Training ladder section in evidence body
- **WHEN** evidence file is created for smoke/validation/final stage
- **THEN** the Markdown body SHALL include a section like:
  ```markdown
  ## Training Ladder

  - [ ] smoke-import: completed (N steps)
  - [ ] smoke-onebatch: completed (N steps)
  - [ ] smoke-tinyoverfit: completed (N steps, overfit_loss=X)
  - [ ] checkpoint-short: completed (path: ...)
  - [ ] resume-checkpoint: completed
  - [ ] full-run: completed (max_steps=N, max_tokens=N)
  ```

#### Scenario: Full run requires ladder completion
- **WHEN** evidence for full-run stage is recorded
- **THEN** the skill SHALL verify earlier ladder stages were completed

---

### Requirement: mlspec-run includes live logging guidance

The `mlspec-run` skill template SHALL include guidance for live logging.

#### Scenario: Live logging guidance
- **WHEN** `mlspec-run` skill prepares training command
- **THEN** it SHALL recommend using `tee` for live logging:
  - Command output SHOULD be piped through `tee outputs/<experiment-id>/logs/training.log`
  - NOT recommended: `| tail -30` or similar tail-only patterns
- **AND** logging directory `outputs/<experiment-id>/logs/` SHOULD be created before training (runtime-only, not version-controlled)

---

### Requirement: mlspec-run requires deterministic preprocessing evidence

The `mlspec-run` skill template SHALL require evidence of deterministic preprocessing.

#### Scenario: Cache manifest check
- **WHEN** evidence is recorded for training run
- **THEN** the evidence body SHOULD include a section like:
  ```markdown
  ## Preprocessing Cache

  - cache_key: hash-of-data-and-preprocessing
  - cache_valid: true/false
  - data_hash: hex-string
  - preprocessing_version: version-string
  - cache_location: outputs/<experiment-id>/cache/
  ```

#### Scenario: Cache not version-controlled
- **WHEN** preprocessing cache exists at `outputs/<experiment-id>/cache/`
- **THEN** the skill SHALL note: "Cache artifacts are runtime-only state; do not commit to version control"