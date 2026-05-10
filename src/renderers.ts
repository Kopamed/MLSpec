import type { CheckResult } from "../types.js";

export interface Renderer {
  render(result: CheckResult): string;
}
