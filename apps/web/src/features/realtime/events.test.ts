import { describe, expect, it } from 'vitest';
import { qk } from '@/lib/queryKeys';
import { invalidationKeys, isRemovalOf, notificationToast, type DomainEvent } from './events';

const ev = (type: string, data: Record<string, unknown>, extra: Partial<DomainEvent> = {}): DomainEvent => ({
  id: 'e',
  type,
  workspaceId: 'w1',
  data,
  at: '2026-01-01T00:00:00.000Z',
  ...extra,
});

describe('invalidationKeys', () => {
  it('invalidates task lists, the task, dashboard and activity for task events', () => {
    const keys = invalidationKeys(
      ev('task.updated', { task: { id: 't1', projectId: 'p1' } }, { projectId: 'p1' }),
    );
    expect(keys).toEqual(
      expect.arrayContaining([
        qk.tasks('p1'),
        qk.task('t1'),
        qk.dashboard('w1'),
        qk.activity('w1'),
        qk.projectActivity('p1'),
      ]),
    );
  });

  it('reads the task id from data.taskId on deletion', () => {
    const keys = invalidationKeys(ev('task.deleted', { taskId: 't9', projectId: 'p2' }));
    expect(keys).toContainEqual(qk.task('t9'));
    expect(keys).toContainEqual(qk.tasks('p2'));
  });

  it('invalidates comments and the task on comment.created', () => {
    const keys = invalidationKeys(ev('comment.created', { taskId: 't1', comment: { id: 'c' } }));
    expect(keys).toEqual(expect.arrayContaining([qk.comments('t1'), qk.task('t1')]));
  });

  it('invalidates project list and project on project events', () => {
    const keys = invalidationKeys(ev('project.updated', { project: { id: 'p1' } }));
    expect(keys).toEqual(expect.arrayContaining([qk.projects('w1'), qk.project('p1')]));
  });

  it('invalidates member data and the workspace on member events', () => {
    for (const type of ['member.joined', 'member.removed', 'member.role_changed']) {
      expect(invalidationKeys(ev(type, {}))).toEqual(
        expect.arrayContaining([qk.members('w1'), qk.workspace('w1'), qk.workspaces]),
      );
    }
    expect(invalidationKeys(ev('member.joined', {}))).toContainEqual(qk.workspaceInvitations('w1'));
  });

  it('invalidates notifications and unread count on notification.created', () => {
    expect(invalidationKeys(ev('notification.created', {}))).toEqual([qk.notifications, qk.unreadCount]);
  });

  it('invalidates nothing for presence.changed', () => {
    expect(invalidationKeys(ev('presence.changed', { userIds: ['u1'] }))).toEqual([]);
  });
});

describe('notificationToast', () => {
  const notif = (type: string, payload: Record<string, unknown>) =>
    ev('notification.created', { id: 'n1', type, data: payload, createdAt: '2026-01-01T00:00:00.000Z' });

  it('announces assignments and mentions', () => {
    const actor = { id: 'u2', name: 'Ada', avatarUrl: null };
    expect(notificationToast(notif('TASK_ASSIGNED', { taskKey: 'WEB-1', actor }))).toBe('Ada assigned you WEB-1');
    expect(notificationToast(notif('COMMENT_MENTION', { taskKey: 'WEB-1', actor }))).toBe(
      'Ada mentioned you in WEB-1',
    );
  });

  it('stays silent for other notification types and other events', () => {
    expect(notificationToast(notif('TASK_UPDATED', { taskKey: 'WEB-1' }))).toBeNull();
    expect(notificationToast(ev('task.created', {}))).toBeNull();
  });
});

describe('isRemovalOf', () => {
  const removed = (actorId?: string) => ev('member.removed', { userId: 'me' }, { actorId });

  it('is true when someone else removed me', () => {
    expect(isRemovalOf(removed('admin'), 'me')).toBe(true);
  });

  it('is false for my own leave, or for a removal of another user', () => {
    expect(isRemovalOf(removed('me'), 'me')).toBe(false);
    expect(isRemovalOf(removed('admin'), 'someone-else')).toBe(false);
  });
});
