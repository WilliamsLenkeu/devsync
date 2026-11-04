import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { unauthenticated } from '../../errors';
import { randomToken, sha256 } from '../../lib/crypto';
import { ACCESS_COOKIE, REFRESH_COOKIE, signAccessToken } from '../../plugins/auth';

const DAY_MS = 86_400_000;

/** Create a refresh-token session row and set both cookies. */
export async function startSession(
  app: FastifyInstance,
  req: FastifyRequest,
  reply: FastifyReply,
  userId: string,
  familyId: string = randomUUID(),
) {
  const refresh = randomToken(48);
  const expiresAt = new Date(Date.now() + app.config.REFRESH_TOKEN_TTL_DAYS * DAY_MS);
  await app.db.session.create({
    data: {
      userId,
      familyId,
      refreshTokenHash: sha256(refresh),
      userAgent: req.headers['user-agent']?.slice(0, 255) ?? null,
      ip: req.ip,
      expiresAt,
    },
  });
  await setCookies(app, reply, userId, refresh, expiresAt);
}

async function setCookies(
  app: FastifyInstance,
  reply: FastifyReply,
  userId: string,
  refresh: string,
  refreshExpires: Date,
) {
  const base = { httpOnly: true, sameSite: 'lax', secure: app.config.COOKIE_SECURE } as const;
  reply.setCookie(ACCESS_COOKIE, await signAccessToken(app, userId), {
    ...base,
    path: '/',
    maxAge: app.config.ACCESS_TOKEN_TTL_SECONDS,
  });
  reply.setCookie(REFRESH_COOKIE, refresh, { ...base, path: '/api/auth', expires: refreshExpires });
}

export function clearCookies(reply: FastifyReply) {
  reply.clearCookie(ACCESS_COOKIE, { path: '/' });
  reply.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
}

/**
 * Rotate the refresh token. Presenting a token that was already rotated or revoked is treated as
 * theft: the whole family is revoked, forcing a fresh login on every device sharing that lineage.
 */
export async function rotateSession(
  app: FastifyInstance,
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const presented = req.cookies[REFRESH_COOKIE];
  if (!presented) throw unauthenticated('No refresh token');

  const session = await app.db.session.findUnique({
    where: { refreshTokenHash: sha256(presented) },
  });
  if (!session) throw unauthenticated('Invalid refresh token');

  if (session.rotatedAt || session.revokedAt) {
    await app.db.session.updateMany({
      where: { familyId: session.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    clearCookies(reply);
    throw unauthenticated('Refresh token reuse detected; please sign in again');
  }
  if (session.expiresAt <= new Date()) {
    clearCookies(reply);
    throw unauthenticated('Session expired');
  }

  // Atomic claim: only one concurrent request may rotate a given token.
  const claimed = await app.db.session.updateMany({
    where: { id: session.id, rotatedAt: null, revokedAt: null },
    data: { rotatedAt: new Date() },
  });
  if (claimed.count !== 1) throw unauthenticated('Invalid refresh token');

  await startSession(app, req, reply, session.userId, session.familyId);
  return session.userId;
}

export async function endSession(app: FastifyInstance, req: FastifyRequest, reply: FastifyReply) {
  const presented = req.cookies[REFRESH_COOKIE];
  if (presented) {
    const session = await app.db.session.findUnique({
      where: { refreshTokenHash: sha256(presented) },
    });
    if (session) {
      await app.db.session.updateMany({
        where: { familyId: session.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
  }
  clearCookies(reply);
}
