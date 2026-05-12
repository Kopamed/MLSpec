---
name: ml-spec-frame-case
description: Define an ML experiment question and draft its protocol. Use when the user wants to frame a new ML experiment case with structured protocols.
license: MIT
compatibility: opencode
metadata:
  version: "0.1"
---

# SKILL CONTRACT

## Goal
Frame a new ML experiment case by defining the question, drafting a protocol with resource requirements, and establishing acceptance criteria.

## Inputs
- Question: What claim do we want to evaluate?
- Mode: scratch | structured | decision
- Objective: The technical goal (e.g., "improve accuracy on test set")
- Metric spec: name, direction (max/min), split (train/val/test)
- Required resources: gpu_hours, wallclock_hours, data_fraction, seeds, epochs
- Optional: baseline_spec, dataset_specs, acceptance_rule

## Preconditions
- Case does not already exist for this question
- Actor (agent) has authority to propose experiments

## Default next steps
1. Create case with `mlspec case create`
2. Draft protocol with `mlspec protocol draft`
3. Lock protocol with `mlspec protocol lock` (once stable)
4. Create snapshot with `mlspec snapshot create` (before runs)

## Required CLI mutations
- `mlspec case create --question <q> --mode <mode> --actor-ref <actor> --json`
- `mlspec protocol draft --case-id <id> --objective <obj> --metric-name <name> --metric-direction <dir> --metric-split <split> --gpu-hours <n> --wallclock-hours <n> --data-fraction <n> --seeds <n> --epochs <n> --actor-ref <actor> --json`

## Required local validations
- Question is non-empty and specific
- Metric direction matches intended goal (max for accuracy, min for loss)
- Resource estimates are realistic for the experiment scope
- Mode is appropriate: use "decision" when intending to make accept/reject decisions

## Maximum allowed claim
- The frame-case skill can only establish a Case and Protocol
- It cannot claim any experimental results
- All results must come from run-candidate and decide-case skills

## Refuse if
- Question is vague or not answerable by experimentation
- Resource requirements are impossibly low (e.g., < 0.1 GPU hours for a training run)
- Mode is "decision" but no acceptance criteria are defined

## Outputs
- Case ID (from case.create response)
- Protocol ID (from protocol.draft response)
- Confirmation that case is in "proposed" or "ready" status