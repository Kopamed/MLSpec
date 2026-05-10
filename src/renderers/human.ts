import chalk from "chalk";
import type { Renderer } from "../renderers.js";
import type { CheckResult } from "../types.js";

export class HumanRenderer implements Renderer {
  render(result: CheckResult): string {
    const lines: string[] = [];

    lines.push(chalk.white.bold(`MLSpec check: ${result.experimentId}`));
    lines.push("");
    lines.push(chalk.dim("Objective:") + " " + result.objective);

    // We don't have claim.text in the new CheckResult, so we reconstruct it
    lines.push(
      chalk.dim("Claim:") + " " + `Candidate improves ${result.claim.metric} (${result.claim.direction})`
    );
    lines.push("");

    // Show metric values if available
    if (
      result.baselineMetric !== undefined &&
      result.candidateMetric !== undefined
    ) {
      lines.push(`  ${result.claim.metric}`);
      lines.push(`  baseline:  ${result.baselineMetric}`);
      lines.push(`  candidate: ${result.candidateMetric}`);
      lines.push("");
    }

    if (result.verdict === "VALID") {
      lines.push(chalk.green("✓ VALID COMPARISON"));
      lines.push("");
      lines.push(
        chalk.dim("  The required controls match and the target metric improved.")
      );
    } else if (result.verdict === "INVALID") {
      lines.push(chalk.red("✗ INVALID COMPARISON"));
      lines.push("");

      lines.push(chalk.dim("  Why:"));
      for (const failure of result.failures) {
        if (failure.details) {
          lines.push(`  • ${failure.message}`);
          if (failure.details.baseline !== undefined) {
            lines.push(
              `    baseline:  ${String(failure.details.baseline)}`
            );
            lines.push(
              `    candidate: ${String(failure.details.candidate)}`
            );
          }
        } else {
          lines.push(`  • ${failure.message}`);
        }
      }
      lines.push("");
      lines.push(chalk.dim("  Allowed:"));
      lines.push(
        "  • Candidate produced higher metric in its run"
      );
      lines.push("");
      lines.push(chalk.dim("  Disallowed:"));
      lines.push("  • Candidate is better than baseline");
      lines.push("  • Intervention caused the improvement");
      lines.push("  • Candidate recipe should be promoted");
    } else {
      lines.push(chalk.yellow("⚠ CLAIM NOT SUPPORTED"));
      lines.push("");
      lines.push(
        chalk.dim("  The comparison controls passed, but the target metric did not improve.")
      );
    }

    return lines.join("\n");
  }
}
