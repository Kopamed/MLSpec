import { build } from "bun";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";

const out = "dist/index.js";

// Ensure dist directory exists
mkdirSync("dist", { recursive: true });

const result = await build({
  entrypoints: ["src/index.ts"],
  outdir: "dist",
  target: "node",
  format: "esm",
  sourcemap: "external",
});

if (!result.success) {
  console.error("Build failed:", result.logs);
  process.exit(1);
}

console.log("Build result:", result);

let built = readFileSync(out, "utf8");

if (!built.startsWith("#!")) {
  built = `#!/usr/bin/env node\n${built}`;
  writeFileSync(out, built);
}

if (process.platform !== "win32") {
  spawn("chmod", ["+x", out]);
}

console.log("Build complete:", out);
