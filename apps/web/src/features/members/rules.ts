import { can, WORKSPACE_ROLES, type WorkspaceRole } from '@devsync/shared';
import type { Member } from '@/lib/types';

export const INVITABLE_ROLES = ['ADMIN', 'MEMBER', 'VIEWER'] as const;

export const isInvitable = (v: string): v is (typeof INVITABLE_ROLES)[number] =>
  (INVITABLE_ROLES as readonly string[]).includes(v);

export const ROLE_LABEL: Record<WorkspaceRole, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MEMBER: 'Member',
  VIEWER: 'Viewer',
};

export const isWorkspaceRole = (v: string): v is WorkspaceRole =>
  (WORKSPACE_ROLES as readonly string[]).includes(v);

const ownerCount = (members: Member[]) => members.filter((m) => m.role === 'OWNER').length;

/** Roles the actor may assign: only an OWNER can create or keep OWNER. */
export const assignableRoles = (actor: WorkspaceRole): WorkspaceRole[] =>
  actor === 'OWNER' ? [...WORKSPACE_ROLES] : WORKSPACE_ROLES.filter((r) => r !== 'OWNER');

/** Mirrors the API rules (PATCH members): owners are only changed by an OWNER, and the last OWNER is locked. */
export const canChangeRole = (actor: WorkspaceRole, target: Member, members: Member[]): boolean =>
  can(actor, 'member:set-role') &&
  (target.role !== 'OWNER' || (actor === 'OWNER' && ownerCount(members) > 1));

/** Removing someone else needs ADMIN+ (removing an OWNER needs OWNER); leaving yourself is always allowed unless you are the last OWNER. */
export const canRemoveMember = (
  actor: WorkspaceRole,
  target: Member,
  members: Member[],
  meId: string,
): boolean => {
  if (target.userId === meId) return target.role !== 'OWNER' || ownerCount(members) > 1;
  return can(actor, 'member:remove') && (target.role !== 'OWNER' || actor === 'OWNER');
};
