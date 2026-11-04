import { randomUUID } from 'node:crypto';
import type { ApiTokenScope } from '@devsync/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { App } from '../src/app';
import { api, buildTestApp, registerUser, type TestUser } from './helpers';

let app: App;
beforeAll(async () => {
  app = await buildTestApp();
});
afterAll(() => app.close());

interface Fixture {
  owner: TestUser;
  dev: TestUser;
  workspaceId: string;
  projectId: string;
  /** Bearer secret of a token with exactly `scopes`. */
  token: (scopes: ApiTokenScope[]) => Promise<string>;
}

/** One workspace (owner + dev, both project members) and a project; tokens are created through the real API. */
const fixture = async (): Promise<Fixture> => {
  const owner = await registerUser(app);
  const dev = await registerUser(app);
  const ws = await app.db.workspace.create({
    data: {
      name: 'Agents',
      slug: `ag-${randomUUID()}`,
      members: {
        create: [
          { userId: owner.id, role: 'OWNER' },
          { userId: dev.id, role: 'MEMBER' },
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
      members: { create: [{ userId: owner.id }, { userId: dev.id }] },
    },
  });
  const token = async (scopes: ApiTokenScope[]) => {
    const res = await api(app, owner, 'POST', `/api/workspaces/${ws.id}/api-tokens`, {
      name: 'agent',
      scopes,
    });
    if (res.statusCode !== 201) throw new Error(`token failed: ${res.body}`);
    return res.json().data.secret as string;
  };
  return { owner, dev, workspaceId: ws.id, projectId: project.id, token };
};

const agent = (secret: string, method: 'GET' | 'POST' | 'PATCH', url: string, payload?: object) =>
  app.inject({ method, url, headers: { authorization: `Bearer ${secret}` }, payload });

const ALL_SCOPES: ApiTokenScope[] = [
  'workspaces:read',
  'projects:read',
  'tasks:read',
  'tasks:write',
  'comments:write',
  'activity:read',
];

describe('agent API', () => {
  it('requires the matching scope for every route', async () => {
    const f = await fixture();
    const readOnly = await f.token([
      'workspaces:read',
      'projects:read',
      'tasks:read',
      'activity:read',
    ]);
    const taskUrl = `/api/agent/projects/${f.projectId}/tasks`;
    const created = await agent(readOnly, 'POST', taskUrl, { title: 'nope' });
    expect(created.statusCode).toBe(403);
    expect(await app.db.task.count({ where: { projectId: f.projectId } })).toBe(0);

    const writeOnly = await f.token(['tasks:write', 'comments:write']);
    expect(
      (await agent(writeOnly, 'GET', `/api/agent/projects/${f.projectId}/tasks`)).statusCode,
    ).toBe(403);
    expect((await agent(writeOnly, 'GET', '/api/agent/projects')).statusCode).toBe(403);
    expect(
      (await agent(writeOnly, 'GET', `/api/agent/projects/${f.projectId}/activity`)).statusCode,
    ).toBe(403);
  });

  it('keeps a token inside its workspace (404 elsewhere)', async () => {
    const f = await fixture();
    const other = await fixture();
    const secret = await f.token(ALL_SCOPES);
    const otherTask = await app.db.task.create({
      data: { projectId: other.projectId, number: 1, title: 'theirs', reporterId: other.owner.id },
    });

    expect(
      (await agent(secret, 'GET', `/api/agent/projects/${other.projectId}/tasks`)).statusCode,
    ).toBe(404);
    expect(
      (await agent(secret, 'POST', `/api/agent/projects/${other.projectId}/tasks`, { title: 'x' }))
        .statusCode,
    ).toBe(404);
    expect((await agent(secret, 'GET', `/api/agent/tasks/${otherTask.id}`)).statusCode).toBe(404);
    expect(
      (await agent(secret, 'PATCH', `/api/agent/tasks/${otherTask.id}`, { title: 'x' })).statusCode,
    ).toBe(404);
    expect(
      (await agent(secret, 'POST', `/api/agent/tasks/${otherTask.id}/comments`, { body: 'x' }))
        .statusCode,
    ).toBe(404);
    expect(
      (await agent(secret, 'GET', `/api/agent/projects/${other.projectId}/activity`)).statusCode,
    ).toBe(404);

    const workspaces = (await agent(secret, 'GET', '/api/agent/workspaces')).json().data;
    expect(workspaces.map((w: { id: string }) => w.id)).toEqual([f.workspaceId]);
  });

  it('refuses cookie sessions on agent routes', async () => {
    const f = await fixture();
    const res = await api(app, f.owner, 'GET', '/api/agent/workspaces');
    expect(res.statusCode).toBe(401);
  });

  it('creates, updates, moves, assigns and comments with viaAgent activity', async () => {
    const f = await fixture();
    const secret = await f.token(ALL_SCOPES);
    const tokenId = (
      await app.db.apiToken.findFirstOrThrow({ where: { workspaceId: f.workspaceId } })
    ).id;
    const taskUrl = `/api/agent/projects/${f.projectId}/tasks`;

    const created = await agent(secret, 'POST', taskUrl, { title: 'Ship it', status: 'TODO' });
    expect(created.statusCode).toBe(201);
    const task = created.json().data;
    expect(task.key).toBe('WEB-1');

    const patched = await agent(secret, 'PATCH', `/api/agent/tasks/${task.id}`, {
      title: 'Ship it now',
      status: 'IN_PROGRESS',
    });
    expect(patched.statusCode).toBe(200);
    expect(patched.json().data).toMatchObject({ title: 'Ship it now', status: 'IN_PROGRESS' });

    const assigned = await agent(secret, 'POST', `/api/agent/tasks/${task.id}/assign`, {
      assigneeId: f.dev.id,
    });
    expect(assigned.json().data.assignee.id).toBe(f.dev.id);

    const comment = await agent(secret, 'POST', `/api/agent/tasks/${task.id}/comments`, {
      body: 'On it',
    });
    expect(comment.statusCode).toBe(201);

    const rows = await app.db.activity.findMany({
      where: { taskId: task.id },
      orderBy: { createdAt: 'asc' },
    });
    const types = rows.map((r) => r.type);
    expect(types).toEqual(
      expect.arrayContaining([
        'TASK_CREATED',
        'TASK_UPDATED',
        'TASK_STATUS_CHANGED',
        'TASK_ASSIGNED',
        'COMMENT_CREATED',
      ]),
    );
    for (const row of rows) expect(row.apiTokenId).toBe(tokenId);

    const feed = await agent(secret, 'GET', `/api/agent/projects/${f.projectId}/activity`);
    expect(feed.statusCode).toBe(200);
    const items = feed.json().data as { type: string; viaAgent: boolean }[];
    expect(items.length).toBeGreaterThanOrEqual(5);
    expect(items.every((i) => i.viaAgent)).toBe(true);
  });

  it('marks web actions as not via agent', async () => {
    const f = await fixture();
    const secret = await f.token(ALL_SCOPES);
    const task = (
      await agent(secret, 'POST', `/api/agent/projects/${f.projectId}/tasks`, {
        title: 'Agent task',
      })
    ).json().data;
    await app.db.activity.create({
      data: {
        workspaceId: f.workspaceId,
        projectId: f.projectId,
        taskId: task.id,
        type: 'TASK_DELETED',
        actorId: f.owner.id,
      },
    });
    const feed = (await agent(secret, 'GET', `/api/agent/projects/${f.projectId}/activity`)).json()
      .data as {
      type: string;
      viaAgent: boolean;
    }[];
    expect(feed.find((i) => i.type === 'TASK_DELETED')?.viaAgent).toBe(false);
    expect(feed.find((i) => i.type === 'TASK_CREATED')?.viaAgent).toBe(true);
  });

  it('validates bodies and keeps assignees to project members', async () => {
    const f = await fixture();
    const secret = await f.token(ALL_SCOPES);
    const invalid = await agent(secret, 'POST', `/api/agent/projects/${f.projectId}/tasks`, {
      title: '',
    });
    expect(invalid.statusCode).toBe(400);

    const task = (
      await agent(secret, 'POST', `/api/agent/projects/${f.projectId}/tasks`, { title: 'T' })
    ).json().data;
    const stranger = await registerUser(app);
    const notMember = await agent(secret, 'POST', `/api/agent/tasks/${task.id}/assign`, {
      assigneeId: stranger.id,
    });
    expect(notMember.statusCode).toBe(400);
  });

  it('requires the activity:read scope for the feed', async () => {
    const f = await fixture();
    const secret = await f.token(['workspaces:read', 'projects:read']);
    const res = await agent(secret, 'GET', `/api/agent/projects/${f.projectId}/activity`);
    expect(res.statusCode).toBe(403);
  });
});
