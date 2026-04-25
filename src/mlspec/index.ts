/**
 * MLSpec CLI Binary Entry Point
 *
 * This is the entry point for the standalone `mlspec` binary.
 */

import { Command } from 'commander';
import { createRequire } from 'module';
import ora from 'ora';
import { maybeShowTelemetryNotice, trackCommand, shutdown } from '../telemetry/index.js';

const require = createRequire(import.meta.url);
const { version } = require('../../package.json');

const program = new Command();

function getCommandPath(command: Command): string {
  const names: string[] = [];
  let current: Command | null = command;

  while (current) {
    const name = current.name();
    if (name && name !== 'mlspec') {
      names.unshift(name);
    }
    current = current.parent;
  }

  return names.join(':') || 'mlspec';
}

program
  .name('mlspec')
  .description('MLSpec experiment management CLI')
  .version(version);

program.hook('preAction', async (thisCommand, actionCommand) => {
  await maybeShowTelemetryNotice();
  const commandPath = getCommandPath(actionCommand);
  await trackCommand(commandPath, version);
});

program.hook('postAction', async () => {
  await shutdown();
});

// Register MLSpec commands directly on program (for standalone mlspec binary)
const { registerMlspecCommands } = await import('./cli/index.js');
registerMlspecCommands(program);

program.parse();
