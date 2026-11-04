import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { App } from '../src/app';
import { normalizeLabels, placeBetween, rebalanceColumn } from '../src/modules/tasks/service';
import { api, buildTestApp, registerUser, type TestUser } from './helpers';

let app: App;
beforeAll(async () => {
  app = await buildTestApp();
});
afterAll(() => app.close());

const setup = async () => {
  const owner = await registerUser(app);
  const admin = await registerUser(app);
  const member = await registerUser(app);
  const viewer = await registerUser(app);
  const stranger = await registerUser(app);
  const outsider = await registerUser(app);
  const ws = await app.db.workspace.create({
    data: {
      name: 'Acme',
      slug: `acme-${randomUUID()}`,
      members: {
        create: [
          { userId: owner.id, role: 'OWNER' },
          { userId: admin.id, role: 'ADMIN' },
          { userId: member.id, role: 'MEMBER' },
          { userId: viewer.id, role: 'VIEWER' },
          { userId: stranger.id, role: 'MEMBER' },
        ],
      },
    },
  });
  const project = await app.db.project.create({
    data: {
      workspaceId: ws.id,
      name: 'Web',
      identifier: 'WEB',
      createdById: owner.id,
      members: { create: [owner, member, viewer].map((u) => ({ userId: u.id })) },
    },
  });
  return { owner, admin, member, viewer, stranger, outsider, project };
};
type Setup = Awaited<ReturnType<typeof setup>>;

const create = async (user: TestUser, projectId: string, payload: object = {}) => {
  const res = await api(app, user, 'POST', `/api/projects/${projectId}/tasks`, {
    title: 'Task',
    ...payload,
  });
  if (res.statusCode !== 201) throw new Error(`create failed: ${res.body}`);
  return res.json().data;
};
const patch = (user: TestUser, taskId: string, payload: object) =>
  api(app, user, 'PATCH', `/api/tasks/${taskId}`, payload);
const move = (user: TestUser, taskId: string, status: string, beforeTaskId?: string | null) =>
  api(app, user, 'POST', `/api/tasks/${taskId}/move`, {
    status,
    beforeTaskId: beforeTaskId ?? null,
  });
const column = async (s: Setup, status: string) =>
  (await api(app, s.owner, 'GET', `/api/projects/${s.project.id}/tasks?status=${status}`)).json()
    .data as { id: string; title: string; position: number }[];

describe('position helpers', () => {
  it('places between neighbours, at the edges, and asks for a rebalance when the gap is exhausted', () => {
    expect(placeBetween(undefined, undefined)).toBe(1024);
    expect(placeBetween(1024, undefined)).toBe(2048);
    expect(placeBetween(undefined, 1024)).toBe(0);
    expect(placeBetween(1024, 2048)).toBe(1536);
    expect(placeBetween(1024, 1024 + 1e-7)).toBeNull();
    expect(rebalanceColumn(['a', 'b'])).toEqual([
      { id: 'a', position: 1024 },
      { id: 'b', position: 2048 },
    ]);
    // Repeated insertion right after the same anchor reaches a rebalance within ~40 steps.
    const prev = 1024;
    let next = 2048;
    let steps = 0;
    for (let p = placeBetween(prev, next); p !== null; p = placeBetween(prev, next)) {
      next = p;
      steps++;
    }
    expect(steps).toBeLessThan(40);
  });

  it('normalises labels: trimmed, case-insensitive unique, default colour', () => {
    expect(
      normalizeLabels([{ name: ' Bug ' }, { name: 'bug', color: '#000000' }, { name: 'UI' }]),
    ).toEqual([
      { name: 'Bug', color: '#6366f1' },
      { name: 'UI', color: '#6366f1' },
    ]);
  });
});

describe('tasks', () => {
  it('creates, updates and deletes a task with activity, notifications and events', async () => {
    const s = await setup();
    const seen: string[] = [];
    const off = app.events.subscribe((e) => seen.push(e.type));

    const created = await api(app, s.owner, 'POST', `/api/projects/${s.project.id}/tasks`, {
      title: 'Login bug',
      assigneeId: s.member.id,
      dueDate: '2030-01-01T00:00:00.000Z',
      labels: [{ name: ' Auth ' }, { name: 'auth' }, { name: 'ui', color: '#ff0000' }],
    });
    expect(created.statusCode).toBe(201);
    const task = created.json().data;
    expect(task).toMatchObject({
      key: 'WEB-1',
      status: 'BACKLOG',
      priority: 'MEDIUM',
      reporter: { id: s.owner.id },
      assignee: { id: s.member.id },
      commentCount: 0,
    });
    expect(task.labels.map((l: { name: string }) => l.name)).toEqual(['Auth', 'ui']);
    expect(seen).toEqual(expect.arrayContaining(['task.created', 'task.assigned']));
    expect(
      await app.db.notification.count({ where: { userId: s.member.id, type: 'TASK_ASSIGNED' } }),
    ).toBe(1);
    expect(await app.db.notification.count({ where: { userId: s.owner.id } })).toBe(0);

    const updated = await patch(s.member, task.id, {
      priority: 'URGENT',
      labels: [{ name: 'ui' }],
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().data).toMatchObject({
      priority: 'URGENT',
      labels: [{ name: 'ui', color: '#6366f1' }],
    });
    const [updateAct] = await app.db.activity.findMany({
      where: { taskId: task.id, type: 'TASK_UPDATED' },
    });
    expect(updateAct?.data).toMatchObject({
      changes: {
        priority: { from: 'MEDIUM', to: 'URGENT' },
        labels: { from: ['Auth', 'ui'], to: ['ui'] },
      },
    });

    expect((await api(app, s.viewer, 'DELETE', `/api/tasks/${task.id}`)).statusCode).toBe(403);
    expect((await api(app, s.outsider, 'GET', `/api/tasks/${task.id}`)).statusCode).toBe(404);
    expect((await api(app, s.stranger, 'DELETE', `/api/tasks/${task.id}`)).statusCode).toBe(403);
    expect((await api(app, s.member, 'DELETE', `/api/tasks/${task.id}`)).statusCode).toBe(204);
    expect((await api(app, s.member, 'GET', `/api/tasks/${task.id}`)).statusCode).toBe(404);
    // The TASK_DELETED activity must survive the task (no taskId FK, or it would cascade).
    expect(
      await app.db.activity.count({
        where: { projectId: s.project.id, type: 'TASK_DELETED', taskId: null },
      }),
    ).toBe(1);
    off();
    expect(seen).toEqual(expect.arrayContaining(['task.updated']));
  });

  it('moves across columns: status activity, reporter notified, actor not, paginated activity feed', async () => {
    const s = await setup();
    const t = await create(s.owner, s.project.id, {
      title: 'Ship it',
      assigneeId: s.member.id,
      status: 'TODO',
    });

    const res = await move(s.member, t.id, 'IN_PROGRESS');
    expect(res.statusCode).toBe(200);
    expect(res.json().data.status).toBe('IN_PROGRESS');
    const [statusAct] = await app.db.activity.findMany({
      where: { taskId: t.id, type: 'TASK_STATUS_CHANGED' },
    });
    expect(statusAct?.data).toMatchObject({ from: 'TODO', to: 'IN_PROGRESS' });
    const notifs = await app.db.notification.findMany({
      where: { userId: { in: [s.owner.id, s.member.id] }, type: 'TASK_UPDATED' },
    });
    expect(notifs.map((n) => n.userId)).toEqual([s.owner.id]);

    // Newest first: STATUS_CHANGED, ASSIGNED (same transaction as CREATED, so it sorts above it), CREATED.
    const page1 = await api(app, s.owner, 'GET', `/api/tasks/${t.id}/activity?limit=2`);
    expect(page1.json().data.map((a: { type: string }) => a.type)).toEqual([
      'TASK_STATUS_CHANGED',
      'TASK_ASSIGNED',
    ]);
    const page2 = await api(
      app,
      s.owner,
      'GET',
      `/api/tasks/${t.id}/activity?limit=2&cursor=${page1.json().nextCursor}`,
    );
    expect(page2.json()).toMatchObject({
      data: [{ type: 'TASK_CREATED', viaAgent: false }],
      nextCursor: null,
    });
  });

  it('persists Kanban order: insert before a task, move to the end', async () => {
    const s = await setup();
    const x = await create(s.owner, s.project.id, { title: 'x', status: 'TODO' });
    const y = await create(s.owner, s.project.id, { title: 'y', status: 'TODO' });
    const z = await create(s.owner, s.project.id, { title: 'z', status: 'TODO' });
    const titles = async () => (await column(s, 'TODO')).map((t) => t.title);

    expect(await titles()).toEqual(['x', 'y', 'z']);
    expect((await move(s.owner, z.id, 'TODO', x.id)).statusCode).toBe(200);
    expect(await titles()).toEqual(['z', 'x', 'y']);
    await move(s.owner, y.id, 'TODO', z.id);
    expect(await titles()).toEqual(['y', 'z', 'x']);
    await move(s.owner, y.id, 'TODO', null);
    expect(await titles()).toEqual(['z', 'x', 'y']);
    expect((await move(s.owner, y.id, 'TODO', y.id)).statusCode).toBe(400);
  });

  it('rebalances a column when midpoints run out, keeping the order', async () => {
    const s = await setup();
    await create(s.owner, s.project.id, { title: 'a', status: 'TODO' });
    const b = await create(s.owner, s.project.id, { title: 'b', status: 'TODO' });
    let anchor = b;
    // Each new task lands just before the previous one, halving the gap to 'a' until a rebalance.
    for (let i = 0; i < 40; i++) {
      const t = await create(s.owner, s.project.id, { title: `t${i}`, status: 'TODO' });
      expect((await move(s.member, t.id, 'TODO', anchor.id)).statusCode).toBe(200);
      anchor = t;
    }
    const titles = (await column(s, 'TODO')).map((t) => t.title);
    expect(titles).toEqual(['a', ...Array.from({ length: 40 }, (_, i) => `t${39 - i}`), 'b']);
    // 'b' is never moved: only a rebalance can have changed its position.
    expect((await column(s, 'TODO')).at(-1)?.position).toBeGreaterThan(2048);
  });

  it('allocates distinct task numbers under concurrent creation', async () => {
    const s = await setup();
    const res = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        api(app, s.owner, 'POST', `/api/projects/${s.project.id}/tasks`, { title: `c${i}` }),
      ),
    );
    expect(res.map((r) => r.statusCode)).toEqual(Array(8).fill(201));
    const numbers = res.map((r) => r.json().data.number as number).sort((a, b) => a - b);
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('assigns only project members and never notifies the actor', async () => {
    const s = await setup();
    const t = await create(s.owner, s.project.id);
    expect((await patch(s.owner, t.id, { assigneeId: s.stranger.id })).statusCode).toBe(400);
    expect((await patch(s.owner, t.id, { assigneeId: s.outsider.id })).statusCode).toBe(400);

    expect((await patch(s.member, t.id, { assigneeId: s.member.id })).statusCode).toBe(200);
    expect(await app.db.notification.count({ where: { userId: s.member.id } })).toBe(0);

    const cleared = await patch(s.owner, t.id, { assigneeId: null });
    expect(cleared.json().data.assignee).toBeNull();
    const assignments = await app.db.activity.findMany({
      where: { taskId: t.id, type: 'TASK_ASSIGNED' },
      orderBy: { createdAt: 'asc' },
    });
    expect(assignments.map((a) => a.data)).toMatchObject([
      { assignee: { id: s.member.id } },
      { assignee: null },
    ]);
  });

  it('gives viewers read-only access and non-members 404', async () => {
    const s = await setup();
    const t = await create(s.owner, s.project.id);
    const list = `/api/projects/${s.project.id}/tasks`;
    expect((await api(app, s.viewer, 'GET', list)).statusCode).toBe(200);
    expect((await api(app, s.viewer, 'POST', list, { title: 'x' })).statusCode).toBe(403);
    expect((await patch(s.viewer, t.id, { title: 'x' })).statusCode).toBe(403);
    expect((await move(s.viewer, t.id, 'DONE')).statusCode).toBe(403);
    expect((await api(app, s.outsider, 'GET', list)).statusCode).toBe(404);
    expect((await api(app, s.outsider, 'POST', list, { title: 'x' })).statusCode).toBe(404);
  });

  it('refuses writes on an archived project (409) but keeps reads', async () => {
    const s = await setup();
    const t = await create(s.owner, s.project.id);
    await app.db.project.update({ where: { id: s.project.id }, data: { status: 'ARCHIVED' } });
    const list = `/api/projects/${s.project.id}/tasks`;
    expect((await api(app, s.owner, 'POST', list, { title: 'x' })).statusCode).toBe(409);
    expect((await patch(s.owner, t.id, { title: 'y' })).statusCode).toBe(409);
    expect((await move(s.owner, t.id, 'DONE')).statusCode).toBe(409);
    expect((await api(app, s.owner, 'GET', `/api/tasks/${t.id}`)).statusCode).toBe(200);
  });

  it('filters, searches and sorts the board', async () => {
    const s = await setup();
    const pid = s.project.id;
    await create(s.owner, pid, {
      title: 'Fix login',
      description: 'OAuth redirect loop',
      priority: 'HIGH',
      assigneeId: s.member.id,
      labels: [{ name: 'Auth' }],
    });
    await create(s.owner, pid, { title: 'Dark mode', priority: 'LOW', labels: [{ name: 'ui' }] });
    await create(s.owner, pid, {
      title: 'Refactor API',
      priority: 'URGENT',
      assigneeId: s.owner.id,
      status: 'DONE',
    });
    const list = async (qs: string) =>
      (await api(app, s.member, 'GET', `/api/projects/${pid}/tasks?${qs}`))
        .json()
        .data.map((t: { title: string }) => t.title);

    expect(await list('q=login')).toEqual(['Fix login']);
    expect(await list('q=oauth')).toEqual(['Fix login']);
    expect(await list('q=WEB-2')).toEqual(['Dark mode']);
    expect(await list('assigneeId=me')).toEqual(['Fix login']);
    expect(await list('assigneeId=none')).toEqual(['Dark mode']);
    expect(await list('label=auth')).toEqual(['Fix login']);
    expect(await list('status=DONE')).toEqual(['Refactor API']);
    expect(await list('sort=priority&order=desc')).toEqual([
      'Refactor API',
      'Fix login',
      'Dark mode',
    ]);
    expect(await list('sort=createdAt&order=desc')).toEqual([
      'Refactor API',
      'Dark mode',
      'Fix login',
    ]);
    expect(
      (await api(app, s.member, 'GET', `/api/projects/${pid}/tasks?assigneeId=nope`)).statusCode,
    ).toBe(400);
  });

  it('lets only the reporter, the assignee or an admin delete a task', async () => {
    const s = await setup();
    const t = await create(s.owner, s.project.id, { assigneeId: s.member.id });
    expect((await api(app, s.stranger, 'DELETE', `/api/tasks/${t.id}`)).statusCode).toBe(403);
    expect((await api(app, s.admin, 'DELETE', `/api/tasks/${t.id}`)).statusCode).toBe(204);
  });
});
