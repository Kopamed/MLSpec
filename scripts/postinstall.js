#!/usr/bin/env node

/**
 * Postinstall script for MLSpec.
 *
 * This script is a no-op for now. It exists to prevent npm from
 * failing if postinstall hooks are expected by any tooling.
 *
 * The script never fails npm install - all errors are caught and handled gracefully.
 */

// Run main and handle any unhandled errors
main().catch(() => {
  // Silent failure - never break npm install
  process.exit(0);
});

function main() {
  // No-op: MLSpec does not require postinstall actions
  return Promise.resolve();
}
