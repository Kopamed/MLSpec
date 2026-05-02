## ADDED Requirements

### Requirement: MLSpec init shows welcome banner
The `mlspec init` command SHALL display an ASCII art welcome banner when run in interactive mode.

#### Scenario: Interactive mlspec init shows welcome banner
- **WHEN** user runs `mlspec init` in interactive mode
- **THEN** the system displays a welcome banner with "Welcome to MLSpec" and "An evidence-driven ML experimentation framework"

#### Scenario: Welcome banner shows ASCII art
- **WHEN** user runs `mlspec init` in interactive mode
- **THEN** the system displays ASCII art showing a diamond/rhombus pattern

#### Scenario: Welcome banner shows configuration items
- **WHEN** user runs `mlspec init` in interactive mode
- **THEN** the system displays what will be configured:
  - MLSpec workspace
  - Agent skills for AI tools
  - MLSpec slash commands

#### Scenario: Welcome banner shows quick start commands
- **WHEN** user runs `mlspec init` in interactive mode
- **THEN** the system displays quick start commands:
  - /mlspec-explore for exploring ideas
  - /mlspec-propose-experiment for creating hypothesis
  - /mlspec-run-evidence for running evidence

#### Scenario: Welcome banner shows interactive prompt
- **WHEN** user runs `mlspec init` in interactive mode
- **THEN** the system displays "Press Enter to select tools..." prompt

### Requirement: Non-interactive mode skips welcome banner
The `mlspec init --tools <tool>` command SHALL NOT display the welcome banner.

#### Scenario: Non-interactive mlspec init skips welcome
- **WHEN** user runs `mlspec init --tools opencode`
- **THEN** the system skips the welcome banner and proceeds directly to setup

### Requirement: Non-TTY environments show fallback banner
The `mlspec init` command SHALL show a simplified text-only banner when not running in a TTY.

#### Scenario: Non-TTY mlspec init shows fallback banner
- **WHEN** user runs `mlspec init` and stdout is not a TTY
- **THEN** the system displays a simple text welcome without ASCII art animation

---

### Requirement: Welcome banner uses MLSpec branding
The welcome banner SHALL use MLSpec-specific branding, not OpenSpec branding.

#### Scenario: Banner uses MLSpec title
- **WHEN** user runs `mlspec init` in interactive mode
- **THEN** the banner shows "Welcome to MLSpec" (not "Welcome to OpenSpec")

#### Scenario: Banner uses MLSpec tagline
- **WHEN** user runs `mlspec init` in interactive mode
- **THEN** the banner shows "An evidence-driven ML experimentation framework" as the tagline

#### Scenario: Banner uses MLSpec commands
- **WHEN** user runs `mlspec init` in interactive mode
- **THEN** the quick start section shows MLSpec commands (/mlspec-*) not OpenSpec commands (/opsx:*)
