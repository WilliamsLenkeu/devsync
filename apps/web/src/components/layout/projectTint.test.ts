import { describe, expect, it } from 'vitest';
import { projectTint } from './projectTint';

describe('projectTint', () => {
  it('returns a stable tint for the same identifier', () => {
    expect(projectTint('WEB')).toBe(projectTint('WEB'));
  });

  it('spreads identifiers across the palette', () => {
    const ids = ['WEB', 'API', 'MOB', 'INF', 'DSG', 'QA'];
    const unique = new Set(ids.map(projectTint));
    expect(unique.size).toBeGreaterThan(1);
  });

  it('stays in the Milk Desk token family', () => {
    for (const id of ['WEB', 'API', 'MOB', 'INF', 'DSG', 'QA']) {
      expect(projectTint(id)).toMatch(
        /^(bg-primary|bg-info|bg-success|bg-warning|bg-muted-foreground)/,
      );
    }
  });
});
