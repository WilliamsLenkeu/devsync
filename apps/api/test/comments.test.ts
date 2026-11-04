import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { App } from '../src/app';
import { api, buildTestApp, registerUser } from './helpers';

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
  const task = (
    await api(app, owner, 'POST', `/api/projects/${project.id}/tasks`, { title: 'Discuss' })
  ).json().data as { id: string };
  return { owner, admin, member, viewer, stranger, outsider, project, taskId: task.id };
};

const comment = (user: { cookie: string }, taskId: string, body: string) =>
  api(app, user, 'POST', `/api/tasks/${taskId}/comments`, { body });

describe('comments', () => {
  it('lists comments chronologically and counts them on the task', async () => {
    const s = await setup();
    await comment(s.owner, s.taskId, 'first');
    await comment(s.member, s.taskId, 'second');
    const list = (await api(app, s.viewer, 'GET', `/api/tasks/${s.taskId}/comments`)).json().data;
    expect(list.map((c: { body: string }) => c.body)).toEqual(['first', 'second']);
    expect(list[1]).toMatchObject({ author: { id: s.member.id } });
    const task = (await api(app, s.owner, 'GET', `/api/tasks/${s.taskId}`)).json().data;
    expect(task.commentCount).toBe(2);
  });

  it('notifies mentioned workspace members once, skips the author and outsiders', async () => {
    const s = await setup();
    const body = [
      `Hey @[Member](user:${s.member.id}) and again @[Member](user:${s.member.id})`,
      `@[Owner](user:${s.owner.id}) @[Out](user:${s.outsider.id})`,
    ].join(' ');
    const res = await comment(s.owner, s.taskId, body);
    expect(res.statusCode).toBe(201);
    expect(
      await app.db.notification.count({ where: { userId: s.member.id, type: 'COMMENT_MENTION' } }),
    ).toBe(1);
    expect(await app.db.notification.count({ where: { userId: s.owner.id } })).toBe(0);
    expect(await app.db.notification.count({ where: { userId: s.outsider.id } })).toBe(0);
    const [act] = await app.db.activity.findMany({
      where: { taskId: s.taskId, type: 'COMMENT_CREATED' },
    });
    expect(act?.data).toMatchObject({ commentId: res.json().data.id, taskKey: 'WEB-1' });
  });

  it('lets viewers read but not comment, and hides the task from non-members', async () => {
    const s = await setup();
    expect((await comment(s.viewer, s.taskId, 'nope')).statusCode).toBe(403);
    expect((await comment(s.outsider, s.taskId, 'nope')).statusCode).toBe(404);
    expect((await api(app, s.outsider, 'GET', `/api/tasks/${s.taskId}/comments`)).statusCode).toBe(
      404,
    );
  });

  it('validates the body (1-5000 characters)', async () => {
    const s = await setup();
    expect((await comment(s.owner, s.taskId, '   ')).statusCode).toBe(400);
    expect((await comment(s.owner, s.taskId, 'x'.repeat(5001))).statusCode).toBe(400);
  });

  it('deletes: author or admin only', async () => {
    const s = await setup();
    const mine = (await comment(s.member, s.taskId, 'mine')).json().data.id as string;
    const theirs = (await comment(s.owner, s.taskId, 'theirs')).json().data.id as string;
    expect((await api(app, s.stranger, 'DELETE', `/api/comments/${theirs}`)).statusCode).toBe(403);
    expect((await api(app, s.member, 'DELETE', `/api/comments/${theirs}`)).statusCode).toBe(403);
    expect((await api(app, s.member, 'DELETE', `/api/comments/${mine}`)).statusCode).toBe(204);
    expect((await api(app, s.admin, 'DELETE', `/api/comments/${theirs}`)).statusCode).toBe(204);
    expect((await api(app, s.admin, 'DELETE', `/api/comments/${theirs}`)).statusCode).toBe(404);
  });

  it('refuses comments on an archived project (409)', async () => {
    const s = await setup();
    await app.db.project.update({ where: { id: s.project.id }, data: { status: 'ARCHIVED' } });
    expect((await comment(s.owner, s.taskId, 'late')).statusCode).toBe(409);
  });
});
