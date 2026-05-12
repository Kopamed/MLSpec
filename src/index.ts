import { parseArgs } from "util";
import { createStore } from "./store.js";
import type { JsonEnvelope, CommandResult } from "./types/index.js";
import { DecisionValidationError } from "./types/index.js";

const SCHEMA_VERSION = "0.1.0";

export function jsonEnvelope<T>(command: string, data: T, warnings: string[] = []): JsonEnvelope<T> {
  return {
    ok: true,
    command,
    data,
    warnings,
    meta: { schema_version: SCHEMA_VERSION },
  };
}

export function errorEnvelope(
  command: string,
  code: string,
  message: string,
  data?: Record<string, unknown>,
  blocking?: string[],
  suggested?: string[]
) {
  return {
    ok: false,
    command,
    code,
    message,
    data,
    blocking_invariants: blocking,
    suggested_next_actions: suggested,
    meta: { schema_version: SCHEMA_VERSION },
  };
}

type Handler = (args: Record<string, unknown>) => Promise<CommandResult<unknown>>;

const commands: Record<string, Handler> = {};

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log(errorEnvelope("mlspec", "NO_COMMAND", "No command specified. Run 'mlspec --help' for usage."));
    process.exit(1);
  }

  const command = args[0];
  const subcommand = args[1];

  // Handle global flags
  const wantsJson = args.includes("--json") || args.includes("-j");

  try {
    let result: CommandResult<unknown>;

    switch (command) {
      case "--version":
      case "-v":
        console.log("mlspec 0.0.1");
        return;
      case "--help":
      case "-h":
        printHelp();
        return;
      case "case":
        result = await handleCase(subcommand, args.slice(2));
        break;
      case "protocol":
        result = await handleProtocol(subcommand, args.slice(2));
        break;
      case "snapshot":
        result = await handleSnapshot(subcommand, args.slice(2));
        break;
      case "run":
        result = await handleRun(subcommand, args.slice(2));
        break;
      case "evidence":
        result = await handleEvidence(subcommand, args.slice(2));
        break;
      case "claim":
        result = await handleClaim(subcommand, args.slice(2));
        break;
      case "decision":
        result = await handleDecision(subcommand, args.slice(2));
        break;
      case "audit":
        result = await handleAudit(subcommand, args.slice(2));
        break;
      case "status":
        result = await handleStatus(args.slice(2));
        break;
      case "import":
        result = await handleImport(subcommand, args.slice(2));
        break;
      case "init":
        result = await handleInit(args.slice(2));
        break;
      default:
        result = errorEnvelope(command, "UNKNOWN_COMMAND", `Unknown command: ${command}`);
    }

    if (wantsJson || !result.ok) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      // Human-readable output for TTY
      printHuman(command, result);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(JSON.stringify(errorEnvelope(command, "INTERNAL_ERROR", msg), null, 2));
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
mlspec - ML Experiment Validity Layer

Usage: mlspec <command> [subcommand] [options]

Commands:
  case <subcommand>     Manage cases (create, show, list, archive)
  protocol <subcommand> Manage protocols (draft, lock, show)
  snapshot <subcommand> Manage snapshots (create, show)
  run <subcommand>      Manage runs (begin, end, show, list)
  evidence <subcommand> Manage evidence (classify, show)
  claim <subcommand>    Manage claims (create, show)
  decision <subcommand> Manage decisions (issue, show)
  audit <subcommand>    Run audits (run, show)
  status               Show case status summary
  import <source>      Import from external source (mlflow)
  init                 Initialize .mlspec directory

Options:
  --json, -j           Output JSON envelope (default for agents)
  --help, -h           Show this help
  --version, -v        Show version

Examples:
  mlspec case create --question "Is model X better?" --mode structured --actor agent-1 --json
  mlspec protocol draft --case-id <id> --objective "improve accuracy" ...
  mlspec run begin --case-id <id> --kind full --command "python train.py"
  mlspec run end --run-id <id> --status completed --json
`);
}

function printHuman(cmd: string, result: CommandResult<unknown>) {
  if (!result.ok) {
    console.log(`Error: ${(result as any).message}`);
    return;
  }
  const data = (result as any).data;
  if (cmd === "case" && data.question) {
    console.log(`Case: ${data.id}`);
    console.log(`  Question: ${data.question}`);
    console.log(`  Mode: ${data.mode}`);
    console.log(`  Status: ${data.status}`);
  } else if (data?.id) {
    console.log(`${data.id}`);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

// ---- Case ----

async function handleCase(subcmd: string | undefined, args: string[]): Promise<CommandResult<unknown>> {
  const store = createStore();
  switch (subcmd) {
    case "create": {
      const { values } = parseArgs({
        args,
        options: {
          "question": { type: "string" },
          "mode": { type: "string" },
          "owner-refs": { type: "string" },
          "tags": { type: "string" },
          "actor-ref": { type: "string" },
          "json": { type: "boolean" },
        },
        allowPositionals: true,
      });
      const input = {
        question: values["question"] as string,
        mode: values["mode"] as any ?? "structured",
        owner_refs: values["owner-refs"] ? (values["owner-refs"] as string).split(",") : undefined,
        tags: values["tags"] ? (values["tags"] as string).split(",") : undefined,
        actor_ref: values["actor-ref"] as string ?? "unknown",
      };
      const case_ = store.createCase(input);
      return jsonEnvelope("case.create", case_);
    }
    case "show": {
      const { values } = parseArgs({ args, options: { "id": { type: "string" } } });
      const case_ = store.getCase(values["id"] as string);
      if (!case_) return errorEnvelope("case.show", "NOT_FOUND", `Case not found: ${values["id"]}`);
      return jsonEnvelope("case.show", case_);
    }
    case "list": {
      const { values } = parseArgs({
        args,
        options: {
          "status": { type: "string" },
          "mode": { type: "string" },
          "limit": { type: "string" },
        },
      });
      const filter: any = {};
      if (values["status"]) filter.status = (values["status"] as string).split(",");
      if (values["mode"]) filter.mode = (values["mode"] as string).split(",");
      if (values["limit"]) filter.limit = parseInt(values["limit"] as string);
      const cases = store.listCases(filter);
      return jsonEnvelope("case.list", { cases });
    }
    case "archive": {
      const { values } = parseArgs({ args, options: { "id": { type: "string" } } });
      const case_ = store.archiveCase(values["id"] as string);
      return jsonEnvelope("case.archive", case_);
    }
    default:
      return errorEnvelope("case", "UNKNOWN_SUBCOMMAND", `Unknown case subcommand: ${subcmd}`);
  }
}

// ---- Protocol ----

async function handleProtocol(subcmd: string | undefined, args: string[]): Promise<CommandResult<unknown>> {
  const store = createStore();
  switch (subcmd) {
    case "draft": {
      const { values } = parseArgs({
        args,
        options: {
          "case-id": { type: "string" },
          "objective": { type: "string" },
          "baseline-spec": { type: "string" },
          "dataset-specs": { type: "string" },
          "metric-name": { type: "string" },
          "metric-direction": { type: "string" },
          "metric-split": { type: "string" },
          "gpu-hours": { type: "string" },
          "wallclock-hours": { type: "string" },
          "data-fraction": { type: "string" },
          "seeds": { type: "string" },
          "epochs": { type: "string" },
          "accelerator-type": { type: "string" },
          "peak-vram-gb": { type: "string" },
          "num-devices": { type: "string" },
          "min-decision-grade": { type: "string" },
          "actor-ref": { type: "string" },
        },
      });
      const input: any = {
        case_id: values["case-id"] as string,
        objective: values["objective"] as string,
        baseline_spec: values["baseline-spec"] as string | undefined,
        dataset_specs: values["dataset-specs"] ? (values["dataset-specs"] as string).split(",") : undefined,
        metric_spec: {
          name: values["metric-name"] as string ?? "accuracy",
          direction: (values["metric-direction"] as any) ?? "max",
          split: values["metric-split"] as string ?? "test",
        },
        required_resources: {
          gpu_hours: parseFloat(values["gpu-hours"] as string ?? "0"),
          wallclock_hours: parseFloat(values["wallclock-hours"] as string ?? "0"),
          data_fraction: parseFloat(values["data-fraction"] as string ?? "1"),
          seeds: parseInt(values["seeds"] as string ?? "1"),
          epochs: parseInt(values["epochs"] as string ?? "1"),
          accelerator_type: values["accelerator-type"] as string | undefined,
          peak_vram_gb: values["peak-vram-gb"] ? parseFloat(values["peak-vram-gb"] as string) : undefined,
          num_devices: values["num-devices"] ? parseInt(values["num-devices"] as string) : undefined,
        },
        min_decision_grade: (values["min-decision-grade"] as any) ?? "decision_grade",
        actor_ref: values["actor-ref"] as string ?? "unknown",
      };
      const protocol = store.draftProtocol(input);
      return jsonEnvelope("protocol.draft", protocol);
    }
    case "lock": {
      const { values } = parseArgs({
        args,
        options: {
          "case-id": { type: "string" },
          "protocol-id": { type: "string" },
          "actor-ref": { type: "string" },
        },
      });
      const protocol = store.lockProtocol({
        case_id: values["case-id"] as string,
        protocol_id: values["protocol-id"] as string,
        actor_ref: values["actor-ref"] as string ?? "unknown",
      });
      return jsonEnvelope("protocol.lock", protocol);
    }
    case "show": {
      const { values } = parseArgs({ args, options: { "id": { type: "string" } } });
      const protocol = store.getProtocol(values["id"] as string);
      if (!protocol) return errorEnvelope("protocol.show", "NOT_FOUND", `Protocol not found: ${values["id"]}`);
      return jsonEnvelope("protocol.show", protocol);
    }
    default:
      return errorEnvelope("protocol", "UNKNOWN_SUBCOMMAND", `Unknown protocol subcommand: ${subcmd}`);
  }
}

// ---- Snapshot ----

async function handleSnapshot(subcmd: string | undefined, args: string[]): Promise<CommandResult<unknown>> {
  const store = createStore();
  switch (subcmd) {
    case "create": {
      const { values } = parseArgs({
        args,
        options: {
          "case-id": { type: "string" },
          "commit-hash": { type: "string" },
          "dirty-tree": { type: "boolean" },
          "diff-digest": { type: "string" },
          "config-digests": { type: "string" },
          "dataset-digests": { type: "string" },
          "split-manifest-digest": { type: "string" },
          "evaluator-digest": { type: "string" },
          "environment-digest": { type: "string" },
          "actor-ref": { type: "string" },
        },
      });
      const input: any = {
        case_id: values["case-id"] as string,
        dirty_tree: values["dirty-tree"] === true,
        actor_ref: values["actor-ref"] as string ?? "unknown",
      };
      if (values["commit-hash"]) input.commit_hash = values["commit-hash"];
      if (values["diff-digest"]) input.diff_digest = values["diff-digest"];
      if (values["config-digests"]) input.config_digests = (values["config-digests"] as string).split(",");
      if (values["dataset-digests"]) input.dataset_digests = (values["dataset-digests"] as string).split(",");
      if (values["split-manifest-digest"]) input.split_manifest_digest = values["split-manifest-digest"];
      if (values["evaluator-digest"]) input.evaluator_digest = values["evaluator-digest"];
      if (values["environment-digest"]) input.environment_digest = values["environment-digest"];
      const snapshot = store.createSnapshot(input);
      return jsonEnvelope("snapshot.create", snapshot);
    }
    case "show": {
      const { values } = parseArgs({ args, options: { "id": { type: "string" } } });
      const snapshot = store.getSnapshot(values["id"] as string);
      if (!snapshot) return errorEnvelope("snapshot.show", "NOT_FOUND", `Snapshot not found: ${values["id"]}`);
      return jsonEnvelope("snapshot.show", snapshot);
    }
    default:
      return errorEnvelope("snapshot", "UNKNOWN_SUBCOMMAND", `Unknown snapshot subcommand: ${subcmd}`);
  }
}

// ---- Run ----

async function handleRun(subcmd: string | undefined, args: string[]): Promise<CommandResult<unknown>> {
  const store = createStore();
  switch (subcmd) {
    case "begin": {
      const { values } = parseArgs({
        args,
        options: {
          "case-id": { type: "string" },
          "protocol-id": { type: "string" },
          "snapshot-id": { type: "string" },
          "kind": { type: "string" },
          "command": { type: "string" },
          "tracker-refs": { type: "string" },
          "commit-hash": { type: "string" },
          "environment-digest": { type: "string" },
          "actor-ref": { type: "string" },
        },
      });
      const input: any = {
        case_id: values["case-id"] as string,
        kind: (values["kind"] as any) ?? "full",
        command: values["command"] ? (values["command"] as string).split(" ") : [],
        actor_ref: values["actor-ref"] as string ?? "unknown",
      };
      if (values["protocol-id"]) input.protocol_id = values["protocol-id"];
      if (values["snapshot-id"]) input.snapshot_id = values["snapshot-id"];
      if (values["tracker-refs"]) input.tracker_refs = (values["tracker-refs"] as string).split(",");
      if (values["commit-hash"]) input.commit_hash = values["commit-hash"];
      if (values["environment-digest"]) input.environment_digest = values["environment-digest"];
      const run = store.beginRun(input);
      return jsonEnvelope("run.begin", run);
    }
    case "end": {
      const { values } = parseArgs({
        args,
        options: {
          "run-id": { type: "string" },
          "status": { type: "string" },
          "gpu-hours": { type: "string" },
          "wallclock-hours": { type: "string" },
          "data-fraction": { type: "string" },
          "seeds": { type: "string" },
          "epochs": { type: "string" },
          "accelerator-type": { type: "string" },
          "peak-vram-gb": { type: "string" },
          "num-devices": { type: "string" },
          "output-refs": { type: "string" },
          "interrupt-reason": { type: "string" },
        },
      });
      const input: any = {
        status: (values["status"] as any) ?? "completed",
      };
      if (values["gpu-hours"] || values["wallclock-hours"] || values["data-fraction"] || values["seeds"] || values["epochs"]) {
        input.actual_resources = {
          gpu_hours: parseFloat(values["gpu-hours"] as string ?? "0"),
          wallclock_hours: parseFloat(values["wallclock-hours"] as string ?? "0"),
          data_fraction: parseFloat(values["data-fraction"] as string ?? "1"),
          seeds: parseInt(values["seeds"] as string ?? "1"),
          epochs: parseInt(values["epochs"] as string ?? "1"),
        };
        if (values["accelerator-type"]) input.actual_resources.accelerator_type = values["accelerator-type"];
        if (values["peak-vram-gb"]) input.actual_resources.peak_vram_gb = parseFloat(values["peak-vram-gb"] as string);
        if (values["num-devices"]) input.actual_resources.num_devices = parseInt(values["num-devices"] as string);
      }
      if (values["output-refs"]) input.output_refs = (values["output-refs"] as string).split(",");
      if (values["interrupt-reason"]) input.interrupt_reason = values["interrupt-reason"];
      const run = store.endRun(values["run-id"] as string, input);
      return jsonEnvelope("run.end", run);
    }
    case "show": {
      const { values } = parseArgs({ args, options: { "id": { type: "string" } } });
      const run = store.getRun(values["id"] as string);
      if (!run) return errorEnvelope("run.show", "NOT_FOUND", `Run not found: ${values["id"]}`);
      return jsonEnvelope("run.show", run);
    }
    case "list": {
      const { values } = parseArgs({
        args,
        options: {
          "case-id": { type: "string" },
          "protocol-id": { type: "string" },
          "status": { type: "string" },
          "kind": { type: "string" },
          "limit": { type: "string" },
        },
      });
      const filter: any = {};
      if (values["case-id"]) filter.case_id = values["case-id"];
      if (values["protocol-id"]) filter.protocol_id = values["protocol-id"];
      if (values["status"]) filter.status = (values["status"] as string).split(",");
      if (values["kind"]) filter.kind = (values["kind"] as string).split(",");
      if (values["limit"]) filter.limit = parseInt(values["limit"] as string);
      const runs = store.listRuns(filter);
      return jsonEnvelope("run.list", { runs });
    }
    default:
      return errorEnvelope("run", "UNKNOWN_SUBCOMMAND", `Unknown run subcommand: ${subcmd}`);
  }
}

// ---- Evidence ----

async function handleEvidence(subcmd: string | undefined, args: string[]): Promise<CommandResult<unknown>> {
  const store = createStore();
  switch (subcmd) {
    case "classify": {
      const { values } = parseArgs({
        args,
        options: {
          "case-id": { type: "string" },
          "run-ids": { type: "string" },
          "baseline-run-ids": { type: "string" },
          "deviation-ids": { type: "string" },
          "actor-ref": { type: "string" },
        },
      });
      const input: any = {
        case_id: values["case-id"] as string,
        run_ids: (values["run-ids"] as string).split(","),
        metrics: [],
        actor_ref: values["actor-ref"] as string ?? "unknown",
      };
      if (values["baseline-run-ids"]) input.baseline_run_ids = (values["baseline-run-ids"] as string).split(",");
      if (values["deviation-ids"]) input.deviation_ids = (values["deviation-ids"] as string).split(",");
      const evidence = store.classifyEvidence(input);
      return jsonEnvelope("evidence.classify", evidence);
    }
    case "show": {
      const { values } = parseArgs({ args, options: { "id": { type: "string" } } });
      const evidence = store.getEvidence(values["id"] as string);
      if (!evidence) return errorEnvelope("evidence.show", "NOT_FOUND", `Evidence not found: ${values["id"]}`);
      return jsonEnvelope("evidence.show", evidence);
    }
    default:
      return errorEnvelope("evidence", "UNKNOWN_SUBCOMMAND", `Unknown evidence subcommand: ${subcmd}`);
  }
}

// ---- Claim ----

async function handleClaim(subcmd: string | undefined, args: string[]): Promise<CommandResult<unknown>> {
  const store = createStore();
  switch (subcmd) {
    case "create": {
      const { values } = parseArgs({
        args,
        options: {
          "case-id": { type: "string" },
          "statement": { type: "string" },
          "scope": { type: "string" },
          "comparator": { type: "string" },
          "expected-direction": { type: "string" },
          "target-metric": { type: "string" },
          "actor-ref": { type: "string" },
        },
      });
      const input: any = {
        case_id: values["case-id"] as string,
        statement: values["statement"] as string,
        scope: values["scope"] as string ?? "global",
        actor_ref: values["actor-ref"] as string ?? "unknown",
      };
      if (values["comparator"]) input.comparator = values["comparator"];
      if (values["expected-direction"]) input.expected_direction = values["expected-direction"] as any;
      if (values["target-metric"]) input.target_metric = values["target-metric"];
      const claim = store.createClaim(input);
      return jsonEnvelope("claim.create", claim);
    }
    case "show": {
      const { values } = parseArgs({ args, options: { "id": { type: "string" } } });
      const claim = store.getClaim(values["id"] as string);
      if (!claim) return errorEnvelope("claim.show", "NOT_FOUND", `Claim not found: ${values["id"]}`);
      return jsonEnvelope("claim.show", claim);
    }
    default:
      return errorEnvelope("claim", "UNKNOWN_SUBCOMMAND", `Unknown claim subcommand: ${subcmd}`);
  }
}

// ---- Decision ----

async function handleDecision(subcmd: string | undefined, args: string[]): Promise<CommandResult<unknown>> {
  const store = createStore();
  switch (subcmd) {
    case "issue": {
      const { values } = parseArgs({
        args,
        options: {
          "case-id": { type: "string" },
          "claim-id": { type: "string" },
          "status": { type: "string" },
          "evidence-ids": { type: "string" },
          "rationale": { type: "string" },
          "actor-ref": { type: "string" },
        },
      });
      const input: any = {
        case_id: values["case-id"] as string,
        claim_id: values["claim-id"] as string,
        status: values["status"] as any,
        evidence_ids: values["evidence-ids"] ? (values["evidence-ids"] as string).split(",") : [],
        rationale: values["rationale"] as string ?? "",
        actor_ref: values["actor-ref"] as string ?? "unknown",
      };
      try {
        const decision = store.issueDecision(input);
        return jsonEnvelope("decision.issue", decision);
      } catch (err) {
        if (err instanceof DecisionValidationError) {
          return errorEnvelope(
            "decision.issue",
            err.code,
            err.message,
            err.data,
            err.blocking_invariants,
            err.suggested_next_actions
          );
        }
        throw err;
      }
    }
    case "show": {
      const { values } = parseArgs({ args, options: { "id": { type: "string" } } });
      const decision = store.getDecision(values["id"] as string);
      if (!decision) return errorEnvelope("decision.show", "NOT_FOUND", `Decision not found: ${values["id"]}`);
      return jsonEnvelope("decision.show", decision);
    }
    default:
      return errorEnvelope("decision", "UNKNOWN_SUBCOMMAND", `Unknown decision subcommand: ${subcmd}`);
  }
}

// ---- Audit ----

async function handleAudit(subcmd: string | undefined, args: string[]): Promise<CommandResult<unknown>> {
  const store = createStore();
  switch (subcmd) {
    case "run": {
      const { values } = parseArgs({
        args,
        options: {
          "case-id": { type: "string" },
          "run-ids": { type: "string" },
        },
      });
      const scope: any = { case_id: values["case-id"] as string };
      if (values["run-ids"]) scope.run_ids = (values["run-ids"] as string).split(",");
      const report = store.audit(scope);
      return jsonEnvelope("audit.run", report);
    }
    default:
      return errorEnvelope("audit", "UNKNOWN_SUBCOMMAND", `Unknown audit subcommand: ${subcmd}`);
  }
}

// ---- Status ----

async function handleStatus(args: string[]): Promise<CommandResult<unknown>> {
  const store = createStore();
  const { values } = parseArgs({ args, options: { "case-id": { type: "string" } } });
  const status = store.status({ case_id: values["case-id"] as string });
  return jsonEnvelope("status", status);
}

// ---- Import ----

async function handleImport(subcmd: string | undefined, args: string[]): Promise<CommandResult<unknown>> {
  // Placeholder for mlflow import
  return errorEnvelope("import", "NOT_IMPLEMENTED", "Import from mlflow is not yet implemented");
}

// ---- Init ----

async function handleInit(args: string[]): Promise<CommandResult<unknown>> {
  const { mkdirSync, cpSync, existsSync } = await import("fs");
  const path = await import("path");

  // Create .mlspec directory
  mkdirSync(".mlspec", { recursive: true });

  // Install skills to .opencode/skills/
  const srcSkills = path.join(process.cwd(), "src", "skills");
  const destSkills = path.join(process.cwd(), ".opencode", "skills");

  if (existsSync(srcSkills)) {
    mkdirSync(".opencode", { recursive: true });
    mkdirSync(destSkills, { recursive: true });
    cpSync(srcSkills, destSkills, { recursive: true });
  }

  return jsonEnvelope("init", { message: ".mlspec/ directory initialized and skills installed" });
}

main();