# MLSpec Init

## ADDED Requirements

### Requirement: Init command
The `mlspec init` command SHALL create an empty `mlspec/` directory if it does not exist.

### Requirement: Does not overwrite existing directory
If `mlspec/` already exists, `mlspec init` SHALL NOT modify or delete any existing content.

### Requirement: Does not create AGENTS.md
The `mlspec init` command SHALL NOT create an AGENTS.md file.

### Requirement: Silent on success
On successful initialization, `mlspec init` SHALL output nothing to stdout.

### Requirement: Error on file conflict
If a file named `mlspec` exists (not a directory), `mlspec init` SHALL error with a message.

#### Scenario: Directory does not exist
- **WHEN** user runs `mlspec init` and `mlspec/` does not exist
- **THEN** create empty `mlspec/` directory and exit silently

#### Scenario: Directory already exists
- **WHEN** user runs `mlspec init` and `mlspec/` already exists
- **THEN** exit silently without modifying anything

#### Scenario: File named mlspec exists
- **WHEN** user runs `mlspec init` and a file named `mlspec` exists
- **THEN** error with message "Cannot create mlspec/: a file with that name already exists"
