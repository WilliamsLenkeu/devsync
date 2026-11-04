import type { TaskStatus } from '@devsync/shared';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/UserAvatar';
import { humanize, timeAgo } from '@/lib/format';
import type { Activity, UserRef } from '@/lib/types';

const STATUS_LABEL: Record<TaskStatus, string> = {
  BACKLOG: 'Backlog',
  TODO: 'Todo',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
};

type Data = Record<string, unknown>;

const asRecord = (v: unknown): Data => (typeof v === 'object' && v !== null ? (v as Data) : {});
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const isUser = (v: unknown): v is UserRef =>
  typeof v === 'object' && v !== null && 'name' in v && typeof v.name === 'string';
const userName = (v: unknown) => (isUser(v) ? v.name : 'Someone');
const statusLabel = (v: unknown) =>
  typeof v === 'string' && Object.hasOwn(STATUS_LABEL, v) ? STATUS_LABEL[v as TaskStatus] : str(v);

/** One readable sentence per activity type, built from the `data` snapshot (docs/api-contract.md). */
export function describeActivity(activity: Activity): string {
  const d = activity.data;
  const who = activity.actor?.name ?? 'Someone';
  const task = `${str(d.taskKey)} ${str(d.title)}`.trim();

  switch (activity.type) {
    case 'PROJECT_CREATED':
      return `${who} created project ${str(d.name)} (${str(d.identifier)})`;
    case 'PROJECT_UPDATED':
      return `${who} updated project ${str(d.name)}`;
    case 'PROJECT_ARCHIVED':
      return `${who} archived project ${str(d.name)}`;
    case 'TASK_CREATED':
      return `${who} created ${task}`;
    case 'TASK_UPDATED': {
      const fields = Object.keys(asRecord(d.changes)).map(humanize).join(', ');
      return `${who} updated ${task}${fields ? ` (${fields})` : ''}`;
    }
    case 'TASK_STATUS_CHANGED':
      return `${who} moved ${task} from ${statusLabel(d.from)} to ${statusLabel(d.to)}`;
    case 'TASK_ASSIGNED':
      return isUser(d.assignee) ? `${who} assigned ${task} to ${d.assignee.name}` : `${who} unassigned ${task}`;
    case 'TASK_DELETED':
      return `${who} deleted ${task}`;
    case 'COMMENT_CREATED':
      return `${who} commented on ${task}`;
    case 'MEMBER_JOINED':
      return `${userName(d.user)} joined the workspace as ${humanize(str(d.role))}`;
    case 'MEMBER_REMOVED':
      return `${who} removed ${userName(d.user)} from the workspace`;
    case 'MEMBER_ROLE_CHANGED':
      return `${who} changed ${userName(d.user)}'s role from ${humanize(str(d.from))} to ${humanize(str(d.to))}`;
  }
}

export function ActivityItem({ activity }: { activity: Activity }) {
  const text = describeActivity(activity);
  const key = str(activity.data.taskKey);
  const keyAt = key ? text.indexOf(key) : -1;
  const link =
    activity.taskId && activity.projectId
      ? `/w/${activity.workspaceId}/projects/${activity.projectId}/board?task=${activity.taskId}`
      : null;

  return (
    <li className="flex items-start gap-3 py-3">
      {activity.actor ? (
        <UserAvatar user={activity.actor} className="mt-0.5 size-7" />
      ) : (
        <span className="mt-0.5 block size-7 shrink-0 rounded-full bg-muted" aria-hidden />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm text-pretty">
          {link && keyAt >= 0 ? (
            <>
              {text.slice(0, keyAt)}
              <Link to={link} className="font-medium text-primary underline-offset-4 hover:underline">
                {key}
              </Link>
              {text.slice(keyAt + key.length)}
            </>
          ) : (
            text
          )}
        </p>
        <time dateTime={activity.createdAt} className="mt-0.5 block text-xs text-muted-foreground">
          {timeAgo(activity.createdAt)}
        </time>
      </div>
      {activity.viaAgent && <Badge variant="secondary">Agent</Badge>}
    </li>
  );
}
