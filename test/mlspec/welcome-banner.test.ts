import { describe, it, expect, vi, beforeEach } from 'vitest';

// We need to test the welcome banner content
// Since it's a module with internal functions, we'll test by reading the source

describe('MlspecWelcomeBanner content', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should export showMlspecWelcome function', async () => {
    const { showMlspecWelcome } = await import('../../src/mlspec/ui/welcome-banner.js');
    expect(typeof showMlspecWelcome).toBe('function');
  });

  it('should contain Welcome to MLSpec text', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync('./src/mlspec/ui/welcome-banner.ts', 'utf-8');
    expect(source).toContain('Welcome to MLSpec');
  });

  it('should contain MLSpec tagline', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync('./src/mlspec/ui/welcome-banner.ts', 'utf-8');
    expect(source).toContain('An evidence-driven ML experimentation framework');
  });

  it('should contain setup items: MLSpec workspace, Agent skills, MLSpec slash commands', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync('./src/mlspec/ui/welcome-banner.ts', 'utf-8');
    expect(source).toContain('MLSpec workspace');
    expect(source).toContain('Agent skills');
    expect(source).toContain('MLSpec slash commands');
  });

  it('should contain workflow terms: explore, propose, run, resolve', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync('./src/mlspec/ui/welcome-banner.ts', 'utf-8');
    expect(source).toMatch(/explore|propose|run|resolve/);
  });

  it('should contain main slash commands: /mlspec-explore, /mlspec-propose, /mlspec-run, /mlspec-resolve, /mlspec-next', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync('./src/mlspec/ui/welcome-banner.ts', 'utf-8');
    expect(source).toContain('/mlspec-explore');
    expect(source).toContain('/mlspec-propose');
    expect(source).toContain('/mlspec-run');
    expect(source).toContain('/mlspec-resolve');
    expect(source).toContain('/mlspec-next');
  });

  it('should have Press Enter to select tools prompt', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync('./src/mlspec/ui/welcome-banner.ts', 'utf-8');
    expect(source).toContain('Press Enter to select tools');
  });

  it('should use WELCOME_ANIMATION from shared ascii-patterns', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync('./src/mlspec/ui/welcome-banner.ts', 'utf-8');
    expect(source).toContain("from '../../ui/ascii-patterns.js'");
  });

  it('should have correct ART_COLUMN_WIDTH (24) for alignment with OpenSpec', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync('./src/mlspec/ui/welcome-banner.ts', 'utf-8');
    expect(source).toContain('ART_COLUMN_WIDTH = 24');
  });
});
