import type { Renderer } from "../renderers.js";
import type { CheckResult } from "../types.js";

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export class XmlRenderer implements Renderer {
  render(result: CheckResult): string {
    const lines: string[] = [];

    lines.push(
      `<result verdict="${result.verdict}">`
    );
    lines.push(`  <experiment>${escapeXml(result.experimentId)}</experiment>`);
    lines.push(`  <objective>${escapeXml(result.objective)}</objective>`);
    lines.push(
      `  <claim metric="${escapeXml(result.claim.metric)}" direction="${escapeXml(result.claim.direction)}"/>`
    );

    if (result.baselineMetric !== undefined || result.candidateMetric !== undefined) {
      lines.push("  <metrics>");
      lines.push(
        `    <baseline value="${result.baselineMetric ?? ""}"/>`
      );
      lines.push(
        `    <candidate value="${result.candidateMetric ?? ""}"/>`
      );
      lines.push("  </metrics>");
    }

    if (result.failures.length > 0) {
      lines.push("  <failures>");
      for (const failure of result.failures) {
        lines.push(
          `    <failure type="${escapeXml(failure.type)}">${escapeXml(failure.message)}</failure>`
        );
        if (failure.details) {
          lines.push(`      <baseline>${escapeXml(String(failure.details.baseline ?? ""))}</baseline>`);
          lines.push(`      <candidate>${escapeXml(String(failure.details.candidate ?? ""))}</candidate>`);
        }
      }
      lines.push("  </failures>");
    }

    if (result.verdict === "INVALID") {
      lines.push("  <disallowedConclusions>");
      lines.push("    <conclusion>The candidate is better than the baseline.</conclusion>");
      lines.push("    <conclusion>The intervention caused the improvement.</conclusion>");
      lines.push("    <conclusion>The candidate recipe should be promoted.</conclusion>");
      lines.push("  </disallowedConclusions>");
    }

    if (result.verdict === "VALID") {
      lines.push("  <allowedConclusions>");
      lines.push(
        "    <conclusion>The required controls match and the target metric improved.</conclusion>"
      );
      lines.push("  </allowedConclusions>");
    }

    lines.push("</result>");

    return lines.join("\n");
  }
}
