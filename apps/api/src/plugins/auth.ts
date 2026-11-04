import { jwtVerify, SignJWT } from 'jose';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { apiTokenScopeSchema } from '@devsync/shared';
import { unauthenticated } from '../errors';
import { sha256 } from '../lib/crypto';

export const ACCESS_COOKIE = 'ds_access';
export const REFRESH_COOKIE = 'ds_refresh';
export const API_TOKEN_PREFIX = 'dsk_';

const secretKey = (secret: string) => new TextEncoder().encode(secret);

export const signAccessToken = (app: FastifyInstance, userId: string) =>
  new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${app.config.ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(secretKey(app.config.JWT_ACCESS_SECRET));

/** Verify an access JWT (cookie or WebSocket upgrade). Returns the user id or null. */
export async function verifyAccessToken(
  app: FastifyInstance,
  token: string,
): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(app.config.JWT_ACCESS_SECRET), {
      algorithms: ['HS256'],
    });
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

const TOUCH_INTERVAL_MS = 60_000;

export async function authPlugin(app: FastifyInstance) {
  app.decorateRequest('principal', null as never);

  app.decorate('requireUser', async (req: FastifyRequest) => {
    const token = req.cookies[ACCESS_COOKIE];
    const userId = token ? await verifyAccessToken(app, token) : null;
    if (!userId) throw unauthenticated();
    req.principal = { userId };
  });

  app.decorate('requireToken', async (req: FastifyRequest) => {
    const header = req.headers.authorization;
    const secret = header?.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!secret.startsWith(API_TOKEN_PREFIX)) throw unauthenticated('Missing API token');

    const row = await app.db.apiToken.findUnique({ where: { tokenHash: sha256(secret) } });
    const now = new Date();
    if (!row || row.revokedAt || (row.expiresAt && row.expiresAt <= now)) {
      throw unauthenticated('Invalid, expired or revoked API token');
    }
    if (!row.lastUsedAt || now.getTime() - row.lastUsedAt.getTime() > TOUCH_INTERVAL_MS) {
      await app.db.apiToken.update({ where: { id: row.id }, data: { lastUsedAt: now } });
    }
    req.principal = {
      userId: row.userId,
      apiToken: {
        id: row.id,
        workspaceId: row.workspaceId,
        scopes: row.scopes.flatMap((s) => {
          const parsed = apiTokenScopeSchema.safeParse(s);
          return parsed.success ? [parsed.data] : [];
        }),
      },
    };
  });
}
