import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { AppNotification } from '@/lib/types';
import { NotificationText, notificationPath } from './notificationView';

const base = { id: 'n1', workspaceId: 'ws1', readAt: null, createdAt: '2026-11-01T10:00:00Z' };
const actor = { id: 'u2', name: 'Ada', avatarUrl: null };
const task = { taskId: 't1', taskKey: 'WEB-12', title: 'Fix login', projectId: 'p1' };

describe('notificationPath', () => {
  it('opens the task on its project board', () => {
    const n = { ...base, type: 'TASK_ASSIGNED', data: { ...task, actor } } as AppNotification;
    expect(notificationPath(n)).toBe('/w/ws1/projects/p1/board?task=t1');
  });

  it('sends workspace invitations to the workspace selector', () => {
    const n = { ...base, type: 'WORKSPACE_INVITATION', data: {} } as AppNotification;
    expect(notificationPath(n)).toBe('/app');
  });
});

describe('NotificationText', () => {
  it('writes the actor and task in one readable sentence', () => {
    const n = { ...base, type: 'TASK_ASSIGNED', data: { ...task, actor } } as AppNotification;
    const { container } = render(<NotificationText n={n} />);
    expect(container.textContent).toBe('Ada assigned you WEB-12 — Fix login');
  });

  it('humanizes the new status of a task update', () => {
    const n = { ...base, type: 'TASK_UPDATED', data: { ...task, actor, from: 'TODO', to: 'IN_PROGRESS' } } as AppNotification;
    const { container } = render(<NotificationText n={n} />);
    expect(container.textContent).toBe('Ada moved WEB-12 — Fix login to In progress');
  });
});
