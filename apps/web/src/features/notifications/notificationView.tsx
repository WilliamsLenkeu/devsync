import type { AppNotification, UserRef } from '@/lib/types';
import { humanize } from '@/lib/format';

type Data = Record<string, unknown>;

const str = (d: Data, key: string): string => {
  const v = d[key];
  return typeof v === 'string' ? v : '';
};
const user = (d: Data, key: string): string => (d[key] as UserRef | undefined)?.name ?? 'Someone';

/** Where a notification leads. Task notifications open the task on its project board. */
export function notificationPath(n: AppNotification): string {
  if (n.type === 'WORKSPACE_INVITATION') return '/app';
  const projectId = str(n.data, 'projectId');
  const taskId = str(n.data, 'taskId');
  if (!projectId) return `/w/${n.workspaceId}`;
  return `/w/${n.workspaceId}/projects/${projectId}/board?task=${taskId}`;
}

/** Human-readable sentence for a notification, e.g. "Ada assigned you WEB-12 — Fix login". */
export function NotificationText({ n }: { n: AppNotification }) {
  const d = n.data;
  const task = [str(d, 'taskKey'), str(d, 'title')].filter(Boolean).join(' — ');
  switch (n.type) {
    case 'TASK_ASSIGNED':
      return (
        <>
          <strong className="font-medium">{user(d, 'actor')}</strong> assigned you {task}
        </>
      );
    case 'COMMENT_MENTION':
      return (
        <>
          <strong className="font-medium">{user(d, 'actor')}</strong> mentioned you in {task}
        </>
      );
    case 'TASK_UPDATED': {
      const to = str(d, 'to');
      return (
        <>
          <strong className="font-medium">{user(d, 'actor')}</strong> moved {task} to {to ? humanize(to) : 'a new status'}
        </>
      );
    }
    case 'WORKSPACE_INVITATION':
      return (
        <>
          <strong className="font-medium">{user(d, 'invitedBy')}</strong> invited you to{' '}
          <strong className="font-medium">{str(d, 'workspaceName')}</strong> as {humanize(str(d, 'role'))}
        </>
      );
  }
}
