import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { App } from '../src/app';
import { api, buildTestApp, registerUser, type TestUser } from './helpers';

let app: App;
beforeAll(async () => {
  app = await buildTestApp();
});
afterAll(() => app.close());

const db = () => app.db;

const seedWorkspace = (owner: TestUser) =>
  db().workspace.create({
    data: {
      name: 'WS',
      slug: `ws-${randomUUID()}`,
      members: { create: { userId: owner.id, role: 'OWNER' } },
    },
  });

const seedProject = (workspaceId: string, creatorId: string, identifier: string) =>
  db().project.create({
    data: { workspaceId, name: `Project ${identifier}`, identifier, createdById: creatorId },
  });

const seedTask = (
  projectId: string,
  reporterId: string,
  number: number,
  extra: {
    status?: 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'DONE';
    assigneeId?: string;
    dueDate?: Date;
  } = {},
) =>
  db().task.create({
    data: { projectId, number, title: `Task ${number}`, reporterId, ...extra },
  });

const seedActivity = (
  data: { workspaceId: string; projectId?: string; taskId?: string; actorId: string },
  createdAt: Date,
) =>
  db().activity.create({
    data: { ...data, type: 'TASK_CREATED', data: { taskKey: 'X-1', title: 'T' }, createdAt },
  });

/** Newest first, ties broken by id desc (same order as the feed). */
const feedOrder = <T extends { createdAt: Date; id: string }>(rows: T[]) =>
  [...rows]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || (a.id < b.id ? 1 : -1))
    .map((r) => r.id);

describe('workspace activity feed', () => {
  it('paginates in (createdAt desc, id desc) order, ties included', async () => {
    const alice = await registerUser(app);
    const ws = await seedWorkspace(alice);
    const t = Date.now() - 60_000;
    const rows = [];
    for (const offset of [0, 1000, 1000, 2000, 2000]) {
      rows.push(
        await seedActivity({ workspaceId: ws.id, actorId: alice.id }, new Date(t + offset)),
      );
    }
    const expected = feedOrder(rows);

    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const qs = `limit=2${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
      const res = await api(app, alice, 'GET', `/api/workspaces/${ws.id}/activity?${qs}`);
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.length).toBeLessThanOrEqual(2);
      seen.push(...body.data.map((a: { id: string }) => a.id));
      cursor = body.nextCursor;
    } while (cursor);

    expect(seen).toEqual(expected);
  });

  it('returns the activity DTO with actor and viaAgent', async () => {
    const alice = await registerUser(app, 'Alice');
    const ws = await seedWorkspace(alice);
    await seedActivity({ workspaceId: ws.id, actorId: alice.id }, new Date());
    const res = await api(app, alice, 'GET', `/api/workspaces/${ws.id}/activity`);
    const [item] = res.json().data;
    expect(item).toMatchObject({
      workspaceId: ws.id,
      projectId: null,
      taskId: null,
      type: 'TASK_CREATED',
      viaAgent: false,
      actor: { id: alice.id, name: 'Alice', avatarUrl: null },
      data: { taskKey: 'X-1', title: 'T' },
    });
  });

  it('filters by projectId and taskId, and never leaks another workspace', async () => {
    const alice = await registerUser(app);
    const ws = await seedWorkspace(alice);
    const other = await seedWorkspace(alice);
    const p1 = await seedProject(ws.id, alice.id, 'AAA');
    const p2 = await seedProject(ws.id, alice.id, 'BBB');
    const foreign = await seedProject(other.id, alice.id, 'CCC');
    const t1 = await seedTask(p1.id, alice.id, 1);
    const onP1 = await seedActivity(
      { workspaceId: ws.id, projectId: p1.id, taskId: t1.id, actorId: alice.id },
      new Date(),
    );
    const onP2 = await seedActivity(
      { workspaceId: ws.id, projectId: p2.id, actorId: alice.id },
      new Date(),
    );
    const foreignAct = await seedActivity(
      { workspaceId: other.id, projectId: foreign.id, actorId: alice.id },
      new Date(),
    );

    const ids = async (qs: string) =>
      (await api(app, alice, 'GET', `/api/workspaces/${ws.id}/activity?${qs}`))
        .json()
        .data.map((a: { id: string }) => a.id);

    expect(await ids(`projectId=${p1.id}`)).toEqual([onP1.id]);
    expect(await ids(`taskId=${t1.id}`)).toEqual([onP1.id]);
    expect(await ids(`projectId=${p2.id}`)).toEqual([onP2.id]);
    // a project from another workspace yields an empty list, not its activity
    expect(await ids(`projectId=${foreign.id}`)).toEqual([]);
    expect(await ids('')).not.toContain(foreignAct.id);
  });

  it('answers 404 to non-members and hides other workspaces', async () => {
    const alice = await registerUser(app);
    const bob = await registerUser(app);
    const ws = await seedWorkspace(alice);
    const project = await seedProject(ws.id, alice.id, 'DDD');
    expect((await api(app, bob, 'GET', `/api/workspaces/${ws.id}/activity`)).statusCode).toBe(404);
    expect((await api(app, bob, 'GET', `/api/projects/${project.id}/activity`)).statusCode).toBe(
      404,
    );
    expect(
      (await api(app, alice, 'GET', `/api/projects/${randomUUID()}/activity`)).statusCode,
    ).toBe(404);
    expect((await api(app, alice, 'GET', `/api/workspaces/not-a-uuid/activity`)).statusCode).toBe(
      400,
    );
  });
});

describe('workspace dashboard', () => {
  it('returns zeros and empty lists for an empty workspace', async () => {
    const alice = await registerUser(app);
    const ws = await seedWorkspace(alice);
    const res = await api(app, alice, 'GET', `/api/workspaces/${ws.id}/dashboard`);
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toEqual({
      totals: { total: 0, completed: 0, inProgress: 0, overdue: 0 },
      assignedToMe: { count: 0, tasks: [] },
      projectProgress: [],
      recentActivity: [],
    });
  });

  it('aggregates tasks of ACTIVE projects only and lists my open tasks', async () => {
    const alice = await registerUser(app);
    const bob = await registerUser(app);
    const ws = await seedWorkspace(alice);
    const past = new Date(Date.now() - 86_400_000);
    const future = new Date(Date.now() + 86_400_000);
    const active = await seedProject(ws.id, alice.id, 'GGG');
    const empty = await seedProject(ws.id, alice.id, 'HHH');
    const archived = await db().project.create({
      data: {
        workspaceId: ws.id,
        name: 'Old',
        identifier: 'OLD',
        status: 'ARCHIVED',
        createdById: alice.id,
      },
    });

    // ACTIVE project: overdue-but-DONE excluded, overdue-open counted
    await seedTask(active.id, alice.id, 1, { status: 'DONE', assigneeId: alice.id, dueDate: past });
    const late = await seedTask(active.id, alice.id, 2, {
      status: 'IN_PROGRESS',
      assigneeId: alice.id,
      dueDate: past,
    });
    await seedTask(active.id, alice.id, 3, { status: 'TODO', assigneeId: bob.id, dueDate: future });
    const noDue = await seedTask(active.id, alice.id, 4, {
      status: 'BACKLOG',
      assigneeId: alice.id,
    });
    // ARCHIVED project: must not count anywhere
    await seedTask(archived.id, alice.id, 1, {
      status: 'DONE',
      assigneeId: alice.id,
      dueDate: past,
    });
    await seedTask(archived.id, alice.id, 2, { status: 'TODO', dueDate: past });

    const res = await api(app, alice, 'GET', `/api/workspaces/${ws.id}/dashboard`);
    expect(res.statusCode).toBe(200);
    const d = res.json().data;

    expect(d.totals).toEqual({ total: 4, completed: 1, inProgress: 1, overdue: 1 });
    expect(d.assignedToMe.count).toBe(2);
    // overdue first (dueDate asc, nulls last), DONE and other assignees excluded
    expect(d.assignedToMe.tasks.map((t: { id: string }) => t.id)).toEqual([late.id, noDue.id]);
    expect(d.assignedToMe.tasks[0]).toMatchObject({ key: 'GGG-2', status: 'IN_PROGRESS' });

    expect(d.projectProgress).toEqual(
      [
        { projectId: active.id, name: 'Project GGG', identifier: 'GGG', total: 4, done: 1 },
        { projectId: empty.id, name: 'Project HHH', identifier: 'HHH', total: 0, done: 0 },
      ].sort((a, b) => a.name.localeCompare(b.name)),
    );
  });

  it('returns recent activity (max 10) and hides it from non-members', async () => {
    const alice = await registerUser(app);
    const bob = await registerUser(app);
    const ws = await seedWorkspace(alice);
    for (let i = 0; i < 12; i++)
      await seedActivity({ workspaceId: ws.id, actorId: alice.id }, new Date(Date.now() + i));
    const res = await api(app, alice, 'GET', `/api/workspaces/${ws.id}/dashboard`);
    expect(res.json().data.recentActivity).toHaveLength(10);
    expect((await api(app, bob, 'GET', `/api/workspaces/${ws.id}/dashboard`)).statusCode).toBe(404);
  });
});

describe('project activity feed', () => {
  it('returns only the activity of that project', async () => {
    const alice = await registerUser(app);
    const ws = await seedWorkspace(alice);
    const p1 = await seedProject(ws.id, alice.id, 'EEE');
    const p2 = await seedProject(ws.id, alice.id, 'FFF');
    const mine = await seedActivity(
      { workspaceId: ws.id, projectId: p1.id, actorId: alice.id },
      new Date(),
    );
    await seedActivity({ workspaceId: ws.id, projectId: p2.id, actorId: alice.id }, new Date());

    const res = await api(app, alice, 'GET', `/api/projects/${p1.id}/activity`);
    expect(res.statusCode).toBe(200);
    expect(res.json().data.map((a: { id: string }) => a.id)).toEqual([mine.id]);
  });
});
