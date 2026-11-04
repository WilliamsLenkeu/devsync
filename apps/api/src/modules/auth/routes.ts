import argon2 from 'argon2';
import { z } from 'zod';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { conflict, notFound, unauthenticated } from '../../errors';
import { envelope, errorSchema, userSchema } from '../../lib/schemas';
import { endSession, rotateSession, startSession } from './sessions';

export const passwordSchema = z.string().min(8).max(128);
const emailSchema = z.string().trim().toLowerCase().email().max(254);

const authLimit = (max: number) => ({ rateLimit: { max, timeWindow: '1 minute' } });
const userOnly = {
  select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true },
} as const;

// Verified against when the email is unknown, so login timing does not reveal account existence.
const dummyHash = argon2.hash('devsync-dummy-password');

const routes: FastifyPluginAsyncZod = async (app) => {
  const tags = ['Auth'];

  app.post(
    '/auth/register',
    {
      config: authLimit(5),
      schema: {
        tags,
        summary: 'Create an account and start a session (sets HTTP-only cookies)',
        body: z.object({
          email: emailSchema,
          name: z.string().trim().min(1).max(80),
          password: passwordSchema,
        }),
        response: { 201: envelope(z.object({ user: userSchema })), 409: errorSchema },
      },
    },
    async (req, reply) => {
      const { email, name, password } = req.body;
      if (await app.db.user.findUnique({ where: { email }, select: { id: true } })) {
        throw conflict('An account with this email already exists');
      }
      const user = await app.db.user.create({
        data: { email, name, passwordHash: await argon2.hash(password) },
        ...userOnly,
      });
      await startSession(app, req, reply, user.id);
      return reply.code(201).send({ data: { user } });
    },
  );

  app.post(
    '/auth/login',
    {
      config: authLimit(10),
      schema: {
        tags,
        summary: 'Sign in (sets HTTP-only cookies)',
        body: z.object({ email: emailSchema, password: z.string().min(1).max(128) }),
        response: { 200: envelope(z.object({ user: userSchema })), 401: errorSchema },
      },
    },
    async (req, reply) => {
      const found = await app.db.user.findUnique({ where: { email: req.body.email } });
      const ok = await argon2.verify(found?.passwordHash ?? (await dummyHash), req.body.password);
      if (!found || !ok) throw unauthenticated('Invalid email or password');
      await startSession(app, req, reply, found.id);
      const { passwordHash: _omit, ...user } = found;
      return { data: { user } };
    },
  );

  app.post(
    '/auth/refresh',
    {
      config: authLimit(30),
      schema: {
        tags,
        summary: 'Rotate the refresh token and issue a new access token',
        response: { 200: envelope(z.object({ user: userSchema })), 401: errorSchema },
      },
    },
    async (req, reply) => {
      const userId = await rotateSession(app, req, reply);
      const user = await app.db.user.findUnique({ where: { id: userId }, ...userOnly });
      if (!user) throw unauthenticated();
      return { data: { user } };
    },
  );

  app.post(
    '/auth/logout',
    { schema: { tags, summary: 'Revoke the current session family', response: { 204: z.null() } } },
    async (req, reply) => {
      await endSession(app, req, reply);
      return reply.code(204).send(null);
    },
  );

  app.get(
    '/auth/me',
    {
      preHandler: app.requireUser,
      schema: {
        tags,
        summary: 'Current user',
        response: { 200: envelope(z.object({ user: userSchema })), 401: errorSchema },
      },
    },
    async (req) => {
      const user = await app.db.user.findUnique({
        where: { id: req.principal.userId },
        ...userOnly,
      });
      if (!user) throw notFound('User');
      return { data: { user } };
    },
  );
};

export default routes;
