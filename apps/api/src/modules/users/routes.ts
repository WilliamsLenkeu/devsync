import argon2 from 'argon2';
import { z } from 'zod';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { badRequest } from '../../errors';
import { envelope, errorSchema, userSchema } from '../../lib/schemas';
import { passwordSchema } from '../auth/routes';
import { startSession } from '../auth/sessions';

const routes: FastifyPluginAsyncZod = async (app) => {
  const tags = ['Users'];
  const preHandler = app.requireUser;

  app.patch(
    '/users/me',
    {
      preHandler,
      schema: {
        tags,
        summary: 'Update profile',
        body: z.object({
          name: z.string().trim().min(1).max(80).optional(),
          avatarUrl: z.string().url().max(500).nullable().optional(),
        }),
        response: { 200: envelope(z.object({ user: userSchema })), 401: errorSchema },
      },
    },
    async (req) => {
      const user = await app.db.user.update({
        where: { id: req.principal.userId },
        data: req.body,
        select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true },
      });
      return { data: { user } };
    },
  );

  app.post(
    '/users/me/password',
    {
      config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
      preHandler,
      schema: {
        tags,
        summary: 'Change password; revokes every session and starts a fresh one for this device',
        body: z.object({
          currentPassword: z.string().min(1).max(128),
          newPassword: passwordSchema,
        }),
        response: { 204: z.null(), 400: errorSchema, 401: errorSchema },
      },
    },
    async (req, reply) => {
      const { userId } = req.principal;
      const user = await app.db.user.findUniqueOrThrow({ where: { id: userId } });
      if (!(await argon2.verify(user.passwordHash, req.body.currentPassword))) {
        throw badRequest('Current password is incorrect');
      }
      await app.db.$transaction([
        app.db.user.update({
          where: { id: userId },
          data: { passwordHash: await argon2.hash(req.body.newPassword) },
        }),
        app.db.session.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
      ]);
      await startSession(app, req, reply, userId);
      return reply.code(204).send(null);
    },
  );
};

export default routes;
