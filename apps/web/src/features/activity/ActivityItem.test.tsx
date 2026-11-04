import { describe, expect, it } from 'vitest';
import type { Activity } from '@/lib/types';
import { describeActivity } from './ActivityItem';

const base = {
  id: 'a1',
  workspaceId: 'w1',
  projectId: 'p1',
  taskId: 't1',
  actor: { id: 'u1', name: 'Ada', avatarUrl: null },
  viaAgent: false,
  createdAt: '2026-01-01T00:00:00.000Z',
};
const make = (type: Activity['type'], data: Record<string, unknown>): Activity => ({ ...base, type, data });
const task = { taskKey: 'WEB-12', title: 'Fix login' };
const bob = { id: 'u2', name: 'Bob', avatarUrl: null };

describe('describeActivity', () => {
  it.each<[Activity, string]>([
    [make('PROJECT_CREATED', { name: 'Web', identifier: 'WEB' }), 'Ada created project Web (WEB)'],
    [make('PROJECT_UPDATED', { name: 'Web', identifier: 'WEB' }), 'Ada updated project Web'],
    [make('PROJECT_ARCHIVED', { name: 'Web', identifier: 'WEB' }), 'Ada archived project Web'],
    [make('TASK_CREATED', task), 'Ada created WEB-12 Fix login'],
    [
      make('TASK_UPDATED', { ...task, changes: { priority: { from: 'LOW', to: 'HIGH' }, title: { from: 'a', to: 'b' } } }),
      'Ada updated WEB-12 Fix login (priority, title)',
    ],
    [make('TASK_UPDATED', { ...task, changes: {} }), 'Ada updated WEB-12 Fix login'],
    [
      make('TASK_STATUS_CHANGED', { ...task, from: 'TODO', to: 'IN_PROGRESS' }),
      'Ada moved WEB-12 Fix login from Todo to In Progress',
    ],
    [make('TASK_ASSIGNED', { ...task, assignee: bob }), 'Ada assigned WEB-12 Fix login to Bob'],
    [make('TASK_ASSIGNED', { ...task, assignee: null }), 'Ada unassigned WEB-12 Fix login'],
    [make('TASK_DELETED', task), 'Ada deleted WEB-12 Fix login'],
    [
      make('COMMENT_CREATED', { ...task, commentId: 'c1', excerpt: 'ok' }),
      'Ada commented on WEB-12 Fix login',
    ],
    [make('MEMBER_JOINED', { user: bob, role: 'MEMBER' }), 'Bob joined the workspace as Member'],
    [make('MEMBER_REMOVED', { user: bob }), 'Ada removed Bob from the workspace'],
    [
      make('MEMBER_ROLE_CHANGED', { user: bob, from: 'MEMBER', to: 'ADMIN' }),
      "Ada changed Bob's role from Member to Admin",
    ],
  ])('describes %# activity', (activity, expected) => {
    expect(describeActivity(activity)).toBe(expected);
  });

  it('falls back to "Someone" without actor', () => {
    expect(describeActivity({ ...make('TASK_DELETED', task), actor: null })).toBe('Someone deleted WEB-12 Fix login');
  });
});
