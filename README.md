# MLSpec

**An evidence-driven ML experimentation framework for AI agents.**

```text
Workflow:
  explore → hypothesis → evidence → decision → candidate → archive → findings
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
| `/mlspec-explore` | Explore failure modes and ML experiment ideas |
| `/mlspec-propose-experiment` | Create an experiment with hypothesis |
| `/mlspec-run-evidence` | Run an evidence level (E1, E2, etc.) |
| `/mlspec-decide` | Write a decision from evidence (promote/reject/hold) |
| `/mlspec-promote` | Promote experiment to candidate version |
| `/mlspec-archive` | Archive a decided experiment |

## CLI Commands

```bash
mlspec status                    # Show workspace status
mlspec validate                  # Validate workspace structure
mlspec new experiment <name>    # Create new experiment
mlspec new baseline <name>      # Create baseline
mlspec new candidate <name>     # Create candidate
mlspec add-evidence <exp> --level E1   # Add evidence
mlspec decide <exp> --decision promote  # Make decision
mlspec promote <exp> --to <candidate>   # Promote to candidate
mlspec archive <exp>            # Archive experiment
mlspec update                   # Refresh skills for tools
```

## Workflow

```
1. Explore
   /mlspec-explore
   → Identify failure modes, understand the problem space

2. Hypothesis
   /mlspec-propose-experiment <name>
   → Form hypothesis: "I believe X will improve Y because Z"

3. Evidence
   /mlspec-run-evidence <experiment> --level E1
   → Run experiments, collect metrics, document results

4. Decision
   /mlspec-decide <experiment> --decision promote|reject|hold
   → Evaluate evidence against hypothesis

5. Candidate
   /mlspec-promote <experiment> --to <candidate-name>
   → Promote successful experiments to candidate versions

6. Archive
   /mlspec archive <experiment>
   → Archive completed experiments with their decisions
```

## Workspace Structure

```
mlspec/
├── baselines/           # Baseline experiments
├── experiments/         # Active experiments
│   └── <experiment>/
│       ├── hypothesis.md
│       ├── evidence/
│       │   └── E1.md
│       └── decision.md
├── candidates/          # Promoted candidates
├── findings/           # Key learnings
└── archive/           # Archived experiments
```

## Requirements

- Node.js 20.19.0+
- AI coding tool (Claude Code, OpenCode, Cursor, Windsurf, etc.)

## Documentation

- [OpenSpec Docs](https://github.com/Fission-AI/OpenSpec) - Core framework
- [Getting Started](docs/getting-started.md) - Step-by-step guide

## License

MIT
