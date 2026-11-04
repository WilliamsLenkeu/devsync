import { randomUUID } from 'node:crypto';
import type { LightMyRequestResponse } from 'fastify';
import { buildApp, type App } from '../src/app';
import { loadConfig, type Config } from '../src/config';

export const buildTestApp = (overrides: Partial<Record<keyof Config, string>> = {}): Promise<App> =>
  buildApp({ config: loadConfig({ ...process.env, ...overrides }) });

/** Extract `name=value` pairs from Set-Cookie headers into a Cookie request header. */
export const cookiesFrom = (res: LightMyRequestResponse): string =>
  res.cookies.map((c) => `${c.name}=${c.value}`).join('; ');

export interface TestUser {
  id: string;
  email: string;
  name: string;
  /** Cookie header to send on authenticated requests. */
  cookie: string;
}

/** Register a fresh user (unique email) and return its session cookie. */
export async function registerUser(app: App, name = 'Test User'): Promise<TestUser> {
  const email = `u-${randomUUID()}@test.dev`;
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, name, password: 'correct-horse-battery' },
  });
  if (res.statusCode !== 201) throw new Error(`register failed: ${res.statusCode} ${res.body}`);
  return { id: res.json().data.user.id, email, name, cookie: cookiesFrom(res) };
}

/** Shorthand for authenticated JSON requests: `await api(app, user, 'POST', '/api/workspaces', {...})`. */
export const api = (
  app: App,
  user: Pick<TestUser, 'cookie'>,
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  url: string,
  payload?: unknown,
) =>
  app.inject({
    method,
    url,
    headers: { cookie: user.cookie },
    ...(payload === undefined ? {} : { payload: payload as object }),
  });
