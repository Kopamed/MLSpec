## 1. Update experiment.md template

- [x] 1.1 Add ## Experiment Type section with classification options
- [x] 1.2 Add template instructions for each experiment type

## 2. Update prepare.md template

- [x] 2.1 Restructure into phases: Infrastructure, Tiny/Smoke Run, Protocol Run
- [x] 2.2 Add Run Readiness section with pre-flight checkboxes
- [x] 2.3 Update Logging section with metrics and artifacts tracking
- [x] 2.4 Add verification command and expected output guidance to each task

## 3. Update evidence.md template

- [x] 3.1 Add ## Run Identity section
- [x] 3.2 Add ## Run Records table (Step, Command, Duration, Status, Notes)
- [x] 3.3 Expand ## Commands Run section
- [x] 3.4 Expand ## Configs Used section
- [x] 3.5 Add ## Evidence Grade section with Smoke/Partial-Run/Full-Protocol/Failed-Run options
- [x] 3.6 Add ## Protocol Satisfaction section
- [x] 3.7 Expand ## Deviations from Protocol into table format
- [x] 3.8 Add ## Claims Invalidated During Run section
- [x] 3.9 Add ## Implementation Issues Found section
- [x] 3.10 Add ## Validity Assessment section
- [x] 3.11 Expand ## Artifacts Produced section
- [x] 3.12 Expand ## Samples section

## 4. Update resolution.md template

- [x] 4.1 Add ## Decision-Grade Evidence section with Yes/No options
- [x] 4.2 Restructure ## Decision section with explicit options
- [x] 4.3 Add ## Basis section
- [x] 4.4 Add ## Protocol Compliance section
- [x] 4.5 Expand ## Evidence Summary section
- [x] 4.6 Expand ## Cost section
- [x] 4.7 Add ## Next Action section with archive/rerun/update-protocol/follow-up/stop options

## 5. Update schema.yaml instructions

- [x] 5.1 Update evidence.md artifact instruction to emphasize evidence grade gates
- [x] 5.2 Update evidence.md instruction to prohibit planned future runs as evidence
- [x] 5.3 Update evidence.md instruction to require deviation recording
- [x] 5.4 Update resolution.md instruction to enforce evidence grade gates
- [x] 5.5 Update resolution.md instruction: Accepted/Rejected require Full-Protocol + Protocol Satisfaction
- [x] 5.6 Update resolution.md instruction: Smoke/Partial → Inconclusive/Invalid/Needs-Rerun

## 6. Verify

- [x] 6.1 Run `openspec schemas` to confirm ml-experiment schema loads
- [x] 6.2 Run `openspec instructions experiment --schema ml-experiment` to verify experiment.md template
- [x] 6.3 Run `openspec instructions prepare --schema ml-experiment` to verify prepare.md template
- [x] 6.4 Run `openspec instructions evidence --schema ml-experiment` to verify evidence.md template
- [x] 6.5 Run `openspec instructions resolution --schema ml-experiment` to verify resolution.md template
