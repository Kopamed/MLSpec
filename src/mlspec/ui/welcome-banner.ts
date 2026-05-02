/**
 * MLSpec Welcome Banner
 *
 * Shows a static ASCII art welcome banner with MLSpec branding.
 * Styled to match OpenSpec's welcome screen for visual consistency.
 */

import chalk from 'chalk';
import { WELCOME_ANIMATION } from '../../ui/ascii-patterns.js';

// Minimum terminal width for side-by-side layout
const MIN_WIDTH = 60;

// Width of the ASCII art column (with padding)
const ART_COLUMN_WIDTH = 24;

/**
 * Welcome text content (right column)
 * Shows MLSpec-specific branding, workflow, and commands
 */
function getWelcomeText(): string[] {
  return [
    chalk.white.bold('Welcome to MLSpec'),
    chalk.dim('An evidence-driven ML experimentation framework'),
    '',
    chalk.white('This setup will configure:'),
    chalk.dim('  • MLSpec workspace'),
    chalk.dim('  • Agent skills for AI tools'),
    chalk.dim('  • MLSpec slash commands'),
    '',
    chalk.white('Workflow:'),
    chalk.dim('  explore → propose → run → resolve'),
    chalk.dim('  recipes form graph via parent links'),
    '',
    chalk.white('Quick start after setup:'),
    `  ${chalk.yellow('/mlspec-explore')}      ${chalk.dim('Explore ideas')}`,
    `  ${chalk.yellow('/mlspec-propose')}     ${chalk.dim('Create experiment')}`,
    `  ${chalk.yellow('/mlspec-run')}         ${chalk.dim('Run evidence')}`,
    `  ${chalk.yellow('/mlspec-resolve')}     ${chalk.dim('Accept/reject')}`,
    `  ${chalk.yellow('/mlspec-next')}        ${chalk.dim('What to do next')}`,
    '',
    chalk.cyan('Press Enter to select tools...'),
  ];
}

/**
 * Renders a single frame with side-by-side layout
 */
function renderFrame(artLines: string[], textLines: string[]): string {
  const maxLines = Math.max(artLines.length, textLines.length);
  const lines: string[] = [];

  for (let i = 0; i < maxLines; i++) {
    const artLine = artLines[i] || '';
    const textLine = textLines[i] || '';

    // Pad the art column to fixed width
    const paddedArt = artLine.padEnd(ART_COLUMN_WIDTH);

    // Color the ASCII art with cyan for visual appeal
    const coloredArt = chalk.cyan(paddedArt);

    // Clear line before writing to prevent residual characters
    lines.push(`\x1b[2K${coloredArt}${textLine}`);
  }

  return lines.join('\n');
}

/**
 * Checks if the terminal supports animated display
 */
function canAnimate(): boolean {
  // Must be TTY
  if (!process.stdout.isTTY) return false;

  // Respect NO_COLOR
  if (process.env.NO_COLOR) return false;

  // Check terminal width
  const columns = process.stdout.columns || 80;
  if (columns < MIN_WIDTH) return false;

  return true;
}

/**
 * Wait for Enter key press
 */
function waitForEnter(): Promise<void> {
  return new Promise((resolve) => {
    const { stdin } = process;

    // Handle non-TTY gracefully
    if (!stdin.isTTY) {
      resolve();
      return;
    }

    const wasRaw = stdin.isRaw;
    stdin.setRawMode(true);
    stdin.resume();

    const onData = (data: Buffer): void => {
      const char = data.toString();

      // Enter key or Ctrl+C
      if (char === '\r' || char === '\n' || char === '\u0003') {
        stdin.removeListener('data', onData);
        stdin.setRawMode(wasRaw);
        stdin.pause();

        // Handle Ctrl+C
        if (char === '\u0003') {
          process.stdout.write('\n');
          process.exit(0);
        }

        resolve();
      }
    };

    stdin.on('data', onData);
  });
}

/**
 * Shows the MLSpec welcome banner with animation.
 * Returns when user presses Enter.
 */
export async function showMlspecWelcome(): Promise<void> {
  const textLines = getWelcomeText();

  if (!canAnimate()) {
    // Fallback: show static welcome with peak frame
    const frame = WELCOME_ANIMATION.frames[7]; // Final frame (full logo)
    process.stdout.write('\n' + renderFrame(frame, textLines) + '\n\n');
    return;
  }

  let frameIndex = 0;
  let running = true;
  let isFirstRender = true;

  // Content height for cursor movement between frames
  const numContentLines = Math.max(WELCOME_ANIMATION.frames[0].length, textLines.length);
  const frameHeight = numContentLines + 1; // internal newlines (10) + trailing newlines (2) = 13

  // Total height including initial newline (for cleanup)
  const totalHeight = frameHeight + 1; // 14

  // Initial render
  process.stdout.write('\n');

  // Animation loop
  const interval = setInterval(() => {
    if (!running) return;

    const frame = WELCOME_ANIMATION.frames[frameIndex];

    // Move cursor up to overwrite previous frame (always after first render)
    if (!isFirstRender) {
      process.stdout.write(`\x1b[${frameHeight}A`);
    }
    isFirstRender = false;

    // Render current frame
    process.stdout.write(renderFrame(frame, textLines) + '\n\n');

    // Advance to next frame
    frameIndex = (frameIndex + 1) % WELCOME_ANIMATION.frames.length;
  }, WELCOME_ANIMATION.interval);

  // Wait for Enter
  await waitForEnter();

  // Stop animation
  running = false;
  clearInterval(interval);

  // Clear the welcome screen and move on
  process.stdout.write(`\x1b[${totalHeight}A`);
  for (let i = 0; i < totalHeight; i++) {
    process.stdout.write('\x1b[2K\n'); // Clear line
  }
  process.stdout.write(`\x1b[${totalHeight}A`); // Move back up
}
