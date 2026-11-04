import type { QueryKey } from '@tanstack/react-query';
import { qk } from '@/lib/queryKeys';

/** `{type:"event", event}` payload (docs/api-contract.md, « Temps réel »). */
export interface DomainEvent {
  id: string;
  type: string;
  workspaceId: string;
  projectId?: string;
  actorId?: string;
  data: Record<string, unknown>;
  at: string;
}

const asRecord = (v: unknown): Record<string, unknown> =>
  typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {};
const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);

/** Query keys to invalidate for an event. Pure: the provider applies them. */
export function invalidationKeys(event: DomainEvent): QueryKey[] {
  const wid = event.workspaceId;
  const data = event.data;
  const task = asRecord(data.task);
  const keys: QueryKey[] = [];

  switch (event.type) {
    case 'task.created':
    case 'task.updated':
    case 'task.assigned':
    case 'task.status_changed':
    case 'task.deleted': {
      const projectId = event.projectId ?? str(task.projectId) ?? str(data.projectId);
      const taskId = str(task.id) ?? str(data.taskId);
      keys.push(qk.dashboard(wid), qk.activity(wid));
      if (projectId) keys.push(qk.tasks(projectId), qk.projectActivity(projectId));
      if (taskId) keys.push(qk.task(taskId));
      break;
    }
    case 'comment.created': {
      const taskId = str(data.taskId) ?? str(asRecord(data.comment).taskId);
      keys.push(qk.activity(wid));
      if (taskId) keys.push(qk.comments(taskId), qk.task(taskId));
      break;
    }
    case 'project.created':
    case 'project.updated': {
      const projectId = str(asRecord(data.project).id) ?? event.projectId;
      keys.push(qk.projects(wid), qk.activity(wid));
      if (projectId) keys.push(qk.project(projectId));
      break;
    }
    case 'member.joined':
      keys.push(qk.workspaceInvitations(wid));
    // falls through
    case 'member.removed':
    case 'member.role_changed':
      keys.push(qk.members(wid), qk.workspace(wid), qk.workspaces, qk.activity(wid));
      break;
    case 'notification.created':
      keys.push(qk.notifications, qk.unreadCount);
      break;
  }
  return keys;
}

/** Toast text for the notifications worth interrupting for; null otherwise. */
export function notificationToast(event: DomainEvent): string | null {
  if (event.type !== 'notification.created') return null;
  const payload = asRecord(event.data.data);
  const actor = str(asRecord(payload.actor).name) ?? 'Someone';
  const taskKey = str(payload.taskKey) ?? 'a task';
  switch (event.data.type) {
    case 'TASK_ASSIGNED':
      return `${actor} assigned you ${taskKey}`;
    case 'COMMENT_MENTION':
      return `${actor} mentioned you in ${taskKey}`;
    default:
      return null;
  }
}

/** True when someone else removed `userId` from the workspace. Self-leave is handled by the members page. */
export const isRemovalOf = (event: DomainEvent, userId: string): boolean =>
  event.type === 'member.removed' && event.data.userId === userId && event.actorId !== userId;
