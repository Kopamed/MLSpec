## 1. Project Setup

- [x] 1.1 Initialize package.json with name "mlspec", bin "mlspec", type "module"
- [x] 1.2 Create tsconfig.json with ES2022 target, NodeNext module resolution
- [x] 1.3 Create build.ts with Bun.build for Node target, add shebang post-build
- [x] 1.4 Add dependencies: yaml, picocolors
- [x] 1.5 Add devDependencies: typescript, @types/node

## 2. Type Definitions

- [x] 2.1 Create src/types.ts with Experiment type (id, objective, claim, baseline, candidate, required_controls, success_criteria)
- [x] 2.2 Add Claim type (text, metric, direction: increase|decrease)
- [x] 2.3 Add Run type (id, role, stage, status, command, metrics_path, provenance)
- [x] 2.4 Add RunRole type: "baseline" | "candidate"
- [x] 2.5 Add Stage type: "smoke" | "validation" | "final"
- [x] 2.6 Add Metrics type: Record<string, string | number | boolean | null>

## 3. IO Module

- [x] 3.1 Create src/io.ts with readYaml<T>(filePath) function
- [x] 3.2 Add readJson<T>(filePath) function
- [x] 3.3 Add fileExists(filePath) helper
- [x] 3.4 Add die(message) for error exit with red colored output

## 4. Check Logic

- [x] 4.1 Create src/check.ts with checkExperiment(experimentId, projectRoot) function
- [x] 4.2 Implement stageRank() helper (smoke=1, validation=2, final=3)
- [x] 4.3 Validate baseline and candidate runs are "completed"
- [x] 4.4 Validate both runs meet min_stage requirement
- [x] 4.5 Validate required_controls match between runs
- [x] 4.6 Validate metric improved in claimed direction
- [x] 4.7 Return/emit appropriate verdict (VALID, INVALID, NOT_SUPPORTED)

## 5. CLI Entry

- [x] 5.1 Create src/index.ts with CLI argument parsing
- [x] 5.2 Implement `mlspec check <experiment-id>` command
- [x] 5.3 Add --root flag for specifying project root (default: cwd)
- [x] 5.4 Output formatted verdict with explanations
- [x] 5.5 Add shebang (#!/usr/bin/env node) at top of compiled output

## 6. First Fixture

- [x] 6.1 Create fixtures/001-eval-split-mismatch/ fake project structure
- [x] 6.2 Create .mlspec/experiments/eos-test/ with experiment.yaml
- [x] 6.3 Create baseline run with eval_split "val-v1", accuracy 0.8
- [x] 6.4 Create candidate run with eval_split "train-v1", accuracy 0.91
- [x] 6.5 Add prompt.md and expected.txt for test validation
- [x] 6.6 Verify `mlspec check eos-test` outputs INVALID COMPARISON

## 7. Build Verification

- [x] 7.1 Run bun build and verify dist/index.js is created
- [x] 7.2 Verify shebang is present in dist/index.js
- [x] 7.3 Test CLI works via node dist/index.js check eos-test
