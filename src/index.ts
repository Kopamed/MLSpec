#!/usr/bin/env node

import path from "node:path";
import { mkdirSync, existsSync } from "node:fs";
import { checkExperiment } from "./check.js";
import { readYaml, die } from "./io.js";
import { HumanRenderer } from "./renderers/human.js";
import { JsonRenderer } from "./renderers/json.js";
import { XmlRenderer } from "./renderers/xml.js";
import type { Experiment, CheckResult } from "./types.js";

const args = process.argv.slice(2);

function printHelp(): void {
  console.log(`mlspec

Commands:
  check <experiment-id>   Check whether an experiment supports its claim
  init                   Create mlspec/ directory

Options:
  --root <path>          Project root (default: cwd)
  --json                 Output as JSON
  --xml                  Output as XML

Examples:
  mlspec check eos-test
  mlspec check eos-test --root ./fixtures/001-eval-split-mismatch
  mlspec check eos-test --json
`);
}

if (args.length === 0) {
  printHelp();
  process.exit(0);
}

const command = args[0];

if (command === "check") {
  let experimentId: string | undefined;
  let projectRoot = process.cwd();
  let format: "human" | "json" | "xml" = "human";

  // Parse args
  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--root" && i + 1 < args.length) {
      projectRoot = path.resolve(args[i + 1]);
      i++;
    } else if (args[i] === "--json") {
      format = "json";
    } else if (args[i] === "--xml") {
      format = "xml";
    } else if (!experimentId) {
      experimentId = args[i];
    }
  }

  if (!experimentId) {
    die("Missing experiment id. Usage: mlspec check <experiment-id>");
  }

  const expDir = path.join(projectRoot, "mlspec", "experiments", experimentId);
  const experimentPath = path.join(expDir, "experiment.yaml");

  const experiment = readYaml<Experiment>(experimentPath);
  const result = checkExperiment(experimentId, projectRoot);

  // Add objective and claim to result for renderers
  const fullResult: CheckResult = {
    ...result,
    objective: experiment.objective,
    claim: {
      metric: experiment.claim.metric,
      direction: experiment.claim.direction,
    },
  };

  let renderer;
  if (format === "json") {
    renderer = new JsonRenderer();
  } else if (format === "xml") {
    renderer = new XmlRenderer();
  } else {
    renderer = new HumanRenderer();
  }

  console.log(renderer.render(fullResult));

  if (result.verdict === "INVALID" || result.verdict === "NOT_SUPPORTED") {
    process.exit(1);
  }
} else if (command === "init") {
  const mlspecDir = path.join(process.cwd(), "mlspec");

  if (existsSync(mlspecDir)) {
    // Already exists, do nothing
    process.exit(0);
  }

  try {
    mkdirSync(mlspecDir, { recursive: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "EEXIST") {
      die("Cannot create mlspec/: a file with that name already exists");
    }
    throw err;
  }
} else {
  die(`Unknown command: ${command}`);
}
