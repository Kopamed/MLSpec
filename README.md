# MLSpec

**An evidence-driven ML experimentation framework for AI agents.**

MLSpec was inspired by OpenSpec's spec-driven workflow, but is a separate tool focused on ML experimentation.

```text
Workflow:
  explore → propose → run → resolve → next
```

MLSpec gives AI agents a structured methodology for running ML experiments. Instead of ad-hoc trial-and-error, MLSpec guides agents through a disciplined experiment lifecycle with hypothesis validation, evidence collection, and systematic decision-making.

## Installation

**Requires Node.js 20.19.0 or higher.**

```bash
# Install MLSpec globally
npm install -g @kopamed/mlspec@latest

# Or use it without installing (npx)
npx @kopamed/mlspec@latest --help
```

## Quick Start

```bash
# Navigate to your ML project
cd your-ml-project

# Initialize MLSpec workspace with AI tool integration
mlspec init --tools opencode    # for OpenCode
mlspec init --tools claude      # for Claude Code
mlspec init --tools cursor      # for Cursor

# Interactive mode (auto-detects tools)
mlspec init
```

## AI Agent Commands

After initialization, your AI agent can use these slash commands:

| Command | Description |
|---------|-------------|
| `/mlspec-explore` | Explore ML experiment ideas and workspace |
| `/mlspec-propose` | Create experiment from idea |
| `/mlspec-run` | Run or record evidence for a stage |
| `/mlspec-resolve` | Resolve experiment (accept/reject/retry/hold/inconclusive) |
| `/mlspec-next` | Read-only router for next action |

## CLI Commands

```bash
mlspec init                          # Initialize workspace
mlspec update                       # Refresh skills for tools

# Recipe commands
mlspec new recipe <id> [--tag]      # Create baseline recipe
mlspec tag recipe <id> <tag>        # Add tag
mlspec untag recipe <id> <tag>       # Remove tag
mlspec list recipes [--tag]         # List recipes
mlspec show recipe <id>             # Show recipe details
mlspec diff <recipe-a> <recipe-b>   # Compare recipes

# Experiment commands
mlspec new experiment <id> --from <base> --proposes <proposed>  # Create experiment
mlspec set-status <exp> <status>   # Set status (draft/running/resolved)

# Evidence commands
mlspec add-evidence <exp> --stage <stage>   # Add evidence (smoke/validation/final)
mlspec show evidence <exp>             # Show evidence summary

# Resolution commands
mlspec accept <exp> --as <recipe> [--tag]   # Accept, create recipe
mlspec reject <exp> --reason <reason>       # Reject
mlspec retry <exp> --plan <plan>            # Retry with modifications
mlspec hold <exp> --reason <reason>         # Hold for later
mlspec inconclusive <exp> --reason <reason>  # Inconclusive

# Graph commands
mlspec graph [--format text|mermaid|dot]   # Show recipe-experiment graph
mlspec lineage <recipe-id>                  # Show recipe ancestry
mlspec next                                 # Read-only router

# Status and validation
mlspec status                               # Show workspace status
mlspec validate                             # Validate workspace
```

## Workflow

```
1. Explore
   /mlspec-explore
   → Understand workspace, identify opportunities

2. Propose
   /mlspec-propose <id> --from <base> --proposes <proposed>
   → Define hypothesis, controlled variables, success criteria

3. Run
   /mlspec-run <experiment> <stage>
   → Record evidence at smoke/validation/final stages

4. Resolve
   /mlspec-resolve <experiment>
   → Accept/reject/retry/hold based on evidence

5. Next
   /mlspec-next
   → Get recommended next action
```

## Evidence Stages

| Stage | Purpose |
|-------|---------|
| smoke | Cheap signal check — does it run? Is there signal? |
| validation | Trusted local evaluation — does it beat base? |
| final | External/production result |

## Workspace Structure

```
mlspec/
├── recipes/              # Recipe graph (replaces baselines/candidates)
│   └── <recipe-id>/
│       ├── recipe.yaml
│       └── summary.md
├── experiments/         # Active experiments
│   └── <experiment>/
│       ├── experiment.yaml
│       ├── hypothesis.md
│       ├── evidence/
│       │   ├── smoke.md
│       │   ├── validation.md
│       │   └── final.md
│       └── resolution.md
└── findings/           # Key learnings
```

## Requirements

- Node.js 20.19.0+
- AI coding tool (Claude Code, OpenCode, Cursor, Windsurf, etc.)

## License

MIT License - Copyright (c) 2024 Kopamed

## Links

- [MLSpec Issues](https://github.com/Kopamed/MLSpec/issues) - Report bugs or request features
