import type { FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { taskStatusSchema } from '@devsync/shared';
import { authorize, authorizeProject } from '../../authz';
import { unauthenticated } from '../../errors';
import { pageQuery } from '../../lib/pagination';
import { envelope, errorSchema, uuid } from '../../lib/schemas';
import { activitySchema, listActivities, paginated } from '../activities/serializers';
import { listProjects, projectSchema } from '../projects/serializers';
import {
  addComment,
  assignTask,
  createTask,
  getTask,
  listTasks,
  moveTask,
  updateTask,
  type Ctx,
} from '../tasks/service';
import {
  commentSchema,
  createCommentBody,
  createTaskBody,
  taskFiltersQuery,
  taskSchema,
  updateTaskBody,
} from '../tasks/schemas';
import { loadWorkspace, workspaceSchema } from '../workspaces/serializers';

const errors = { 401: errorSchema, 403: errorSchema, 404: errorSchema };
const idParams = z.object({ projectId: uuid });
const taskParams = z.object({ taskId: uuid });

/** Every agent route is bound to the workspace of its token. */
const workspaceOf = (req: FastifyRequest) => {
  const token = req.principal.apiToken;
  if (!token) throw unauthenticated('Missing API token');
  return token.workspaceId;
};

const audit = (req: FastifyRequest, action: string, data: Record<string, unknown> = {}) =>
  req.log.info({ tokenId: req.principal.apiToken?.id, action, ...data }, 'agent action');

const routes: FastifyPluginAsyncZod = async (app) => {
  const tags = ['Agent'];
  const ctxOf = (req: FastifyRequest): Ctx => ({ app, principal: req.principal });

  app.get(
    '/agent/workspaces',
    {
      preHandler: app.requireToken,
      schema: {
        tags,
        summary: 'Workspace bound to the API token',
        response: { 200: envelope(z.array(workspaceSchema)), ...errors },
      },
    },
    async (req) => {
      const workspaceId = workspaceOf(req);
      await authorize(app.db, req.principal, workspaceId, 'workspace:read');
      audit(req, 'workspaces.list');
      return { data: [await loadWorkspace(app.db, workspaceId, req.principal.userId)] };
    },
  );

  app.get(
    '/agent/projects',
    {
      preHandler: app.requireToken,
      schema: {
        tags,
        summary: 'Projects of the token workspace',
        response: { 200: envelope(z.array(projectSchema)), ...errors },
      },
    },
    async (req) => {
      const workspaceId = workspaceOf(req);
      await authorize(app.db, req.principal, workspaceId, 'project:read');
      audit(req, 'projects.list');
      return { data: await listProjects(app.db, workspaceId) };
    },
  );

  app.get(
    '/agent/projects/:projectId/tasks',
    {
      preHandler: app.requireToken,
      schema: {
        tags,
        summary: 'List tasks of a project',
        params: idParams,
        querystring: taskFiltersQuery,
        response: { 200: envelope(z.array(taskSchema)), ...errors },
      },
    },
    async (req) => {
      const { projectId } = req.params;
      audit(req, 'tasks.list', { projectId });
      return { data: await listTasks(ctxOf(req), projectId, req.query) };
    },
  );

  app.get(
    '/agent/tasks/:taskId',
    {
      preHandler: app.requireToken,
      schema: {
        tags,
        summary: 'Get a task',
        params: taskParams,
        response: { 200: envelope(taskSchema), ...errors },
      },
    },
    async (req) => {
      audit(req, 'tasks.get', { taskId: req.params.taskId });
      return { data: await getTask(ctxOf(req), req.params.taskId) };
    },
  );

  app.post(
    '/agent/projects/:projectId/tasks',
    {
      preHandler: app.requireToken,
      schema: {
        tags,
        summary: 'Create a task in a project',
        params: idParams,
        body: createTaskBody,
        response: { 201: envelope(taskSchema), ...errors },
      },
    },
    async (req, reply) => {
      const task = await createTask(ctxOf(req), req.params.projectId, req.body);
      audit(req, 'tasks.create', { taskId: task.id });
      return reply.code(201).send({ data: task });
    },
  );

  app.patch(
    '/agent/tasks/:taskId',
    {
      preHandler: app.requireToken,
      schema: {
        tags,
        summary: 'Update a task; `status` moves it to the end of its new column',
        params: taskParams,
        body: updateTaskBody.extend({ status: taskStatusSchema.optional() }),
        response: { 200: envelope(taskSchema), ...errors },
      },
    },
    async (req) => {
      const { taskId } = req.params;
      const { status, ...fields } = req.body;
      const ctx = ctxOf(req);
      let task = Object.keys(fields).length ? await updateTask(ctx, taskId, fields) : undefined;
      if (status) task = await moveTask(ctx, taskId, { status });
      audit(req, 'tasks.update', { taskId, fields: Object.keys(req.body), status });
      return { data: task ?? (await getTask(ctx, taskId)) };
    },
  );

  app.post(
    '/agent/tasks/:taskId/assign',
    {
      preHandler: app.requireToken,
      schema: {
        tags,
        summary: 'Assign a task (null to unassign)',
        params: taskParams,
        body: z.object({ assigneeId: uuid.nullable() }),
        response: { 200: envelope(taskSchema), ...errors },
      },
    },
    async (req) => {
      const { taskId } = req.params;
      const task = await assignTask(ctxOf(req), taskId, req.body.assigneeId);
      audit(req, 'tasks.assign', { taskId, assigneeId: req.body.assigneeId });
      return { data: task };
    },
  );

  app.post(
    '/agent/tasks/:taskId/comments',
    {
      preHandler: app.requireToken,
      schema: {
        tags,
        summary: 'Comment on a task',
        params: taskParams,
        body: createCommentBody,
        response: { 201: envelope(commentSchema), ...errors },
      },
    },
    async (req, reply) => {
      const { taskId } = req.params;
      const comment = await addComment(ctxOf(req), taskId, req.body.body);
      audit(req, 'comments.create', { taskId, commentId: comment.id });
      return reply.code(201).send({ data: comment });
    },
  );

  app.get(
    '/agent/projects/:projectId/activity',
    {
      preHandler: app.requireToken,
      schema: {
        tags,
        summary: 'Activity feed of a project (newest first)',
        params: idParams,
        querystring: pageQuery,
        response: { 200: paginated(activitySchema), ...errors },
      },
    },
    async (req) => {
      const { projectId } = req.params;
      await authorizeProject(app.db, req.principal, projectId, 'activity:read');
      audit(req, 'activity.list', { projectId });
      return listActivities(app.db, { projectId }, req.query);
    },
  );
};

export default routes;
