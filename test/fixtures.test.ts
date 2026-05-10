import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { join } from "node:path";

/**
 * Static fixture tests - run MLSpec directly against fixtures
 * These are the default tests that verify MLSpec correctly detects problems.
 */

function runMlspecCheck(fixtureId: string): string {
  // Static tests point to environment/ folder since that's where mlspec data lives
  const fixtureRoot = join(process.cwd(), "fixtures", fixtureId, "environment");
  try {
    const stdout = execSync(
      `node dist/index.js check eos-test --root "${fixtureRoot}"`,
      { encoding: "utf-8", stderr: "utf-8" }
    );
    return stdout;
  } catch (err) {
    const error = err as { stdout?: string; status?: number };
    return error.stdout || "";
  }
}

describe("Fixtures (Static)", () => {
  it("001-eval-split-mismatch detects eval split mismatch", () => {
    const output = runMlspecCheck("001-eval-split-mismatch");
    expect(output).toContain("INVALID COMPARISON");
    expect(output).toContain("eval_split");
  });

  it("002-metric-script-mismatch detects metric script mismatch", () => {
    const output = runMlspecCheck("002-metric-script-mismatch");
    expect(output).toContain("INVALID COMPARISON");
    expect(output).toContain("metric_script");
  });

  it("003-smoke-promoted-as-validation detects insufficient evidence stage", () => {
    const output = runMlspecCheck("003-smoke-promoted-as-validation");
    expect(output).toContain("INVALID COMPARISON");
    expect(output).toContain("evidence stage");
  });
});
