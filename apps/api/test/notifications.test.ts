import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { App } from '../src/app';
import { api, buildTestApp, registerUser, type TestUser } from './helpers';

let app: App;
beforeAll(async () => {
  app = await buildTestApp();
});
afterAll(() => app.close());

const seedWorkspace = (owner: TestUser) =>
  app.db.workspace.create({
    data: {
      name: 'WS',
      slug: `ws-${randomUUID()}`,
      members: { create: { userId: owner.id, role: 'OWNER' } },
    },
  });

const seedNotification = (userId: string, workspaceId: string, createdAt = new Date()) =>
  app.db.notification.create({
    data: {
      userId,
      workspaceId,
      type: 'TASK_ASSIGNED',
      data: { taskId: randomUUID(), taskKey: 'X-1', title: 'T', actor: null },
      createdAt,
    },
  });

describe('notifications', () => {
  it('lists only my notifications, newest first, with cursor pagination', async () => {
    const alice = await registerUser(app);
    const bob = await registerUser(app);
    const ws = await seedWorkspace(alice);
    const t = Date.now() - 60_000;
    const mine = [0, 1, 2].map((i) => seedNotification(alice.id, ws.id, new Date(t + i * 1000)));
    await seedNotification(bob.id, ws.id);
    const created = await Promise.all(mine);
    const expected = [...created].reverse().map((n) => n.id);

    const page1 = (await api(app, alice, 'GET', '/api/notifications?limit=2')).json();
    expect(page1.data.map((n: { id: string }) => n.id)).toEqual(expected.slice(0, 2));
    expect(page1.nextCursor).not.toBeNull();

    const page2 = (
      await api(
        app,
        alice,
        'GET',
        `/api/notifications?limit=2&cursor=${encodeURIComponent(page1.nextCursor)}`,
      )
    ).json();
    expect(page2.data.map((n: { id: string }) => n.id)).toEqual(expected.slice(2));
    expect(page2.nextCursor).toBeNull();
    expect(page2.data[0]).toMatchObject({
      type: 'TASK_ASSIGNED',
      workspaceId: ws.id,
      readAt: null,
      data: { taskKey: 'X-1', title: 'T', actor: null },
    });
    expect(page2.data[0]).not.toHaveProperty('userId');
  });

  it('filters unread and workspace, and counts unread', async () => {
    const alice = await registerUser(app);
    const ws1 = await seedWorkspace(alice);
    const ws2 = await seedWorkspace(alice);
    const a = await seedNotification(alice.id, ws1.id);
    await seedNotification(alice.id, ws1.id);
    await seedNotification(alice.id, ws2.id);
    await api(app, alice, 'POST', `/api/notifications/${a.id}/read`);

    const count = (qs = '') =>
      api(app, alice, 'GET', `/api/notifications/unread-count${qs}`).then(
        (r) => r.json().data.count as number,
      );
    expect(await count()).toBe(2);
    expect(await count(`?workspaceId=${ws1.id}`)).toBe(1);

    const unread = (await api(app, alice, 'GET', '/api/notifications?unread=true')).json();
    expect(unread.data).toHaveLength(2);
    expect(unread.data.every((n: { readAt: string | null }) => n.readAt === null)).toBe(true);

    const inWs2 = (await api(app, alice, 'GET', `/api/notifications?workspaceId=${ws2.id}`)).json();
    expect(inWs2.data).toHaveLength(1);
    expect(inWs2.data[0].workspaceId).toBe(ws2.id);
  });

  it('marks one as read idempotently and refuses other users notifications', async () => {
    const alice = await registerUser(app);
    const bob = await registerUser(app);
    const ws = await seedWorkspace(alice);
    const mine = await seedNotification(alice.id, ws.id);

    const stranger = await api(app, bob, 'POST', `/api/notifications/${mine.id}/read`);
    expect(stranger.statusCode).toBe(404);
    expect(
      await app.db.notification.findUniqueOrThrow({ where: { id: mine.id } }).then((n) => n.readAt),
    ).toBeNull();

    const first = await api(app, alice, 'POST', `/api/notifications/${mine.id}/read`);
    expect(first.statusCode).toBe(200);
    const readAt = first.json().data.readAt;
    expect(readAt).toEqual(expect.any(String));

    const again = await api(app, alice, 'POST', `/api/notifications/${mine.id}/read`);
    expect(again.statusCode).toBe(200);
    expect(again.json().data.readAt).toBe(readAt);

    expect(
      (await api(app, alice, 'POST', `/api/notifications/${randomUUID()}/read`)).statusCode,
    ).toBe(404);
  });

  it('read-all marks only mine (optionally one workspace) and returns 204', async () => {
    const alice = await registerUser(app);
    const bob = await registerUser(app);
    const ws1 = await seedWorkspace(alice);
    const ws2 = await seedWorkspace(alice);
    await seedNotification(alice.id, ws1.id);
    await seedNotification(alice.id, ws2.id);
    const bobsNotif = await seedNotification(bob.id, ws1.id);

    const scoped = await api(
      app,
      alice,
      'POST',
      `/api/notifications/read-all?workspaceId=${ws1.id}`,
    );
    expect(scoped.statusCode).toBe(204);
    expect(await countUnread(alice.id)).toBe(1);

    expect((await api(app, alice, 'POST', '/api/notifications/read-all')).statusCode).toBe(204);
    expect(await countUnread(alice.id)).toBe(0);
    expect(
      await app.db.notification
        .findUniqueOrThrow({ where: { id: bobsNotif.id } })
        .then((n) => n.readAt),
    ).toBeNull();
  });

  it('requires authentication', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/notifications' })).statusCode).toBe(401);
  });
});

const countUnread = (userId: string) =>
  app.db.notification.count({ where: { userId, readAt: null } });
