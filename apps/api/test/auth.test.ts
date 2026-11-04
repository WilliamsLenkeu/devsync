import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { App } from '../src/app';
import { api, buildTestApp, cookiesFrom, registerUser } from './helpers';

let app: App;
beforeAll(async () => {
  app = await buildTestApp();
});
afterAll(() => app.close());

const login = (email: string, password: string) =>
  app.inject({ method: 'POST', url: '/api/auth/login', payload: { email, password } });

describe('auth', () => {
  it('registers, hashes the password with argon2 and never returns it', async () => {
    const user = await registerUser(app);
    const row = await app.db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(row.passwordHash).toMatch(/^\$argon2id\$/);
    const me = await api(app, user, 'GET', '/api/auth/me');
    expect(me.statusCode).toBe(200);
    expect(JSON.stringify(me.json())).not.toContain('passwordHash');
  });

  it('rejects duplicate emails, weak passwords and bad credentials', async () => {
    const user = await registerUser(app);
    const dup = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: user.email, name: 'X', password: 'another-password' },
    });
    expect(dup.statusCode).toBe(409);
    const weak = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: `${randomUUID()}@t.dev`, name: 'X', password: 'short' },
    });
    expect(weak.statusCode).toBe(400);
    expect((await login(user.email, 'wrong-password')).statusCode).toBe(401);
    expect((await login('nobody@test.dev', 'whatever-123')).statusCode).toBe(401);
    expect((await login(user.email.toUpperCase(), 'correct-horse-battery')).statusCode).toBe(200);
  });

  it('protects routes without a cookie', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/auth/me' })).statusCode).toBe(401);
    const forged = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie: 'ds_access=abc.def.ghi' },
    });
    expect(forged.statusCode).toBe(401);
  });

  it('rotates refresh tokens and revokes the family when an old one is reused', async () => {
    const user = await registerUser(app);
    const refresh = (cookie: string) =>
      app.inject({ method: 'POST', url: '/api/auth/refresh', headers: { cookie } });
    const first = user.cookie;
    const second = await refresh(first);
    expect(second.statusCode).toBe(200);
    const rotated = cookiesFrom(second);
    expect(rotated).not.toBe(first);

    // replaying the already-rotated token = theft signal
    expect((await refresh(first)).statusCode).toBe(401);
    // …which also kills the legitimate descendant
    expect((await refresh(rotated)).statusCode).toBe(401);
  });

  it('logout revokes the session', async () => {
    const user = await registerUser(app);
    expect((await api(app, user, 'POST', '/api/auth/logout')).statusCode).toBe(204);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/auth/refresh',
          headers: { cookie: user.cookie },
        })
      ).statusCode,
    ).toBe(401);
  });

  it('changes password: old one stops working, other sessions are revoked', async () => {
    const user = await registerUser(app);
    const other = await login(user.email, 'correct-horse-battery');
    const wrong = await api(app, user, 'POST', '/api/users/me/password', {
      currentPassword: 'nope-nope',
      newPassword: 'brand-new-password',
    });
    expect(wrong.statusCode).toBe(400);
    const ok = await api(app, user, 'POST', '/api/users/me/password', {
      currentPassword: 'correct-horse-battery',
      newPassword: 'brand-new-password',
    });
    expect(ok.statusCode).toBe(204);
    expect((await login(user.email, 'correct-horse-battery')).statusCode).toBe(401);
    expect((await login(user.email, 'brand-new-password')).statusCode).toBe(200);
    const stale = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      headers: { cookie: cookiesFrom(other) },
    });
    expect(stale.statusCode).toBe(401);
  });

  it('rejects cross-origin unsafe requests', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { origin: 'https://evil.example' },
      payload: { email: 'a@b.dev', password: 'x' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('rate-limits auth endpoints when enabled', async () => {
    const limited = await buildTestApp({ RATE_LIMIT_ENABLED: 'true' });
    const codes: number[] = [];
    for (let i = 0; i < 12; i++) {
      codes.push(
        (
          await limited.inject({
            method: 'POST',
            url: '/api/auth/login',
            payload: { email: 'a@b.dev', password: 'x' },
          })
        ).statusCode,
      );
    }
    expect(codes).toContain(429);
    await limited.close();
  });
});
