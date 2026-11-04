import { describe, expect, it } from 'vitest';
import { can, hasRole } from './index';

describe('roles', () => {
  it('orders roles', () => {
    expect(hasRole('OWNER', 'ADMIN')).toBe(true);
    expect(hasRole('VIEWER', 'MEMBER')).toBe(false);
  });

  it('enforces action policy', () => {
    expect(can('VIEWER', 'task:read')).toBe(true);
    expect(can('VIEWER', 'task:write')).toBe(false);
    expect(can('MEMBER', 'member:invite')).toBe(false);
    expect(can('ADMIN', 'member:invite')).toBe(true);
    expect(can('ADMIN', 'workspace:delete')).toBe(false);
  });
});
