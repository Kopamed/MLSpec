## Why

The current MLSpec output uses `picocolors` with minimal styling (only verdict colors). OpenSpec's aesthetics use `chalk` with a hierarchical color system that creates visual hierarchy through thoughtful use of bold, dim, and colored text. Adopting chalk and OpenSpec's aesthetics improves readability and user experience.

## What Changes

- Replace `picocolors` dependency with `chalk`
- Adopt OpenSpec's color hierarchy aesthetic:
  - `white.bold` for headers
  - `dim` for secondary/labels
  - `green/red/yellow` for verdict symbols
  - `white` for regular text
  - `red` for errors
- Update human renderer with hierarchical styling
- Update error output to use chalk
- Update AGENTS.md design language

## Capabilities

### New Capabilities

- `chalk-aesthetics`: Human-readable output styled with chalk using OpenSpec's aesthetic hierarchy. Creates visual hierarchy through color and weight rather than decoration.

### Modified Capabilities

- `human-renderer`: Update styling to use chalk's hierarchical approach instead of picocolors with minimal color.

## Impact

- `package.json`: Replace picocolors with chalk dependency
- `src/renderers/human.ts`: Rewrite with chalk, adopting OpenSpec's aesthetic
- `src/io.ts`: Use chalk for error messages
- `AGENTS.md`: Update Human Design Language section
