import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { App } from '../src/app';
import { sha256 } from '../src/lib/crypto';
import { api, buildTestApp, registerUser, type TestUser } from './helpers';

let app: App;
beforeAll(async () => {
  app = await buildTestApp();
});
afterAll(() => app.close());

type Role = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

const workspaceWith = async (members: [TestUser, Role][]) => {
  const ws = await app.db.workspace.create({
    data: {
      name: 'WS',
      slug: `ws-${randomUUID()}`,
      members: { create: members.map(([u, role]) => ({ userId: u.id, role })) },
    },
  });
  return ws.id;
};

const createToken = (user: TestUser, workspaceId: string, body: object = {}) =>
  api(app, user, 'POST', `/api/workspaces/${workspaceId}/api-tokens`, {
    name: 'bot',
    scopes: ['workspaces:read'],
    ...body,
  });

const asAgent = (
  secret: string,
  url: string,
  method: 'GET' | 'POST' | 'PATCH' = 'GET',
  payload?: object,
) => app.inject({ method, url, headers: { authorization: `Bearer ${secret}` }, payload });

describe('api tokens', () => {
  it('returns the secret once, stores only its hash and prefix', async () => {
    const owner = await registerUser(app);
    const wsId = await workspaceWith([[owner, 'OWNER']]);
    const created = await createToken(owner, wsId, { scopes: ['tasks:read', 'tasks:read'] });
    expect(created.statusCode).toBe(201);
    const { token, secret } = created.json().data as {
      token: Record<string, unknown>;
      secret: string;
    };

    expect(secret).toMatch(/^dsk_[A-Za-z0-9_-]{43}$/);
    expect(token.prefix).toBe(secret.slice(0, 8));
    expect(token.scopes).toEqual(['tasks:read']);
    expect(token).not.toHaveProperty('tokenHash');

    const row = await app.db.apiToken.findUniqueOrThrow({ where: { id: token.id as string } });
    expect(row.tokenHash).toBe(sha256(secret));
    expect(JSON.stringify(row)).not.toContain(secret);

    const list = await api(app, owner, 'GET', `/api/workspaces/${wsId}/api-tokens`);
    expect(list.statusCode).toBe(200);
    expect(list.body).not.toContain(secret);
    expect(list.body).not.toContain(row.tokenHash);
    const revoked = await api(app, owner, 'DELETE', `/api/api-tokens/${row.id}`);
    expect(revoked.body).toBe('');
  });

  it('validates scopes and expiry', async () => {
    const owner = await registerUser(app);
    const wsId = await workspaceWith([[owner, 'OWNER']]);
    const badBodies = [
      { scopes: ['workspace:delete'] },
      { scopes: [] },
      { scopes: ['tasks:read'], expiresInDays: 0 },
      { scopes: ['tasks:read'], expiresInDays: 366 },
    ];
    for (const body of badBodies) {
      expect((await createToken(owner, wsId, body)).statusCode).toBe(400);
    }
  });

  it('gives expiry from expiresInDays and lets only members create tokens', async () => {
    const owner = await registerUser(app);
    const viewer = await registerUser(app);
    const stranger = await registerUser(app);
    const wsId = await workspaceWith([
      [owner, 'OWNER'],
      [viewer, 'VIEWER'],
    ]);
    const ok = await createToken(owner, wsId, { expiresInDays: 7 });
    const expiresAt = new Date(ok.json().data.token.expiresAt as string).getTime();
    expect(expiresAt - Date.now()).toBeGreaterThan(6 * 86_400_000);
    expect(expiresAt - Date.now()).toBeLessThanOrEqual(7 * 86_400_000);

    expect((await createToken(viewer, wsId)).statusCode).toBe(403);
    expect((await createToken(stranger, wsId)).statusCode).toBe(404);
    expect((await api(app, stranger, 'GET', `/api/workspaces/${wsId}/api-tokens`)).statusCode).toBe(
      404,
    );
  });

  it('only lets the owner or an ADMIN see/revoke tokens', async () => {
    const owner = await registerUser(app);
    const member = await registerUser(app);
    const admin = await registerUser(app);
    const wsId = await workspaceWith([
      [owner, 'OWNER'],
      [member, 'MEMBER'],
      [admin, 'ADMIN'],
    ]);
    const { token } = (await createToken(owner, wsId)).json().data;

    expect(
      (await api(app, member, 'GET', `/api/workspaces/${wsId}/api-tokens`)).json().data,
    ).toEqual([]);
    expect(
      (await api(app, admin, 'GET', `/api/workspaces/${wsId}/api-tokens`)).json().data,
    ).toHaveLength(1);
    expect((await api(app, member, 'DELETE', `/api/api-tokens/${token.id}`)).statusCode).toBe(403);
    expect((await api(app, admin, 'DELETE', `/api/api-tokens/${token.id}`)).statusCode).toBe(204);
  });

  it('authenticates tokens only when valid, unexpired, unrevoked', async () => {
    const owner = await registerUser(app);
    const wsId = await workspaceWith([[owner, 'OWNER']]);
    const { token, secret } = (await createToken(owner, wsId)).json().data;
    const url = '/api/agent/workspaces';

    expect((await asAgent(secret, url)).statusCode).toBe(200);
    expect((await asAgent(`dsk_${randomUUID().replaceAll('-', '')}`, url)).statusCode).toBe(401);
    expect((await asAgent(`${secret}x`, url)).statusCode).toBe(401);
    expect((await asAgent('nope', url)).statusCode).toBe(401);
    expect((await app.inject({ method: 'GET', url })).statusCode).toBe(401);

    await app.db.apiToken.update({
      where: { id: token.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect((await asAgent(secret, url)).statusCode).toBe(401);
    await app.db.apiToken.update({ where: { id: token.id }, data: { expiresAt: null } });
    expect((await asAgent(secret, url)).statusCode).toBe(200);

    expect((await api(app, owner, 'DELETE', `/api/api-tokens/${token.id}`)).statusCode).toBe(204);
    expect((await asAgent(secret, url)).statusCode).toBe(401);
    // idempotent: second revoke keeps the original revokedAt
    const first = (await app.db.apiToken.findUniqueOrThrow({ where: { id: token.id } })).revokedAt;
    expect((await api(app, owner, 'DELETE', `/api/api-tokens/${token.id}`)).statusCode).toBe(204);
    const second = (await app.db.apiToken.findUniqueOrThrow({ where: { id: token.id } })).revokedAt;
    expect(second?.getTime()).toBe(first?.getTime());
  });

  it('rejects tokens on web routes and records lastUsedAt', async () => {
    const owner = await registerUser(app);
    const wsId = await workspaceWith([[owner, 'OWNER']]);
    const { token, secret } = (await createToken(owner, wsId)).json().data;

    const web = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${secret}` },
    });
    expect(web.statusCode).toBe(401);
    expect(
      (await app.db.apiToken.findUniqueOrThrow({ where: { id: token.id } })).lastUsedAt,
    ).toBeNull();

    expect((await asAgent(secret, '/api/agent/workspaces')).statusCode).toBe(200);
    const row = await app.db.apiToken.findUniqueOrThrow({ where: { id: token.id } });
    expect(row.lastUsedAt).not.toBeNull();
  });

  it('keeps a token bound to its own workspace', async () => {
    const owner = await registerUser(app);
    const wsA = await workspaceWith([[owner, 'OWNER']]);
    const wsB = await workspaceWith([[owner, 'OWNER']]);
    const { secret } = (await createToken(owner, wsA)).json().data;

    const list = await asAgent(secret, '/api/agent/workspaces');
    expect(list.json().data.map((w: { id: string }) => w.id)).toEqual([wsA]);
    const project = await app.db.project.create({
      data: { workspaceId: wsB, name: 'P', identifier: 'OTH', createdById: owner.id },
    });
    expect((await asAgent(secret, `/api/agent/projects/${project.id}/tasks`)).statusCode).toBe(404);
  });

  it('loses rights when the owner is demoted or removed', async () => {
    const owner = await registerUser(app);
    const wsId = await workspaceWith([[owner, 'OWNER']]);
    const project = await app.db.project.create({
      data: { workspaceId: wsId, name: 'P', identifier: 'DEM', createdById: owner.id },
    });
    const { secret } = (
      await createToken(owner, wsId, { scopes: ['tasks:read', 'tasks:write'] })
    ).json().data;
    const writeUrl = `/api/agent/projects/${project.id}/tasks`;
    const body = { title: 'Created by agent' };
    expect((await asAgent(secret, writeUrl, 'POST', body)).statusCode).toBe(201);

    await app.db.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId: wsId, userId: owner.id } },
      data: { role: 'VIEWER' },
    });
    expect((await asAgent(secret, writeUrl, 'POST', body)).statusCode).toBe(403);

    await app.db.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId: wsId, userId: owner.id } },
    });
    expect((await asAgent(secret, writeUrl, 'POST', body)).statusCode).toBe(404);
  });
});
