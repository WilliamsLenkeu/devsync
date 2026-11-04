import { z } from 'zod';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { apiTokenScopeSchema, hasRole, type ApiTokenScope } from '@devsync/shared';
import { authorize } from '../../authz';
import { forbidden, notFound } from '../../errors';
import { randomToken, sha256 } from '../../lib/crypto';
import { dateTime, envelope, errorSchema, uuid } from '../../lib/schemas';
import { API_TOKEN_PREFIX } from '../../plugins/auth';

/** Never includes the secret nor the hash: the secret only appears in the creation response. */
const apiTokenSchema = z.object({
  id: uuid,
  workspaceId: uuid,
  name: z.string(),
  prefix: z.string(),
  scopes: z.array(apiTokenScopeSchema),
  expiresAt: dateTime.nullable(),
  lastUsedAt: dateTime.nullable(),
  revokedAt: dateTime.nullable(),
  createdAt: dateTime,
});

const toApiToken = (t: {
  id: string;
  workspaceId: string;
  name: string;
  prefix: string;
  scopes: string[];
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}) => ({
  id: t.id,
  workspaceId: t.workspaceId,
  name: t.name,
  prefix: t.prefix,
  scopes: t.scopes as ApiTokenScope[],
  expiresAt: t.expiresAt,
  lastUsedAt: t.lastUsedAt,
  revokedAt: t.revokedAt,
  createdAt: t.createdAt,
});

const workspaceParams = z.object({ workspaceId: uuid });
const tokenParams = z.object({ tokenId: uuid });

const routes: FastifyPluginAsyncZod = async (app) => {
  const tags = ['API tokens'];

  app.get(
    '/workspaces/:workspaceId/api-tokens',
    {
      preHandler: app.requireUser,
      schema: {
        tags,
        summary: 'List my API tokens in a workspace (ADMIN+ sees all of them)',
        params: workspaceParams,
        response: {
          200: envelope(z.array(apiTokenSchema)),
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
        },
      },
    },
    async (req) => {
      const { workspaceId } = req.params;
      const role = await authorize(app.db, req.principal, workspaceId, 'token:manage');
      const tokens = await app.db.apiToken.findMany({
        where: {
          workspaceId,
          ...(hasRole(role, 'ADMIN') ? {} : { userId: req.principal.userId }),
        },
        orderBy: { createdAt: 'desc' },
      });
      return { data: tokens.map(toApiToken) };
    },
  );

  app.post(
    '/workspaces/:workspaceId/api-tokens',
    {
      preHandler: app.requireUser,
      schema: {
        tags,
        summary: 'Create an API token; the secret is returned once',
        params: workspaceParams,
        body: z.object({
          name: z.string().trim().min(1).max(80),
          scopes: z.array(apiTokenScopeSchema).min(1),
          expiresInDays: z.number().int().min(1).max(365).optional(),
        }),
        response: {
          201: envelope(z.object({ token: apiTokenSchema, secret: z.string() })),
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
        },
      },
    },
    async (req, reply) => {
      const { workspaceId } = req.params;
      const { name, scopes, expiresInDays } = req.body;
      await authorize(app.db, req.principal, workspaceId, 'token:manage');

      const secret = API_TOKEN_PREFIX + randomToken(32);
      const token = await app.db.apiToken.create({
        data: {
          userId: req.principal.userId,
          workspaceId,
          name,
          prefix: secret.slice(0, 8),
          tokenHash: sha256(secret),
          scopes: [...new Set(scopes)],
          expiresAt:
            expiresInDays === undefined ? null : new Date(Date.now() + expiresInDays * 86_400_000),
        },
      });
      return reply.code(201).send({ data: { token: toApiToken(token), secret } });
    },
  );

  app.delete(
    '/api-tokens/:tokenId',
    {
      preHandler: app.requireUser,
      schema: {
        tags,
        summary: 'Revoke an API token (owner or ADMIN+); idempotent',
        params: tokenParams,
        response: {
          204: z.null(),
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
        },
      },
    },
    async (req, reply) => {
      const token = await app.db.apiToken.findUnique({ where: { id: req.params.tokenId } });
      if (!token) throw notFound('API token');
      const role = await authorize(app.db, req.principal, token.workspaceId, 'token:manage');
      if (token.userId !== req.principal.userId && !hasRole(role, 'ADMIN')) throw forbidden();

      await app.db.apiToken.updateMany({
        where: { id: token.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return reply.code(204).send(null);
    },
  );
};

export default routes;
