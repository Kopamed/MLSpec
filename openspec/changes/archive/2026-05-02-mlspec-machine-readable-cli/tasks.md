## 1. CLI JSON Output Infrastructure

- [x] 1.1 Add `--json` flag option to `mlspec next` command
- [x] 1.2 Implement JSON output builder for `mlspec next --json`
- [x] 1.3 Add `--json` flag option to `mlspec status` command
- [x] 1.4 Implement JSON output builder for `mlspec status --json`
- [x] 1.5 Add `--experiment <id>` subcommand to `mlspec status` (requires `--json`)
- [x] 1.6 Implement JSON output builder for `mlspec status --experiment <id> --json`
- [x] 1.7 Add `--json` flag option to `mlspec show recipe` command
- [x] 1.8 Implement JSON output builder for `mlspec show recipe --json`
- [x] 1.9 Add `--json` flag option to `mlspec show evidence` command
- [x] 1.10 Implement JSON output builder for `mlspec show evidence --json`

## 2. Skill Template Updates

- [x] 2.1 Update `mlspec-next` skill template to use `mlspec next --json` first
- [x] 2.2 Update `mlspec-next` skill template to document fallback behavior
- [x] 2.3 Update `mlspec-propose` skill template to use `mlspec status --json` for workspace detection
- [x] 2.4 Update `mlspec-propose` skill template to document fallback behavior
- [x] 2.5 Update `mlspec-run` skill template to use `mlspec status --experiment --json` for pre-flight
- [x] 2.6 Update `mlspec-run` skill template to document fallback behavior
- [x] 2.7 Update `mlspec-resolve` skill template to use `mlspec show evidence --json` for pre-flight checks
- [x] 2.8 Update `mlspec-resolve` skill template to document fallback behavior
- [x] 2.9 Update `mlspec-explore` skill template to prefer JSON CLI state

## 3. Tests

- [x] 3.1 Add tests for `mlspec next --json` with pending actions
- [x] 3.2 Add tests for `mlspec next --json` with no actions (empty actions array, exit 0)
- [x] 3.3 Add tests for `mlspec next --json` in bootstrap state (action_type: 'bootstrap')
- [x] 3.4 Add tests for `mlspec next --json` error case (workspace not found)
- [x] 3.5 Add tests verifying `mlspec next --json` actions are sorted by ascending priority
- [x] 3.6 Add tests verifying `mlspec next --json` action_type values are valid
- [x] 3.7 Add tests for `mlspec status --json` output structure
- [x] 3.8 Add tests for `mlspec status --json` backward compatibility (human-readable default)
- [x] 3.9 Add tests for `mlspec status --experiment <id> --json` with existing experiment
- [x] 3.10 Add tests for `mlspec status --experiment <id> --json` with non-existent experiment (exit 1)
- [x] 3.11 Add tests for `mlspec status --experiment <id>` without `--json` (should error with JSON explaining --json is required)
- [x] 3.12 Add tests for `ready_to_resolve` computation (true when not resolved AND has recommendation)
- [x] 3.13 Add tests for `mlspec show recipe <id> --json` output structure
- [x] 3.14 Add tests for `mlspec show recipe --json` backward compatibility
- [x] 3.15 Add tests for `mlspec show recipe --json` with non-existent recipe
- [x] 3.16 Add tests for `mlspec show evidence --json` always includes smoke, validation, final keys
- [x] 3.17 Add tests for `mlspec show evidence --json` with evidence present
- [x] 3.18 Add tests for `mlspec show evidence --json` missing stages have null fields
- [x] 3.19 Add tests for `mlspec show evidence --json` backward compatibility
- [x] 3.20 Add tests for `mlspec show evidence --json` with non-existent experiment
- [x] 3.21 Add tests verifying JSON output is valid parseable JSON
- [x] 3.22 Add tests verifying pretty-print formatting (2-space indent)
- [x] 3.23 Add tests verifying error format has `error` field and non-zero exit
- [x] 3.24 Add tests verifying JSON mode stdout is clean (no spinners/banners on stdout)
- [x] 3.25 Run full MLSpec test suite to verify no regressions

## 4. Integration Verification

- [x] 4.1 Create a fresh temp workspace and run `node bin/mlspec.js init --tools opencode`
- [x] 4.2 Verify generated skills in `.opencode/skills/mlspec-*/SKILL.md` mention `--json` flags
- [x] 4.3 Verify generated skills for mlspec-propose mention `mlspec status --json` usage
- [x] 4.4 Windows CI validation handled by GitHub Actions (windows-latest in ci.yml)
