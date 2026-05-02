# mlspec-skill-layer-quality Tasks

## Implementation

### 1. Fix mlspec-resolve author metadata

- [x] 1.1 Edit `src/core/templates/workflows/mlspec-resolve.ts` line 155
- [x] 1.2 Change `metadata: { author: 'openspec', version: '2.0' }` to `metadata: { author: 'mlspec', version: '2.0' }`
- [x] 1.3 Verify: Build and check `.opencode/skills/mlspec-resolve/SKILL.md` has `author: mlspec`

### 2. Update mlspec-explore skill template

- [x] 2.1 Add `**Pause if:` section with conditions from spec 4.2
- [x] 2.2 Add success output format for workspace with recipes
- [x] 2.3 Add blocked output format for user requests modification
- [x] 2.4 Verify: Build and inspect generated skill

### 3. Update mlspec-propose skill template

- [x] 3.1 Add `**Pause if:` section with conditions from spec 4.2
- [x] 3.2 Add success output format
- [x] 3.3 Add blocked output format for ambiguous context
- [x] 3.4 Verify: Build and inspect generated skill

### 4. Update mlspec-run skill template

- [x] 4.1 Add `**Pause if:` section with conditions from spec 4.2
- [x] 4.2 Fix evidence handling section per spec 4.4 (check before recording, handle exists case)
- [x] 4.3 Add success output format
- [x] 4.4 Add blocked output format for evidence exists
- [x] 4.5 Verify: Build and inspect generated skill

### 5. Update mlspec-resolve skill template

- [x] 5.1 Add `**Pause if:` section with conditions from spec 4.2
- [x] 5.2 Add pre-flight checks per spec 4.5 (status check, evidence exists, conflict detection)
- [x] 5.3 Add success output format
- [x] 5.4 Add blocked output format for already resolved
- [x] 5.5 Add blocked output format for evidence conflict
- [x] 5.6 Verify: Build and inspect generated skill

### 6. Update mlspec-next skill template

- [x] 6.1 Add CLI-first routing per spec 4.6
- [x] 6.2 Add `**Pause if:` section (none - read-only, but document that it never pauses)
- [x] 6.3 Add success output format
- [x] 6.4 Verify: Build and inspect generated skill

### 7. Update MLSpec command templates

For each skill that has a corresponding command file (`mlspec-explore.md`, `mlspec-propose.md`, `mlspec-run.md`, `mlspec-resolve.md`, `mlspec-next.md`):

- [x] 7.1 Add pause conditions where relevant to command content
- [x] 7.2 Add blocked state handling where relevant
- [x] 7.3 Fix any misleading references (especially mlspec-run evidence handling)
- [x] 7.4 Verify: Build and check `.opencode/commands/` files

### 8. Verification

- [x] 8.1 Run `npm run build`
- [x] 8.2 Initialize test workspace: `mkdir -p /tmp/test-skill-quality && cd /tmp/test-skill-quality && node ~/data/OpenSpec/bin/mlspec.js init --tools opencode`
- [x] 8.3 Inspect all generated `.opencode/skills/*/SKILL.md` files
- [x] 8.4 Inspect all generated `.opencode/commands/*.md` files
- [x] 8.5 Verify mlspec-resolve has `author: mlspec`
- [x] 8.6 Verify all skills have pause conditions
- [x] 8.7 Verify all skills have output formats for success/blocked states
- [x] 8.8 Run `npm test` to ensure no regressions (1490 tests passed)

## Completion

- All verification checks pass
- No new files created (template updates only)
- No CLI behavior changes
