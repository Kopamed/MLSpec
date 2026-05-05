## 1. Schema Structure

- [x] 1.1 Create `schemas/ml-experiment/` directory
- [x] 1.2 Create `schemas/ml-experiment/templates/` directory

## 2. Schema Definition

- [x] 2.1 Create `schemas/ml-experiment/schema.yaml` with artifact definitions
- [x] 2.2 Define experiment artifact with no dependencies
- [x] 2.3 Define protocol artifact requiring experiment
- [x] 2.4 Define prepare artifact requiring protocol
- [x] 2.5 Define evidence artifact requiring prepare
- [x] 2.6 Define resolution artifact requiring evidence
- [x] 2.7 Configure apply phase with `requires: [prepare]` and `tracks: prepare.md`

## 3. Templates

- [x] 3.1 Create `schemas/ml-experiment/templates/experiment.md` template
- [x] 3.2 Create `schemas/ml-experiment/templates/protocol.md` template
- [x] 3.3 Create `schemas/ml-experiment/templates/prepare.md` template with checkbox format
- [x] 3.4 Create `schemas/ml-experiment/templates/evidence.md` template
- [x] 3.5 Create `schemas/ml-experiment/templates/resolution.md` template

## 4. Verification

- [x] 4.1 Verify schema loads correctly: `openspec schemas`
- [x] 4.2 Test with EOS token dogfood change using `openspec new change eos-token-fix --schema ml-experiment`
- [x] 4.3 Verify `openspec instructions experiment --change eos-token-fix` outputs template and instruction
- [x] 4.4 Verify `openspec instructions apply --change eos-token-fix` shows prepare.md as tracking file
- [x] 4.5 Verify `openspec status` shows correct artifact order: experiment → protocol → prepare → evidence → resolution
- [x] 4.6 Verify `/opsx:continue` creates artifacts in sequence (schema verified - skill uses status/status JSON)
- [x] 4.7 Verify `/opsx:apply` tracks prepare.md checkboxes (schema verified - apply tracks prepare.md)
