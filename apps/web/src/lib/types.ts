import type { ApiTokenScope, ProjectStatus, TaskPriority, TaskStatus, WorkspaceRole } from '@devsync/shared';

/** DTOs mirroring docs/api-contract.md. Dates are ISO strings on the wire. */
export interface UserRef {
  id: string;
  name: string;
  avatarUrl: string | null;
}
export interface User extends UserRef {
  email: string;
  createdAt: string;
}
export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  role: WorkspaceRole;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}
export interface Member {
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
  user: { id: string; name: string; email: string; avatarUrl: string | null };
}
export interface ProjectMember {
  userId: string;
  createdAt: string;
  user: { id: string; name: string; email: string; avatarUrl: string | null };
}
export interface Invitation {
  id: string;
  workspaceId: string;
  workspaceName: string;
  email: string;
  role: WorkspaceRole;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REVOKED';
  invitedBy: UserRef;
  expiresAt: string;
  createdAt: string;
}
export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  identifier: string;
  status: ProjectStatus;
  taskCounts: { total: number; done: number };
  createdAt: string;
  updatedAt: string;
}
export interface TaskLabel {
  id: string;
  name: string;
  color: string;
}
export interface Task {
  id: string;
  projectId: string;
  number: number;
  key: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  position: number;
  dueDate: string | null;
  assignee: UserRef | null;
  reporter: UserRef;
  labels: TaskLabel[];
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}
export interface Comment {
  id: string;
  taskId: string;
  body: string;
  author: UserRef;
  createdAt: string;
  updatedAt: string;
}
export interface Activity {
  id: string;
  type:
    | 'PROJECT_CREATED'
    | 'PROJECT_UPDATED'
    | 'PROJECT_ARCHIVED'
    | 'TASK_CREATED'
    | 'TASK_UPDATED'
    | 'TASK_STATUS_CHANGED'
    | 'TASK_ASSIGNED'
    | 'TASK_DELETED'
    | 'COMMENT_CREATED'
    | 'MEMBER_JOINED'
    | 'MEMBER_REMOVED'
    | 'MEMBER_ROLE_CHANGED';
  workspaceId: string;
  projectId: string | null;
  taskId: string | null;
  actor: UserRef | null;
  viaAgent: boolean;
  data: Record<string, unknown>;
  createdAt: string;
}
export interface AppNotification {
  id: string;
  type: 'TASK_ASSIGNED' | 'COMMENT_MENTION' | 'WORKSPACE_INVITATION' | 'TASK_UPDATED';
  workspaceId: string;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}
export interface ApiToken {
  id: string;
  workspaceId: string;
  name: string;
  prefix: string;
  scopes: ApiTokenScope[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}
export interface Dashboard {
  totals: { total: number; completed: number; inProgress: number; overdue: number };
  assignedToMe: { count: number; tasks: Task[] };
  projectProgress: { projectId: string; name: string; identifier: string; total: number; done: number }[];
  recentActivity: Activity[];
}
export interface Page<T> {
  data: T[];
  nextCursor: string | null;
}
