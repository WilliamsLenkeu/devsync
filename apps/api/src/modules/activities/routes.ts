import { z } from 'zod';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { authorize, authorizeProject } from '../../authz';
import { envelope, errorSchema, uuid } from '../../lib/schemas';
import { pageQuery } from '../../lib/pagination';
import { taskInclude, taskSchema, toTaskDto } from '../tasks/schemas';
import { activitySchema, listActivities, paginated } from './serializers';

const routes: FastifyPluginAsyncZod = async (app) => {
  const tags = ['Activity'];
  const errors = { 401: errorSchema, 403: errorSchema, 404: errorSchema };

  app.get(
    '/workspaces/:workspaceId/activity',
    {
      preHandler: app.requireUser,
      schema: {
        tags,
        summary: 'Workspace activity feed (optionally filtered by project or task)',
        params: z.object({ workspaceId: uuid }),
        querystring: pageQuery.extend({ projectId: uuid.optional(), taskId: uuid.optional() }),
        response: { 200: paginated(activitySchema), ...errors },
      },
    },
    async (req) => {
      const { workspaceId } = req.params;
      await authorize(app.db, req.principal, workspaceId, 'activity:read');
      const { limit, cursor, projectId, taskId } = req.query;
      return listActivities(app.db, { workspaceId, projectId, taskId }, { limit, cursor });
    },
  );

  app.get(
    '/projects/:projectId/activity',
    {
      preHandler: app.requireUser,
      schema: {
        tags,
        summary: 'Project activity feed',
        params: z.object({ projectId: uuid }),
        querystring: pageQuery,
        response: { 200: paginated(activitySchema), ...errors },
      },
    },
    async (req) => {
      const { project } = await authorizeProject(
        app.db,
        req.principal,
        req.params.projectId,
        'activity:read',
      );
      return listActivities(
        app.db,
        { workspaceId: project.workspaceId, projectId: project.id },
        req.query,
      );
    },
  );

  app.get(
    '/workspaces/:workspaceId/dashboard',
    {
      preHandler: app.requireUser,
      schema: {
        tags,
        summary: 'Workspace dashboard: totals, my open tasks, project progress, recent activity',
        params: z.object({ workspaceId: uuid }),
        response: {
          200: envelope(
            z.object({
              totals: z.object({
                total: z.number().int(),
                completed: z.number().int(),
                inProgress: z.number().int(),
                overdue: z.number().int(),
              }),
              assignedToMe: z.object({ count: z.number().int(), tasks: z.array(taskSchema) }),
              projectProgress: z.array(
                z.object({
                  projectId: uuid,
                  name: z.string(),
                  identifier: z.string(),
                  total: z.number().int(),
                  done: z.number().int(),
                }),
              ),
              recentActivity: z.array(activitySchema),
            }),
          ),
          ...errors,
        },
      },
    },
    async (req) => {
      const { workspaceId } = req.params;
      const userId = req.principal.userId;
      await authorize(app.db, req.principal, workspaceId, 'workspace:read');

      // Dashboard figures only cover ACTIVE projects.
      const active = { project: { workspaceId, status: 'ACTIVE' as const } };
      const open = { ...active, status: { not: 'DONE' as const } };
      const mine = { ...open, assigneeId: userId };

      const [byProjectStatus, overdue, assignedCount, assigned, projects, recent] =
        await Promise.all([
          app.db.task.groupBy({
            by: ['projectId', 'status'],
            where: active,
            _count: { _all: true },
          }),
          app.db.task.count({ where: { ...open, dueDate: { lt: new Date() } } }),
          app.db.task.count({ where: mine }),
          app.db.task.findMany({
            where: mine,
            orderBy: [
              { dueDate: { sort: 'asc', nulls: 'last' } },
              { priority: 'desc' },
              { id: 'asc' },
            ],
            take: 10,
            include: taskInclude,
          }),
          app.db.project.findMany({
            where: { workspaceId, status: 'ACTIVE' },
            orderBy: { name: 'asc' },
            select: { id: true, name: true, identifier: true },
          }),
          listActivities(app.db, { workspaceId }, { limit: 10 }),
        ]);

      const totals = { total: 0, completed: 0, inProgress: 0, overdue };
      const perProject = new Map<string, { total: number; done: number }>();
      for (const g of byProjectStatus) {
        const n = g._count._all;
        const p = perProject.get(g.projectId) ?? { total: 0, done: 0 };
        p.total += n;
        totals.total += n;
        if (g.status === 'DONE') {
          p.done += n;
          totals.completed += n;
        }
        if (g.status === 'IN_PROGRESS') totals.inProgress += n;
        perProject.set(g.projectId, p);
      }

      return {
        data: {
          totals,
          assignedToMe: { count: assignedCount, tasks: assigned.map(toTaskDto) },
          projectProgress: projects.map((p) => ({
            projectId: p.id,
            name: p.name,
            identifier: p.identifier,
            total: perProject.get(p.id)?.total ?? 0,
            done: perProject.get(p.id)?.done ?? 0,
          })),
          recentActivity: recent.data,
        },
      };
    },
  );
};

export default routes;
