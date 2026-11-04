import { describe, expect, it } from 'vitest';
import type { WorkspaceRole } from '@devsync/shared';
import type { Member } from '@/lib/types';
import { assignableRoles, canChangeRole, canRemoveMember } from './rules';

const m = (userId: string, role: WorkspaceRole): Member => ({
  userId,
  role,
  joinedAt: '2026-01-01T00:00:00.000Z',
  user: { id: userId, name: userId, email: `${userId}@x.io`, avatarUrl: null },
});

const owner = m('o', 'OWNER');
const admin = m('a', 'ADMIN');
const member = m('m', 'MEMBER');
const solo = [owner, admin, member];
const twoOwners = [owner, m('o2', 'OWNER'), admin, member];

describe('members rules', () => {
  it('only an OWNER can assign OWNER', () => {
    expect(assignableRoles('OWNER')).toContain('OWNER');
    expect(assignableRoles('ADMIN')).not.toContain('OWNER');
  });

  it('ADMIN can change a MEMBER role but not an OWNER', () => {
    expect(canChangeRole('ADMIN', member, solo)).toBe(true);
    expect(canChangeRole('ADMIN', owner, twoOwners)).toBe(false);
  });

  it('the last OWNER role is locked, even for an OWNER', () => {
    expect(canChangeRole('OWNER', owner, solo)).toBe(false);
    expect(canChangeRole('OWNER', owner, twoOwners)).toBe(true);
  });

  it('MEMBER and VIEWER cannot remove others, but can leave', () => {
    expect(canRemoveMember('MEMBER', admin, solo, 'm')).toBe(false);
    expect(canRemoveMember('MEMBER', member, solo, 'm')).toBe(true);
  });

  it('the last OWNER cannot leave', () => {
    expect(canRemoveMember('OWNER', owner, solo, 'o')).toBe(false);
    expect(canRemoveMember('OWNER', owner, twoOwners, 'o')).toBe(true);
  });
});
