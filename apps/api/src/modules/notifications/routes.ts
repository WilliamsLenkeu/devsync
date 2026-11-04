import { z } from 'zod';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { Notification } from '../../generated/prisma/client';
import { NotificationType } from '../../generated/prisma/enums';
import { notFound } from '../../errors';
import { afterCursor, pageQuery, paginate } from '../../lib/pagination';
import { dateTime, envelope, errorSchema, uuid } from '../../lib/schemas';
import { paginated } from '../activities/serializers';

const notificationSchema = z.object({
  id: uuid,
  type: z.enum(NotificationType),
  workspaceId: uuid,
  data: z.record(z.string(), z.unknown()),
  readAt: dateTime.nullable(),
  createdAt: dateTime,
});

const toDto = (n: Notification) => ({
  id: n.id,
  type: n.type,
  workspaceId: n.workspaceId,
  data: n.data as Record<string, unknown>,
  readAt: n.readAt,
  createdAt: n.createdAt,
});

const workspaceFilter = z.object({ workspaceId: uuid.optional() });

const routes: FastifyPluginAsyncZod = async (app) => {
  const tags = ['Notifications'];

  app.get(
    '/notifications',
    {
      preHandler: app.requireUser,
      schema: {
        tags,
        summary: 'My notifications across workspaces (newest first)',
        querystring: pageQuery.extend({
          unread: z.enum(['true', 'false']).optional(),
          workspaceId: uuid.optional(),
        }),
        response: { 200: paginated(notificationSchema), 401: errorSchema },
      },
    },
    async (req) => {
      const { limit, cursor, unread, workspaceId } = req.query;
      const rows = await app.db.notification.findMany({
        where: {
          AND: [
            {
              userId: req.principal.userId,
              workspaceId,
              readAt: unread === 'true' ? null : undefined,
            },
            afterCursor(cursor),
          ],
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
      });
      const page = paginate(rows, limit);
      return { data: page.data.map(toDto), nextCursor: page.nextCursor };
    },
  );

  app.get(
    '/notifications/unread-count',
    {
      preHandler: app.requireUser,
      schema: {
        tags,
        summary: 'Number of my unread notifications',
        querystring: workspaceFilter,
        response: { 200: envelope(z.object({ count: z.number().int() })), 401: errorSchema },
      },
    },
    async (req) => {
      const count = await app.db.notification.count({
        where: {
          userId: req.principal.userId,
          workspaceId: req.query.workspaceId,
          readAt: null,
        },
      });
      return { data: { count } };
    },
  );

  app.post(
    '/notifications/read-all',
    {
      preHandler: app.requireUser,
      schema: {
        tags,
        summary: 'Mark my notifications as read (optionally for one workspace)',
        querystring: workspaceFilter,
        response: { 204: z.null(), 401: errorSchema },
      },
    },
    async (req, reply) => {
      await app.db.notification.updateMany({
        where: { userId: req.principal.userId, workspaceId: req.query.workspaceId, readAt: null },
        data: { readAt: new Date() },
      });
      return reply.code(204).send(null);
    },
  );

  app.post(
    '/notifications/:id/read',
    {
      preHandler: app.requireUser,
      schema: {
        tags,
        summary: 'Mark one of my notifications as read (idempotent)',
        params: z.object({ id: uuid }),
        response: { 200: envelope(notificationSchema), 401: errorSchema, 404: errorSchema },
      },
    },
    async (req) => {
      const userId = req.principal.userId;
      const row = await app.db.notification.findFirst({ where: { id: req.params.id, userId } });
      if (!row) throw notFound('Notification');
      const updated = row.readAt
        ? row
        : await app.db.notification.update({ where: { id: row.id }, data: { readAt: new Date() } });
      return { data: toDto(updated) };
    },
  );
};

export default routes;
