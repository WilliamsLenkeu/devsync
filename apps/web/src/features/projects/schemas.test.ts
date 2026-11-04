import { describe, expect, it } from 'vitest';
import { projectFormSchema, suggestIdentifier } from './schemas';

const form = (identifier: string) => ({ name: 'Web', identifier, description: '' });

describe('suggestIdentifier', () => {
  it('uses the initials of multi-word names', () => {
    expect(suggestIdentifier('Dev Sync Web')).toBe('DSW');
  });

  it('uses the first letters of a single word, capped at 6', () => {
    expect(suggestIdentifier('frontend')).toBe('FRONTE');
  });
});

describe('projectFormSchema identifier', () => {
  it.each(['WEB', 'A1', 'DEVSYN'])('accepts %s', (identifier) => {
    expect(projectFormSchema.safeParse(form(identifier)).success).toBe(true);
  });

  it.each(['W', 'web', '1WEB', 'WEB-1', 'TOOLONG7'])('rejects %s', (identifier) => {
    expect(projectFormSchema.safeParse(form(identifier)).success).toBe(false);
  });
});
