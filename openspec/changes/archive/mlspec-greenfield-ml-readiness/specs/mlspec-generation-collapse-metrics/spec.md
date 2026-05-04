# mlspec-generation-collapse-metrics Specification

## Purpose

This capability defines generation quality metrics that detect model collapse, replacing BLEU/ROUGE which require reference strings. These metrics can detect repetition, truncation, and other failure modes directly from generated text.

## ADDED Requirements

### Requirement: Generation-collapse metrics are required

The `mlspec-run` skill template SHALL require generation-collapse metrics in evidence.

#### Scenario: Required metrics
- **WHEN** evidence is recorded for any training stage
- **THEN** the evidence Markdown body SHALL include:
  - `repetition_rate`: Ratio of repeated n-grams in generated text
  - `distinct_1`: Ratio of unique unigrams to total tokens
  - `distinct_2`: Ratio of unique bigrams to total tokens
  - `max_token_run`: Longest run of repeated tokens
  - `punctuation_only_ratio`: Ratio of tokens that are punctuation only
  - `special_token_ratio`: Ratio of tokens that are special tokens ([PAD], [UNK], etc.)
  - `top_token_frequency`: Frequency of most common token

---

### Requirement: Metrics thresholds for warnings

The `mlspec-run` skill template SHALL define thresholds that trigger warnings.

#### Scenario: Repetition warning
- **WHEN** `repetition_rate > 0.3`
- **THEN** the skill SHALL output warning: "High repetition detected (repetition_rate > 0.3)"

#### Scenario: Low distinct-1 warning
- **WHEN** `distinct_1 < 0.3`
- **THEN** the skill SHALL output warning: "Low vocabulary diversity (distinct_1 < 0.3)"

#### Scenario: Max token run warning
- **WHEN** `max_token_run > 10`
- **THEN** the skill SHALL output warning: "Long repeated token run detected (max_token_run > 10)"

#### Scenario: Collapse threshold requires investigation
- **WHEN** `repetition_rate > 0.7` OR `distinct_1 < 0.1` OR `max_token_run > 50`
- **THEN** the skill SHALL stop and output: "Generation collapse detected"
- **AND** the skill SHALL require an investigation note before writing/accepting evidence

---

### Requirement: Fixed-prompt samples required

The `mlspec-run` skill template SHALL require fixed-prompt samples for quality assessment.

#### Scenario: Fixed prompts for sampling
- **WHEN** evidence is recorded
- **THEN** the evidence SHALL include samples from 3-5 fixed prompts
- **AND** prompts SHALL be documented in evidence for reproducibility

#### Scenario: Sample generation
- **WHEN** training run includes sampling
- **THEN** samples SHALL be generated using fixed temperature (e.g., 0.8) and top-p (e.g., 0.9)