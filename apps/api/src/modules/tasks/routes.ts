import { z } from 'zod';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { envelope, errorSchema, uuid } from '../../lib/schemas';
import { pageQuery } from '../../lib/pagination';
import type { Principal } from '../../types';
import * as attachments from './attachments';
import {
  activitySchema,
  attachmentSchema,
  commentSchema,
  createCommentBody,
  createTaskBody,
  moveTaskBody,
  taskFiltersQuery,
  taskSchema,
  updateTaskBody,
} from './schemas';
import * as service from './service';

const routes: FastifyPluginAsyncZod = async (app) => {
  const tags = ['Tasks'];
  const ctx = (principal: Principal) => ({ app, principal });
  const errors = { 400: errorSchema, 401: errorSchema, 403: errorSchema, 404: errorSchema };

  app.get(
    '/projects/:projectId/tasks',
    {
      preHandler: app.requireUser,
      schema: {
        tags,
        summary: 'List the tasks of a project (board, max 500)',
        params: z.object({ projectId: uuid }),
        querystring: taskFiltersQuery,
        response: { 200: envelope(z.array(taskSchema)), ...errors },
      },
    },
    async (req) => ({
      data: await service.listTasks(ctx(req.principal), req.params.projectId, req.query),
    }),
  );

  app.post(
    '/projects/:projectId/tasks',
    {
      preHandler: app.requireUser,
      schema: {
        tags,
        summary: 'Create a task in a project',
        params: z.object({ projectId: uuid }),
        body: createTaskBody,
        response: { 201: envelope(taskSchema), ...errors, 409: errorSchema },
      },
    },
    async (req, reply) =>
      reply.code(201).send({
        data: await service.createTask(ctx(req.principal), req.params.projectId, req.body),
      }),
  );

  app.get(
    '/tasks/:taskId',
    {
      preHandler: app.requireUser,
      schema: {
        tags,
        summary: 'Get a task',
        params: z.object({ taskId: uuid }),
        response: { 200: envelope(taskSchema), ...errors },
      },
    },
    async (req) => ({ data: await service.getTask(ctx(req.principal), req.params.taskId) }),
  );

  app.patch(
    '/tasks/:taskId',
    {
      preHandler: app.requireUser,
      schema: {
        tags,
        summary: 'Update task fields (labels are replaced as a whole)',
        params: z.object({ taskId: uuid }),
        body: updateTaskBody,
        response: { 200: envelope(taskSchema), ...errors, 409: errorSchema },
      },
    },
    async (req) => ({
      data: await service.updateTask(ctx(req.principal), req.params.taskId, req.body),
    }),
  );

  app.post(
    '/tasks/:taskId/move',
    {
      preHandler: app.requireUser,
      schema: {
        tags,
        summary: 'Move a task to a Kanban column, before another task (or to the end)',
        params: z.object({ taskId: uuid }),
        body: moveTaskBody,
        response: { 200: envelope(taskSchema), ...errors, 409: errorSchema },
      },
    },
    async (req) => ({
      data: await service.moveTask(ctx(req.principal), req.params.taskId, req.body),
    }),
  );

  app.delete(
    '/tasks/:taskId',
    {
      preHandler: app.requireUser,
      schema: {
        tags,
        summary: 'Delete a task',
        params: z.object({ taskId: uuid }),
        response: { 204: z.null(), ...errors },
      },
    },
    async (req, reply) => {
      await service.deleteTask(ctx(req.principal), req.params.taskId);
      return reply.code(204).send(null);
    },
  );

  app.get(
    '/tasks/:taskId/activity',
    {
      preHandler: app.requireUser,
      schema: {
        tags,
        summary: 'Activity of a task (paginated, newest first)',
        params: z.object({ taskId: uuid }),
        querystring: pageQuery,
        response: {
          200: z.object({ data: z.array(activitySchema), nextCursor: z.string().nullable() }),
          ...errors,
        },
      },
    },
    async (req) => service.listTaskActivity(ctx(req.principal), req.params.taskId, req.query),
  );

  app.get(
    '/tasks/:taskId/comments',
    {
      preHandler: app.requireUser,
      schema: {
        tags,
        summary: 'List the comments of a task (chronological)',
        params: z.object({ taskId: uuid }),
        response: { 200: envelope(z.array(commentSchema)), ...errors },
      },
    },
    async (req) => ({ data: await service.listComments(ctx(req.principal), req.params.taskId) }),
  );

  app.post(
    '/tasks/:taskId/comments',
    {
      preHandler: app.requireUser,
      schema: {
        tags,
        summary: 'Comment a task (@[Name](user:<uuid>) mentions notify members)',
        params: z.object({ taskId: uuid }),
        body: createCommentBody,
        response: { 201: envelope(commentSchema), ...errors, 409: errorSchema },
      },
    },
    async (req, reply) =>
      reply.code(201).send({
        data: await service.addComment(ctx(req.principal), req.params.taskId, req.body.body),
      }),
  );

  app.delete(
    '/comments/:commentId',
    {
      preHandler: app.requireUser,
      schema: {
        tags,
        summary: 'Delete a comment (author or admin)',
        params: z.object({ commentId: uuid }),
        response: { 204: z.null(), ...errors },
      },
    },
    async (req, reply) => {
      await service.deleteComment(ctx(req.principal), req.params.commentId);
      return reply.code(204).send(null);
    },
  );

  app.get(
    '/tasks/:taskId/attachments',
    {
      preHandler: app.requireUser,
      schema: {
        tags,
        summary: 'List task attachments',
        params: z.object({ taskId: uuid }),
        response: { 200: envelope(z.array(attachmentSchema)), ...errors },
      },
    },
    async (req) => ({
      data: await attachments.listAttachments(ctx(req.principal), req.params.taskId),
    }),
  );

  app.post(
    '/tasks/:taskId/attachments',
    {
      preHandler: app.requireUser,
      schema: {
        tags,
        summary: 'Upload a task attachment (multipart field "file"; optional commentId)',
        params: z.object({ taskId: uuid }),
        response: { 201: envelope(attachmentSchema), ...errors },
      },
    },
    async (req, reply) => {
      const file = await req.file();
      if (!file) {
        const { badRequest } = await import('../../errors');
        throw badRequest('Missing multipart file field "file"');
      }
      const commentIdRaw = (file.fields as Record<string, { value?: string } | undefined>)
        ?.commentId?.value;
      const data = await attachments.createAttachment(ctx(req.principal), req.params.taskId, {
        filename: file.filename,
        contentType: file.mimetype,
        body: file.file,
        commentId: commentIdRaw || null,
      });
      return reply.code(201).send({ data });
    },
  );

  app.get(
    '/attachments/:attachmentId/download',
    {
      preHandler: app.requireUser,
      schema: {
        tags,
        summary: 'Download an attachment',
        params: z.object({ attachmentId: uuid }),
        // Binary stream — no JSON response schema
      },
    },
    async (req, reply) => {
      const file = await attachments.openAttachmentDownload(
        ctx(req.principal),
        req.params.attachmentId,
      );
      reply
        .header('Content-Type', file.contentType)
        .header('Content-Length', String(file.byteSize))
        .header(
          'Content-Disposition',
          `attachment; filename="${file.filename.replace(/"/g, '')}"`,
        );
      return reply.send(file.stream);
    },
  );

  app.delete(
    '/attachments/:attachmentId',
    {
      preHandler: app.requireUser,
      schema: {
        tags,
        summary: 'Delete an attachment',
        params: z.object({ attachmentId: uuid }),
        response: { 204: z.null(), ...errors },
      },
    },
    async (req, reply) => {
      await attachments.deleteAttachment(ctx(req.principal), req.params.attachmentId);
      return reply.code(204).send(null);
    },
  );
};

export default routes;
