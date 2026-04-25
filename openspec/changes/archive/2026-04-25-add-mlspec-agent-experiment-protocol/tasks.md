## 1. Protocol Documentation

- [x] 1.1 Create `src/mlspec/protocol.ts` containing AGENTS.md content as a string constant
- [x] 1.2 Export `AGENTS_CONTENT` constant for use in CLI

## 2. CLI Enhancements

### 2.1 Init command creates AGENTS.md
- [x] 2.1.1 Update `ml init` command to write `mlspec/AGENTS.md` using `AGENTS_CONTENT`

### 2.2 Enhanced hypothesis template
- [x] 2.2.1 Update hypothesis.md template in `src/mlspec/cli.ts` to include:
  - Controlled Variables section with structure for model/architecture, dataset split or sampling, preprocessing/input representation, optimizer and learning-rate schedule, batch size/accumulation, seed(s), training budget, evaluation procedure, and domain-specific variables where relevant
  - Success Criteria section
  - Abort Criteria section
  - Evidence Level Plan section with checkboxes
  - Planned Command section
  - Expected Output Location section

### 2.3 Enhanced evidence template
- [x] 2.3.1 Update evidence.md template in `src/mlspec/cli.ts` to include:
  - `commands.planned` and `commands.executed` in frontmatter
  - `artifacts` section in frontmatter with metrics_file, checkpoint, predictions, log_file, changed_files
  - Changed Files markdown section
  - Interpretation markdown section
  - Recommendation checkboxes section

### 2.4 Enhanced decision template
- [x] 2.4.1 Update decision.md template in `src/mlspec/cli.ts` to include:
  - Evidence Considered section
  - Reasoning section
  - What This Decision Proves section
  - What This Decision Does Not Prove section

## 3. Validation Enhancements

### 3.1 Evidence without hypothesis error
- [x] 3.1.1 Add validation in `ml validate` to check for evidence files when hypothesis.md is missing
- [x] 3.1.2 Emit ERROR (not warning) when evidence exists but no hypothesis

### 3.2 Missing actual command warning
- [x] 3.2.1 Add validation to check `commands.executed` field in evidence frontmatter
- [x] 3.2.2 Emit WARNING when `commands.executed` is empty or missing

### 3.3 Missing artifacts warning
- [x] 3.3.1 Add validation to check `artifacts` section in evidence frontmatter
- [x] 3.3.2 Emit WARNING when no artifact paths are recorded

### 3.4 Placeholder value warnings
- [x] 3.4.1 Placeholder metrics are caught by schema validation (number expected, string received) - no separate check needed
- [x] 3.4.2 Existing placeholder checks for decision fields remain (rejection_reason, uncertainty_reason, blocker, retry_plan)

## 4. Status Protocol State Improvements

- [x] 4.1 Add `getProtocolState()` function to determine experiment state
- [x] 4.2 Update `ml status` to show protocol state for each experiment
- [x] 4.3 Group active experiments by state: needs hypothesis / needs evidence / needs decision / needs promotion / needs archive, and show archived experiments separately by archive subdirectory

## 5. Testing

- [x] 5.1 Add unit test for protocol state detection
- [x] 5.2 Add integration test for validation warnings (missing actual_command, missing artifacts)
- [x] 5.3 Add integration test for validation error (evidence without hypothesis)
- [x] 5.4 Verify enhanced templates produce expected structure

## 6. Build and Validation

- [x] 6.1 Run `pnpm build` and verify no errors
- [x] 6.2 Run `pnpm lint` and fix any issues
- [x] 6.3 Run `pnpm test` and verify all tests pass
- [x] 6.4 Run `openspec validate add-mlspec-agent-experiment-protocol --strict`