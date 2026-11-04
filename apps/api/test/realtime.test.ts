import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { App } from '../src/app';
import type { DomainEvent } from '../src/events';
import { buildTestApp, registerUser, type TestUser } from './helpers';

let app: App;
let base: string;
const WEB_ORIGIN = 'http://localhost:5173';

beforeAll(async () => {
  app = await buildTestApp();
  base = (await app.listen({ port: 0, host: '127.0.0.1' })).replace('http', 'ws');
});
afterAll(() => app.close());

interface Msg {
  type: string;
  code?: string;
  presence?: string[];
  event?: DomainEvent;
}

interface Conn {
  ws: WebSocket;
  inbox: Msg[];
}

/** Open a socket and buffer every server message from the start. Resolves once the upgrade succeeded. */
const connect = (cookie: string | undefined, origin = WEB_ORIGIN): Promise<Conn> =>
  new Promise((resolve, reject) => {
    const ws = new WebSocket(`${base}/api/ws`, {
      headers: { ...(cookie ? { cookie } : {}), origin },
    });
    const inbox: Msg[] = [];
    ws.addEventListener('message', (e) => inbox.push(JSON.parse(String(e.data)) as Msg));
    ws.addEventListener('open', () => resolve({ ws, inbox }));
    ws.addEventListener('error', () => reject(new Error('ws error')));
  });

const closeCode = (ws: WebSocket) =>
  new Promise<number>((resolve) => ws.addEventListener('close', (e) => resolve(e.code)));

const send = (conn: Conn, message: unknown) => conn.ws.send(JSON.stringify(message));

const waitFor = async (conn: Conn, pred: (m: Msg) => boolean, timeout = 3000) => {
  const deadline = Date.now() + timeout;
  for (;;) {
    const found = conn.inbox.find(pred);
    if (found) return found;
    if (Date.now() > deadline) throw new Error(`timed out; inbox=${JSON.stringify(conn.inbox)}`);
    await new Promise((r) => setTimeout(r, 10));
  }
};

const settle = () => new Promise((r) => setTimeout(r, 150));

const eventMsg = (id: string) => (m: Msg) => m.type === 'event' && m.event?.id === id;

const workspaceWith = async (members: [TestUser, 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'][]) => {
  const ws = await app.db.workspace.create({
    data: {
      name: 'RT',
      slug: `rt-${randomUUID()}`,
      members: { create: members.map(([u, role]) => ({ userId: u.id, role })) },
    },
  });
  return ws.id;
};

describe('realtime', () => {
  it('rejects missing, forged or cross-origin connections with 4401', async () => {
    const user = await registerUser(app);
    const noCookie = await connect(undefined);
    expect(await closeCode(noCookie.ws)).toBe(4401);

    const forged = await connect('ds_access=a.b.c');
    expect(await closeCode(forged.ws)).toBe(4401);

    const badOrigin = await connect(user.cookie, 'https://evil.example');
    expect(await closeCode(badOrigin.ws)).toBe(4401);
  });

  it('answers ping, rejects malformed messages without dropping the socket', async () => {
    const user = await registerUser(app);
    const conn = await connect(user.cookie);
    conn.ws.send('not json');
    await waitFor(conn, (m) => m.type === 'error' && m.code === 'VALIDATION_ERROR');
    send(conn, { type: 'subscribe', workspaceId: 'not-a-uuid' });
    send(conn, { type: 'explode' });
    await waitFor(conn, (m) => m.type === 'error' && m.code === 'VALIDATION_ERROR');
    send(conn, { type: 'ping' });
    await waitFor(conn, (m) => m.type === 'pong');
    conn.ws.close();
  });

  it('refuses subscriptions to non-member workspaces and never delivers their events', async () => {
    const outsider = await registerUser(app);
    const owner = await registerUser(app);
    const wsId = await workspaceWith([[owner, 'OWNER']]);
    const conn = await connect(outsider.cookie);
    send(conn, { type: 'subscribe', workspaceId: wsId });
    expect((await waitFor(conn, (m) => m.type === 'error')).code).toBe('NOT_FOUND');

    const ev = app.events.publish({ type: 'task.created', workspaceId: wsId, data: {} });
    await settle();
    expect(conn.inbox.some(eventMsg(ev.id))).toBe(false);
    conn.ws.close();
  });

  it('delivers events of subscribed workspaces only', async () => {
    const member = await registerUser(app);
    const wsA = await workspaceWith([[member, 'MEMBER']]);
    const wsB = await workspaceWith([[member, 'MEMBER']]);
    const conn = await connect(member.cookie);
    send(conn, { type: 'subscribe', workspaceId: wsA });
    await waitFor(conn, (m) => m.type === 'subscribed' && m.presence?.includes(member.id) === true);

    const inA = app.events.publish({ type: 'task.created', workspaceId: wsA, data: { n: 1 } });
    const inB = app.events.publish({ type: 'task.created', workspaceId: wsB, data: { n: 2 } });
    const got = await waitFor(conn, eventMsg(inA.id));
    expect(got.event?.data).toEqual({ n: 1 });
    await settle();
    expect(conn.inbox.some(eventMsg(inB.id))).toBe(false);

    send(conn, { type: 'unsubscribe', workspaceId: wsA });
    send(conn, { type: 'ping' }); // ordered after the unsubscribe: its pong proves it was processed
    await waitFor(conn, (m) => m.type === 'pong');
    const afterUnsub = app.events.publish({ type: 'task.created', workspaceId: wsA, data: {} });
    await settle();
    expect(conn.inbox.some(eventMsg(afterUnsub.id))).toBe(false);
    conn.ws.close();
  });

  it('delivers audience-targeted events to all sockets of those users only', async () => {
    const target = await registerUser(app);
    const other = await registerUser(app);
    const wsId = await workspaceWith([
      [target, 'MEMBER'],
      [other, 'MEMBER'],
    ]);
    const targetConn = await connect(target.cookie);
    const otherConn = await connect(other.cookie);
    // target is NOT subscribed to the workspace: audience still reaches it
    const ev = app.events.publish({
      type: 'notification.created',
      workspaceId: wsId,
      audience: [target.id],
      data: { id: 'n1' },
    });
    await waitFor(targetConn, eventMsg(ev.id));
    await settle();
    expect(otherConn.inbox.some(eventMsg(ev.id))).toBe(false);
    targetConn.ws.close();
    otherConn.ws.close();
  });

  it('publishes presence changes per user, not per socket', async () => {
    const owner = await registerUser(app);
    const member = await registerUser(app);
    const wsId = await workspaceWith([
      [owner, 'OWNER'],
      [member, 'MEMBER'],
    ]);
    const watcher = await connect(owner.cookie);
    send(watcher, { type: 'subscribe', workspaceId: wsId });
    await waitFor(watcher, (m) => m.type === 'subscribed');

    const first = await connect(member.cookie);
    send(first, { type: 'subscribe', workspaceId: wsId });
    const sub = await waitFor(first, (m) => m.type === 'subscribed');
    expect(sub.presence).toEqual([owner.id, member.id]);
    await waitFor(
      watcher,
      (m) =>
        m.type === 'event' &&
        m.event?.type === 'presence.changed' &&
        (m.event.data.userIds as string[]).includes(member.id),
    );

    const second = await connect(member.cookie);
    send(second, { type: 'subscribe', workspaceId: wsId });
    await waitFor(second, (m) => m.type === 'subscribed');
    first.ws.close();
    await settle();
    const before = watcher.inbox.length;
    second.ws.close();
    await settle();
    // only the member's last socket leaving is a presence change
    const changes = watcher.inbox
      .slice(before)
      .filter((m) => m.event?.type === 'presence.changed')
      .map((m) => m.event?.data.userIds);
    expect(changes).toEqual([[owner.id]]);
    watcher.ws.close();
  });

  it('stops delivering to a member removed from the workspace', async () => {
    const owner = await registerUser(app);
    const member = await registerUser(app);
    const wsId = await workspaceWith([
      [owner, 'OWNER'],
      [member, 'MEMBER'],
    ]);
    const conn = await connect(member.cookie);
    send(conn, { type: 'subscribe', workspaceId: wsId });
    await waitFor(conn, (m) => m.type === 'subscribed');

    await app.db.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId: wsId, userId: member.id } },
    });
    const removed = app.events.publish({
      type: 'member.removed',
      workspaceId: wsId,
      data: { userId: member.id },
    });
    const later = app.events.publish({ type: 'task.created', workspaceId: wsId, data: {} });
    await settle();
    expect(conn.inbox.some(eventMsg(removed.id))).toBe(false);
    expect(conn.inbox.some(eventMsg(later.id))).toBe(false);

    send(conn, { type: 'subscribe', workspaceId: wsId });
    expect((await waitFor(conn, (m) => m.type === 'error')).code).toBe('NOT_FOUND');
    conn.ws.close();
  });

  it('closes open sockets when the app shuts down', async () => {
    const own = await buildTestApp();
    const url = (await own.listen({ port: 0, host: '127.0.0.1' })).replace('http', 'ws');
    const user = await registerUser(own);
    const ws = new WebSocket(`${url}/api/ws`, {
      headers: { cookie: user.cookie, origin: WEB_ORIGIN },
    });
    await new Promise((r) => ws.addEventListener('open', r));
    const closed = closeCode(ws);
    await own.close();
    // close frame (1005) or abrupt drop (1006) depending on timing: only the closing matters
    await expect(closed).resolves.toBeTypeOf('number');
  });
});
