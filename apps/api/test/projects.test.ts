import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { App } from '../src/app';
import type { DomainEvent } from '../src/events';
import { api, buildTestApp, registerUser, type TestUser } from './helpers';

let app: App;
beforeAll(async () => {
  app = await buildTestApp();
});
afterAll(() => app.close());

type Role = 'ADMIN' | 'MEMBER' | 'VIEWER';
const body = <T>(res: { json(): unknown }) => (res.json() as { data: T }).data;
const identifier = () => `P${randomUUID().slice(0, 4).toUpperCase()}X`;

/** Fresh workspace owned by a new user, and `join(role)` to add invited users to it. */
const setup = async () => {
  const owner = await registerUser(app);
  const ws = body<{ id: string }>(
    await api(app, owner, 'POST', '/api/workspaces', { name: `Team ${randomUUID().slice(0, 8)}` }),
  );
  const join = async (role: Role): Promise<TestUser> => {
    const user = await registerUser(app);
    const { invitation } = body<{ invitation: { id: string } }>(
      await api(app, owner, 'POST', `/api/workspaces/${ws.id}/invitations`, {
        email: user.email,
        role,
      }),
    );
    expect(
      (await api(app, user, 'POST', `/api/invitations/${invitation.id}/accept`)).statusCode,
    ).toBe(200);
    return user;
  };
  return { owner, ws, join };
};

const createProject = (user: TestUser, wsId: string, id = identifier()) =>
  api(app, user, 'POST', `/api/workspaces/${wsId}/projects`, {
    name: `Proj ${id}`,
    identifier: id,
  });

describe('projects', () => {
  it('creates a project: creator joins it, PROJECT_CREATED is logged, event emitted', async () => {
    const { ws, join } = await setup();
    const member = await join('MEMBER');
    const id = identifier();
    const seen: DomainEvent[] = [];
    const off = app.events.subscribe((e) => seen.push(e));
    const res = await createProject(member, ws.id, id);
    off();

    expect(res.statusCode).toBe(201);
    const project = body<{ id: string; identifier: string; taskCounts: unknown }>(res);
    expect(project).toMatchObject({ identifier: id, taskCounts: { total: 0, done: 0 } });
    expect(
      await app.db.projectMember.count({ where: { projectId: project.id, userId: member.id } }),
    ).toBe(1);
    const act = await app.db.activity.findFirst({
      where: { projectId: project.id, type: 'PROJECT_CREATED' },
    });
    expect(act?.data).toMatchObject({ identifier: id });
    expect(seen).toContainEqual(
      expect.objectContaining({ type: 'project.created', projectId: project.id }),
    );
  });

  it('enforces the role matrix: creation needs MEMBER+, reads need VIEWER+, strangers get 404', async () => {
    const { owner, ws, join } = await setup();
    const viewer = await join('VIEWER');
    const member = await join('MEMBER');
    const stranger = await registerUser(app);

    expect((await createProject(viewer, ws.id)).statusCode).toBe(403);
    expect((await createProject(stranger, ws.id)).statusCode).toBe(404);

    const project = body<{ id: string }>(await createProject(member, ws.id));
    expect((await api(app, viewer, 'GET', `/api/projects/${project.id}`)).statusCode).toBe(200);
    expect((await api(app, stranger, 'GET', `/api/projects/${project.id}`)).statusCode).toBe(404);
    expect((await api(app, owner, 'GET', `/api/projects/${randomUUID()}`)).statusCode).toBe(404);
  });

  it('validates the identifier format and enforces uniqueness per workspace', async () => {
    const { owner, ws } = await setup();
    for (const bad of ['web', 'A', 'TOOLONGID', '1AB']) {
      expect((await createProject(owner, ws.id, bad)).statusCode).toBe(400);
    }
    const id = identifier();
    expect((await createProject(owner, ws.id, id)).statusCode).toBe(201);
    expect((await createProject(owner, ws.id, id)).statusCode).toBe(409);

    const other = await setup();
    expect((await createProject(other.owner, other.ws.id, id)).statusCode).toBe(201);
  });

  it('lists projects with an optional status filter and computes task counts', async () => {
    const { owner, ws } = await setup();
    const active = body<{ id: string }>(await createProject(owner, ws.id));
    const archived = body<{ id: string }>(await createProject(owner, ws.id));
    await api(app, owner, 'PATCH', `/api/projects/${archived.id}`, { status: 'ARCHIVED' });

    await app.db.task.createMany({
      data: [
        { projectId: active.id, number: 1, title: 'a', reporterId: owner.id, status: 'DONE' },
        { projectId: active.id, number: 2, title: 'b', reporterId: owner.id, status: 'TODO' },
      ],
    });

    const all = body<{ id: string; taskCounts: { total: number; done: number } }[]>(
      await api(app, owner, 'GET', `/api/workspaces/${ws.id}/projects`),
    );
    expect(all).toHaveLength(2);
    expect(all.find((p) => p.id === active.id)?.taskCounts).toEqual({ total: 2, done: 1 });

    const onlyArchived = body<{ id: string }[]>(
      await api(app, owner, 'GET', `/api/workspaces/${ws.id}/projects?status=ARCHIVED`),
    );
    expect(onlyArchived.map((p) => p.id)).toEqual([archived.id]);
  });

  it('updates projects as ADMIN+, refuses identifier changes and logs archive separately', async () => {
    const { owner, ws, join } = await setup();
    const admin = await join('ADMIN');
    const member = await join('MEMBER');
    const project = body<{ id: string }>(await createProject(owner, ws.id));
    const url = `/api/projects/${project.id}`;

    expect((await api(app, member, 'PATCH', url, { name: 'x' })).statusCode).toBe(403);
    expect((await api(app, admin, 'PATCH', url, { identifier: 'NEWID' })).statusCode).toBe(400);

    const renamed = await api(app, admin, 'PATCH', url, { name: 'Renamed' });
    expect(body<{ name: string }>(renamed).name).toBe('Renamed');
    expect(
      await app.db.activity.count({ where: { projectId: project.id, type: 'PROJECT_UPDATED' } }),
    ).toBe(1);

    const archived = await api(app, admin, 'PATCH', url, { status: 'ARCHIVED' });
    expect(body<{ status: string }>(archived).status).toBe('ARCHIVED');
    expect(
      await app.db.activity.count({ where: { projectId: project.id, type: 'PROJECT_ARCHIVED' } }),
    ).toBe(1);
  });

  it('manages project members: workspace members only, no duplicates, removal unassigns tasks', async () => {
    const { owner, ws, join } = await setup();
    const member = await join('MEMBER');
    const outsider = await registerUser(app);
    const project = body<{ id: string }>(await createProject(owner, ws.id));
    const url = `/api/projects/${project.id}/members`;

    expect((await api(app, owner, 'POST', url, { userId: outsider.id })).statusCode).toBe(400);
    expect((await api(app, owner, 'POST', url, { userId: member.id })).statusCode).toBe(201);
    expect((await api(app, owner, 'POST', url, { userId: member.id })).statusCode).toBe(409);
    expect(
      body<{ userId: string }[]>(await api(app, owner, 'GET', url)).map((m) => m.userId),
    ).toContain(member.id);

    const task = await app.db.task.create({
      data: {
        projectId: project.id,
        number: 1,
        title: 'T',
        reporterId: owner.id,
        assigneeId: member.id,
      },
    });
    expect((await api(app, member, 'DELETE', `${url}/${owner.id}`)).statusCode).toBe(403);
    expect((await api(app, owner, 'DELETE', `${url}/${member.id}`)).statusCode).toBe(204);
    expect((await api(app, owner, 'DELETE', `${url}/${member.id}`)).statusCode).toBe(404);
    expect((await app.db.task.findUniqueOrThrow({ where: { id: task.id } })).assigneeId).toBeNull();
  });
});
