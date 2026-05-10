import { describe, it, expect, beforeAll } from "vitest";
import { buildMlspec, runFixtureTest, getFixtures } from "./harness";

/**
 * Dynamic fixture tests - launch Claude Code agent against fixtures
 * These tests verify that agents correctly use MLSpec to validate experiments.
 *
 * Run with: bun test test/fixtures.agent.test.ts
 */

const TEST_TIMEOUT = 120000; // 2 minutes per fixture
const SEMAPHORE_LIMIT = 8;

async function runWithSemaphore<T>(
  items: T[],
  fn: (item: T) => Promise<boolean>,
  limit: number
): Promise<boolean[]> {
  const results: boolean[] = [];
  const queue = [...items];

  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift()!;
      const result = await fn(item);
      results.push(result);
    }
  }

  const workers = Array(Math.min(limit, items.length))
    .fill(null)
    .map(() => worker());

  await Promise.all(workers);
  return results;
}

describe("Fixtures (Agent)", () => {
  const fixtures = getFixtures();
  const PARALLEL_TIMEOUT = TEST_TIMEOUT * Math.ceil(fixtures.length / SEMAPHORE_LIMIT);

  beforeAll(() => {
    buildMlspec();
  }, TEST_TIMEOUT);

  it("runs all agent fixtures in parallel", async () => {
    const results = await runWithSemaphore(
      fixtures,
      async (fixtureId) => {
        const result = await runFixtureTest(fixtureId);

        if (!result.passed && result.error) {
          console.log(`[${fixtureId}] Expected:`, result.expected);
          console.log(`[${fixtureId}] Actual:`, result.actual);
        } else {
          console.log(`[${fixtureId}] ✓ PASSED`);
        }

        return result.passed;
      },
      SEMAPHORE_LIMIT
    );

    const allPassed = results.every((r) => r);
    expect(allPassed).toBe(true);
  }, PARALLEL_TIMEOUT);
});
