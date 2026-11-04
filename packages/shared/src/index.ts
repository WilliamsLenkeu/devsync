import { z } from 'zod';

export const WORKSPACE_ROLES = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'] as const;
export const TASK_STATUSES = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'] as const;
export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export const PROJECT_STATUSES = ['ACTIVE', 'ARCHIVED'] as const;

export const workspaceRoleSchema = z.enum(WORKSPACE_ROLES);
export const taskStatusSchema = z.enum(TASK_STATUSES);
export const taskPrioritySchema = z.enum(TASK_PRIORITIES);
export const projectStatusSchema = z.enum(PROJECT_STATUSES);

export type WorkspaceRole = z.infer<typeof workspaceRoleSchema>;
export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type TaskPriority = z.infer<typeof taskPrioritySchema>;
export type ProjectStatus = z.infer<typeof projectStatusSchema>;

/** Higher number = more privileges. */
const ROLE_RANK: Record<WorkspaceRole, number> = { VIEWER: 0, MEMBER: 1, ADMIN: 2, OWNER: 3 };

export const hasRole = (actual: WorkspaceRole, atLeast: WorkspaceRole): boolean =>
  ROLE_RANK[actual] >= ROLE_RANK[atLeast];

/** Minimum workspace role required for each action. Single source of truth for API and UI. */
export const ACTION_MIN_ROLE = {
  'workspace:read': 'VIEWER',
  'workspace:update': 'ADMIN',
  'workspace:delete': 'OWNER',
  'member:invite': 'ADMIN',
  'member:remove': 'ADMIN',
  'member:set-role': 'ADMIN',
  'project:read': 'VIEWER',
  'project:create': 'MEMBER',
  'project:update': 'ADMIN',
  'task:read': 'VIEWER',
  'task:write': 'MEMBER',
  'comment:write': 'MEMBER',
  'activity:read': 'VIEWER',
  'token:manage': 'MEMBER',
} as const satisfies Record<string, WorkspaceRole>;

export type Action = keyof typeof ACTION_MIN_ROLE;

export const can = (role: WorkspaceRole, action: Action): boolean =>
  hasRole(role, ACTION_MIN_ROLE[action]);

/** Scopes grantable to an API token. Effective rights = scope AND the owner's workspace role. */
export const API_TOKEN_SCOPES = [
  'workspaces:read',
  'projects:read',
  'tasks:read',
  'tasks:write',
  'comments:write',
  'activity:read',
] as const;
export const apiTokenScopeSchema = z.enum(API_TOKEN_SCOPES);
export type ApiTokenScope = z.infer<typeof apiTokenScopeSchema>;

/** Scope an API token needs for an action. Actions absent here are never available to tokens. */
export const ACTION_SCOPE: Partial<Record<Action, ApiTokenScope>> = {
  'workspace:read': 'workspaces:read',
  'project:read': 'projects:read',
  'task:read': 'tasks:read',
  'task:write': 'tasks:write',
  'comment:write': 'comments:write',
  'activity:read': 'activity:read',
};
