## Context

MLSpec init currently shows a minimal welcome message:

```
MLSpec Experiment Management
Set up your ML experimentation workspace
```

OpenSpec init shows an animated ASCII art welcome screen with the OpenSpec logo and more context. MLSpec should have a similar experience with an MLSpec-specific banner.

The `showWelcome()` method in `MlspecInitCommand` class (lines 104-109) currently just logs a simple header. This should be enhanced to show a proper welcome banner.

## Goals / Non-Goals

**Goals:**
- Add MLSpec-specific ASCII art welcome banner to `mlspec init`
- Show what will be configured (workspace, skills, commands)
- Display quick start MLSpec commands after setup
- Support interactive mode with "Press Enter to select tools..." prompt
- Maintain cross-platform compatibility (Windows, macOS, Linux)

**Non-Goals:**
- Creating new ASCII art animation frames (reuse OpenSpec patterns)
- Changing any workspace creation logic
- Modifying skill installation behavior
- Adding new functionality beyond UX polish

## Decisions

**Decision 1: Create a dedicated MLSpec welcome module similar to OpenSpec's welcome-screen.ts**

Rationale: The OpenSpec welcome screen is in `src/ui/welcome-screen.ts` and uses `src/ui/ascii-patterns.ts` for ASCII art. MLSpec should have its own `src/mlspec/ui/welcome-banner.ts` to keep concerns separated while following the same patterns.

**Decision 2: Use simplified static welcome banner instead of animation**

Rationale: Creating animation frames is more complex. Since the user provided a static ASCII art design, we can implement a simpler static banner without the animation complexity. This reduces code size and maintenance burden while still providing the visual improvement.

**Decision 3: Follow the same structure as OpenSpec's welcome text**

The OpenSpec welcome shows:
- "Welcome to OpenSpec" + tagline
- "This setup will configure:" with bullet points
- "Quick start after setup:" with commands
- "Press Enter to select tools..."

The MLSpec version should follow the same structure but with MLSpec-specific content.

## Risks / Trade-offs

- **Risk**: ASCII art may not render correctly on all terminals
  - **Mitigation**: Use fallback text-only mode for non-TTY environments, similar to OpenSpec's `canAnimate()` check

- **Risk**: Adding new dependencies
  - **Mitigation**: Reuse existing `chalk` dependency already used by MLSpec init

- **Risk**: Code duplication between OpenSpec and MLSpec welcome screens
  - **Mitigation**: Acceptable for now. If duplication grows, can extract shared utilities later.
