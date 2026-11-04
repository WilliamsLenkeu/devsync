import { z } from 'zod';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { projectStatusSchema } from '@devsync/shared';
import { recordActivity } from '../../activity';
import { authorize, authorizeProject } from '../../authz';
import { badRequest, notFound } from '../../errors';
import { dateTime, envelope, errorSchema, uuid } from '../../lib/schemas';
import { loadProject, listProjects, projectSchema } from './serializers';

const errors = {
  400: errorSchema,
  401: errorSchema,
  403: errorSchema,
  404: errorSchema,
  409: errorSchema,
};
const identifierSchema = z.string().regex(/^[A-Z][A-Z0-9]{1,5}$/);
const nameSchema = z.string().trim().min(1).max(80);
const descriptionSchema = z.string().trim().max(2000);
const projectMemberSchema = z.object({
  userId: uuid,
  createdAt: dateTime,
  user: z.object({
    id: uuid,
    name: z.string(),
    email: z.string(),
    avatarUrl: z.string().nullable(),
  }),
});
const projectMemberSelect = {
  userId: true,
  createdAt: true,
  user: { select: { id: true, name: true, email: true, avatarUrl: true } },
} as const;

const routes: FastifyPluginAsyncZod = async (app) => {
  const tags = ['Projects'];

  app.get(
    '/workspaces/:workspaceId/projects',
    {
      preHandler: app.requireUser,
      schema: {
        tags,
        summary: 'List projects of a workspace (optionally by status)',
        params: z.object({ workspaceId: uuid }),
        querystring: z.object({ status: projectStatusSchema.optional() }),
        response: { 200: envelope(z.array(projectSchema)), ...errors },
      },
    },
    async (req) => {
      const { workspaceId } = req.params;
      await authorize(app.db, req.principal, workspaceId, 'project:read');
      return { data: await listProjects(app.db, workspaceId, req.query.status) };
    },
  );

  app.post(
    '/workspaces/:workspaceId/projects',
    {
      preHandler: app.requireUser,
      schema: {
        tags,
        summary: 'Create a project (MEMBER+); the creator joins it',
        params: z.object({ workspaceId: uuid }),
        body: z.object({
          name: nameSchema,
          identifier: identifierSchema,
          description: descriptionSchema.optional(),
        }),
        response: { 201: envelope(projectSchema), ...errors },
      },
    },
    async (req, reply) => {
      const { workspaceId } = req.params;
      const { userId } = req.principal;
      const { name, identifier, description } = req.body;
      await authorize(app.db, req.principal, workspaceId, 'project:create');

      const project = await app.db.$transaction(async (tx) => {
        const p = await tx.project.create({
          data: {
            workspaceId,
            name,
            identifier,
            description,
            createdById: userId,
            members: { create: { userId } },
          },
        });
        await recordActivity(tx, req.principal, {
          workspaceId,
          projectId: p.id,
          type: 'PROJECT_CREATED',
          data: { name, identifier },
        });
        return p;
      });

      const out = await loadProject(app.db, project.id);
      app.events.publish({
        type: 'project.created',
        workspaceId,
        projectId: project.id,
        actorId: userId,
        data: { project: out },
      });
      return reply.code(201).send({ data: out });
    },
  );

  app.get(
    '/projects/:projectId',
    {
      preHandler: app.requireUser,
      schema: {
        tags,
        summary: 'Get a project',
        params: z.object({ projectId: uuid }),
        response: { 200: envelope(projectSchema), ...errors },
      },
    },
    async (req) => {
      const { projectId } = req.params;
      await authorizeProject(app.db, req.principal, projectId, 'project:read');
      return { data: await loadProject(app.db, projectId) };
    },
  );

  app.patch(
    '/projects/:projectId',
    {
      preHandler: app.requireUser,
      schema: {
        tags,
        summary: 'Update a project (ADMIN+); identifier is immutable',
        params: z.object({ projectId: uuid }),
        body: z
          .object({
            name: nameSchema.optional(),
            description: descriptionSchema.nullable().optional(),
            status: projectStatusSchema.optional(),
          })
          .strict(),
        response: { 200: envelope(projectSchema), ...errors },
      },
    },
    async (req) => {
      const { projectId } = req.params;
      const { userId } = req.principal;
      const body = req.body;
      const { project } = await authorizeProject(
        app.db,
        req.principal,
        projectId,
        'project:update',
      );

      const changed =
        (body.name !== undefined && body.name !== project.name) ||
        (body.description !== undefined && body.description !== project.description) ||
        (body.status !== undefined && body.status !== project.status);
      if (changed) {
        const archiving = body.status === 'ARCHIVED' && project.status !== 'ARCHIVED';
        await app.db.$transaction(async (tx) => {
          const row = await tx.project.update({ where: { id: projectId }, data: body });
          await recordActivity(tx, req.principal, {
            workspaceId: project.workspaceId,
            projectId,
            type: archiving ? 'PROJECT_ARCHIVED' : 'PROJECT_UPDATED',
            data: { name: row.name, identifier: row.identifier },
          });
        });
      }

      const out = await loadProject(app.db, projectId);
      if (changed) {
        app.events.publish({
          type: 'project.updated',
          workspaceId: project.workspaceId,
          projectId,
          actorId: userId,
          data: { project: out },
        });
      }
      return { data: out };
    },
  );

  app.get(
    '/projects/:projectId/members',
    {
      preHandler: app.requireUser,
      schema: {
        tags,
        summary: 'List project members',
        params: z.object({ projectId: uuid }),
        response: { 200: envelope(z.array(projectMemberSchema)), ...errors },
      },
    },
    async (req) => {
      const { projectId } = req.params;
      await authorizeProject(app.db, req.principal, projectId, 'project:read');
      const rows = await app.db.projectMember.findMany({
        where: { projectId },
        orderBy: { createdAt: 'asc' },
        select: projectMemberSelect,
      });
      return { data: rows };
    },
  );

  app.post(
    '/projects/:projectId/members',
    {
      preHandler: app.requireUser,
      schema: {
        tags,
        summary: 'Add a workspace member to a project (ADMIN+)',
        params: z.object({ projectId: uuid }),
        body: z.object({ userId: uuid }),
        response: { 201: envelope(projectMemberSchema), ...errors },
      },
    },
    async (req, reply) => {
      const { projectId } = req.params;
      const { userId } = req.body;
      const { project } = await authorizeProject(
        app.db,
        req.principal,
        projectId,
        'project:update',
      );
      const inWorkspace = await app.db.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: project.workspaceId, userId } },
        select: { userId: true },
      });
      if (!inWorkspace) throw badRequest('User is not a member of this workspace');
      const member = await app.db.projectMember.create({
        data: { projectId, userId },
        select: projectMemberSelect,
      });
      return reply.code(201).send({ data: member });
    },
  );

  app.delete(
    '/projects/:projectId/members/:userId',
    {
      preHandler: app.requireUser,
      schema: {
        tags,
        summary: 'Remove a member from a project (ADMIN+); unassigns their project tasks',
        params: z.object({ projectId: uuid, userId: uuid }),
        response: { 204: z.null(), ...errors },
      },
    },
    async (req, reply) => {
      const { projectId, userId } = req.params;
      await authorizeProject(app.db, req.principal, projectId, 'project:update');
      await app.db.$transaction(async (tx) => {
        const { count } = await tx.projectMember.deleteMany({ where: { projectId, userId } });
        if (count === 0) throw notFound('Project member');
        await tx.task.updateMany({
          where: { projectId, assigneeId: userId },
          data: { assigneeId: null },
        });
      });
      return reply.code(204).send(null);
    },
  );
};

export default routes;
