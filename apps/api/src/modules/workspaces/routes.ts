import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { workspaceRoleSchema } from '@devsync/shared';
import { authorize } from '../../authz';
import { recordActivity } from '../../activity';
import type { Db } from '../../db';
import { conflict, forbidden, notFound } from '../../errors';
import type { EventBus } from '../../events';
import { randomToken, sha256 } from '../../lib/crypto';
import { envelope, errorSchema, uuid } from '../../lib/schemas';
import { createNotifications, publishNotifications } from '../../notify';
import type { Principal } from '../../types';
import {
  invitationInclude,
  invitationSchema,
  loadMember,
  loadWorkspace,
  memberInclude,
  memberSchema,
  toInvitation,
  toMember,
  toUserRef,
  toWorkspace,
  userRefSelect,
  workspaceSchema,
} from './serializers';

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const withMemberCount = { _count: { select: { members: true } } } as const;
const slugSchema = z
  .string()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const emailSchema = z.string().trim().toLowerCase().email().max(254);
const invitableRole = workspaceRoleSchema.exclude(['OWNER']);
const workspaceParams = z.object({ workspaceId: uuid });
const invitationParams = z.object({ invitationId: uuid });
const errors = {
  400: errorSchema,
  401: errorSchema,
  403: errorSchema,
  404: errorSchema,
  409: errorSchema,
};

const slugify = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50) || 'workspace';

/** Slug from the name; a short random suffix when it is already taken. */
const autoSlug = async (db: Db, name: string) => {
  const base = slugify(name);
  const taken = await db.workspace.count({ where: { slug: base } });
  return taken ? `${base}-${randomBytes(3).toString('hex')}` : base;
};

/** Invitation addressed to the current user (by email). */
const ownInvitation = async (db: Db, userId: string, invitationId: string) => {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
  const inv = await db.invitation.findUnique({
    where: { id: invitationId },
    include: invitationInclude,
  });
  if (!inv) throw notFound('Invitation');
  if (inv.email !== user.email) {
    throw forbidden('This invitation was sent to another email address');
  }
  return inv;
};

/** Accept inside one transaction; the updateMany guard makes a double accept fail with 409. */
const acceptInvitation = async (
  db: Db,
  events: EventBus,
  principal: Principal,
  invitationId: string,
) => {
  const inv = await ownInvitation(db, principal.userId, invitationId);
  if (inv.status !== 'PENDING') throw conflict('Invitation is no longer pending');
  if (inv.expiresAt <= new Date()) throw conflict('Invitation has expired');
  const actor = await db.user.findUniqueOrThrow({
    where: { id: principal.userId },
    select: userRefSelect.select,
  });
  await db.$transaction(async (tx) => {
    const claimed = await tx.invitation.updateMany({
      where: { id: inv.id, status: 'PENDING' },
      data: { status: 'ACCEPTED', respondedAt: new Date() },
    });
    if (claimed.count === 0) throw conflict('Invitation is no longer pending');
    await tx.workspaceMember.create({
      data: { workspaceId: inv.workspaceId, userId: principal.userId, role: inv.role },
    });
    await recordActivity(tx, principal, {
      workspaceId: inv.workspaceId,
      type: 'MEMBER_JOINED',
      data: { user: toUserRef(actor), role: inv.role },
    });
  });
  const member = await loadMember(db, inv.workspaceId, principal.userId);
  events.publish({
    type: 'member.joined',
    workspaceId: inv.workspaceId,
    actorId: principal.userId,
    data: { member },
  });
  return inv.workspaceId;
};

const routes: FastifyPluginAsyncZod = async (app) => {
  const tags = ['Workspaces'];
  const membersTags = ['Members'];
  const invitationsTags = ['Invitations'];

  app.get(
    '/workspaces',
    {
      preHandler: app.requireUser,
      schema: {
        tags,
        summary: 'List my workspaces',
        response: { 200: envelope(z.array(workspaceSchema)), ...errors },
      },
    },
    async (req) => {
      const rows = await app.db.workspaceMember.findMany({
        where: { userId: req.principal.userId },
        orderBy: { joinedAt: 'asc' },
        include: { workspace: { include: withMemberCount } },
      });
      return { data: rows.map((m) => toWorkspace(m.workspace, m.role)) };
    },
  );

  app.post(
    '/workspaces',
    {
      preHandler: app.requireUser,
      schema: {
        tags,
        summary: 'Create a workspace (caller becomes OWNER)',
        body: z.object({
          name: z.string().trim().min(1).max(80),
          slug: slugSchema.optional(),
          description: z.string().trim().max(500).optional(),
        }),
        response: { 201: envelope(workspaceSchema), ...errors },
      },
    },
    async (req, reply) => {
      const { userId } = req.principal;
      const { name, slug, description } = req.body;
      const { id } = await app.db.workspace.create({
        data: {
          name,
          slug: slug ?? (await autoSlug(app.db, name)),
          description,
          members: { create: { userId, role: 'OWNER' } },
        },
        select: { id: true },
      });
      return reply.code(201).send({ data: await loadWorkspace(app.db, id, userId) });
    },
  );

  app.get(
    '/workspaces/:workspaceId',
    {
      preHandler: app.requireUser,
      schema: {
        tags,
        summary: 'Get a workspace',
        params: workspaceParams,
        response: { 200: envelope(workspaceSchema), ...errors },
      },
    },
    async (req) => {
      const { workspaceId } = req.params;
      await authorize(app.db, req.principal, workspaceId, 'workspace:read');
      return { data: await loadWorkspace(app.db, workspaceId, req.principal.userId) };
    },
  );

  app.patch(
    '/workspaces/:workspaceId',
    {
      preHandler: app.requireUser,
      schema: {
        tags,
        summary: 'Update a workspace (ADMIN+)',
        params: workspaceParams,
        body: z.object({
          name: z.string().trim().min(1).max(80).optional(),
          description: z.string().trim().max(500).nullable().optional(),
        }),
        response: { 200: envelope(workspaceSchema), ...errors },
      },
    },
    async (req) => {
      const { workspaceId } = req.params;
      await authorize(app.db, req.principal, workspaceId, 'workspace:update');
      await app.db.workspace.update({ where: { id: workspaceId }, data: req.body });
      return { data: await loadWorkspace(app.db, workspaceId, req.principal.userId) };
    },
  );

  app.delete(
    '/workspaces/:workspaceId',
    {
      preHandler: app.requireUser,
      schema: {
        tags,
        summary: 'Delete a workspace (OWNER only)',
        params: workspaceParams,
        response: { 204: z.null(), ...errors },
      },
    },
    async (req, reply) => {
      const { workspaceId } = req.params;
      await authorize(app.db, req.principal, workspaceId, 'workspace:delete');
      await app.db.workspace.delete({ where: { id: workspaceId } });
      return reply.code(204).send(null);
    },
  );

  // ───────────── Members ─────────────

  app.get(
    '/workspaces/:workspaceId/members',
    {
      preHandler: app.requireUser,
      schema: {
        tags: membersTags,
        summary: 'List workspace members',
        params: workspaceParams,
        response: { 200: envelope(z.array(memberSchema)), ...errors },
      },
    },
    async (req) => {
      const { workspaceId } = req.params;
      await authorize(app.db, req.principal, workspaceId, 'workspace:read');
      const rows = await app.db.workspaceMember.findMany({
        where: { workspaceId },
        orderBy: { joinedAt: 'asc' },
        include: memberInclude,
      });
      return { data: rows.map(toMember) };
    },
  );

  app.patch(
    '/workspaces/:workspaceId/members/:userId',
    {
      preHandler: app.requireUser,
      schema: {
        tags: membersTags,
        summary: 'Change a member role (ADMIN+; only OWNER touches OWNER)',
        params: z.object({ workspaceId: uuid, userId: uuid }),
        body: z.object({ role: workspaceRoleSchema }),
        response: { 200: envelope(memberSchema), ...errors },
      },
    },
    async (req) => {
      const { workspaceId, userId: targetId } = req.params;
      const { role } = req.body;
      const actorRole = await authorize(app.db, req.principal, workspaceId, 'member:set-role');

      const changed = await app.db.$transaction(async (tx) => {
        const target = await tx.workspaceMember.findUnique({
          where: { workspaceId_userId: { workspaceId, userId: targetId } },
          select: { role: true, user: userRefSelect },
        });
        if (!target) throw notFound('Member');
        if ((target.role === 'OWNER' || role === 'OWNER') && actorRole !== 'OWNER') {
          throw forbidden('Only an OWNER can grant or change the OWNER role');
        }
        if (target.role === role) return false;
        if (
          target.role === 'OWNER' &&
          (await tx.workspaceMember.count({ where: { workspaceId, role: 'OWNER' } })) <= 1
        ) {
          throw conflict('A workspace must keep at least one OWNER');
        }
        await tx.workspaceMember.update({
          where: { workspaceId_userId: { workspaceId, userId: targetId } },
          data: { role },
        });
        await recordActivity(tx, req.principal, {
          workspaceId,
          type: 'MEMBER_ROLE_CHANGED',
          data: { user: toUserRef(target.user), from: target.role, to: role },
        });
        return true;
      });

      if (changed) {
        app.events.publish({
          type: 'member.role_changed',
          workspaceId,
          actorId: req.principal.userId,
          data: { userId: targetId, role },
        });
      }
      return { data: await loadMember(app.db, workspaceId, targetId) };
    },
  );

  app.delete(
    '/workspaces/:workspaceId/members/:userId',
    {
      preHandler: app.requireUser,
      schema: {
        tags: membersTags,
        summary: 'Remove a member (ADMIN+, or leave yourself)',
        params: z.object({ workspaceId: uuid, userId: uuid }),
        response: { 204: z.null(), ...errors },
      },
    },
    async (req, reply) => {
      const { workspaceId, userId: targetId } = req.params;
      const isSelf = targetId === req.principal.userId;
      const actorRole = await authorize(
        app.db,
        req.principal,
        workspaceId,
        isSelf ? 'workspace:read' : 'member:remove',
      );

      await app.db.$transaction(async (tx) => {
        const target = await tx.workspaceMember.findUnique({
          where: { workspaceId_userId: { workspaceId, userId: targetId } },
          select: { role: true, user: userRefSelect },
        });
        if (!target) throw notFound('Member');
        if (target.role === 'OWNER') {
          if (actorRole !== 'OWNER') throw forbidden('Only an OWNER can remove an OWNER');
          if ((await tx.workspaceMember.count({ where: { workspaceId, role: 'OWNER' } })) <= 1) {
            throw conflict('A workspace must keep at least one OWNER');
          }
        }
        await tx.projectMember.deleteMany({
          where: { userId: targetId, project: { workspaceId } },
        });
        await tx.task.updateMany({
          where: { assigneeId: targetId, project: { workspaceId } },
          data: { assigneeId: null },
        });
        await tx.workspaceMember.delete({
          where: { workspaceId_userId: { workspaceId, userId: targetId } },
        });
        await recordActivity(tx, req.principal, {
          workspaceId,
          type: 'MEMBER_REMOVED',
          data: { user: toUserRef(target.user) },
        });
      });

      app.events.publish({
        type: 'member.removed',
        workspaceId,
        actorId: req.principal.userId,
        data: { userId: targetId },
      });
      return reply.code(204).send(null);
    },
  );

  // ───────────── Invitations ─────────────

  app.get(
    '/workspaces/:workspaceId/invitations',
    {
      preHandler: app.requireUser,
      schema: {
        tags: invitationsTags,
        summary: 'List pending invitations of a workspace (ADMIN+)',
        params: workspaceParams,
        response: { 200: envelope(z.array(invitationSchema)), ...errors },
      },
    },
    async (req) => {
      const { workspaceId } = req.params;
      await authorize(app.db, req.principal, workspaceId, 'member:invite');
      const rows = await app.db.invitation.findMany({
        where: { workspaceId, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        include: invitationInclude,
      });
      return { data: rows.map(toInvitation) };
    },
  );

  app.post(
    '/workspaces/:workspaceId/invitations',
    {
      preHandler: app.requireUser,
      schema: {
        tags: invitationsTags,
        summary: 'Invite an email to a workspace (ADMIN+); returns the token once',
        params: workspaceParams,
        body: z.object({ email: emailSchema, role: invitableRole }),
        response: {
          201: envelope(z.object({ invitation: invitationSchema, token: z.string() })),
          ...errors,
        },
      },
    },
    async (req, reply) => {
      const { workspaceId } = req.params;
      const { email, role } = req.body;
      await authorize(app.db, req.principal, workspaceId, 'member:invite');
      const now = new Date();

      const invitee = await app.db.user.findUnique({ where: { email }, select: { id: true } });
      if (
        invitee &&
        (await app.db.workspaceMember.findUnique({
          where: { workspaceId_userId: { workspaceId, userId: invitee.id } },
          select: { userId: true },
        }))
      ) {
        throw conflict('This user is already a member of the workspace');
      }
      if (
        await app.db.invitation.findFirst({
          where: { workspaceId, email, status: 'PENDING', expiresAt: { gt: now } },
          select: { id: true },
        })
      ) {
        throw conflict('A pending invitation already exists for this email');
      }

      const token = randomToken();
      const { invitation, notifications } = await app.db.$transaction(async (tx) => {
        const row = await tx.invitation.create({
          data: {
            workspaceId,
            email,
            role,
            tokenHash: sha256(token),
            invitedById: req.principal.userId,
            expiresAt: new Date(now.getTime() + INVITATION_TTL_MS),
          },
          include: invitationInclude,
        });
        const notifications = invitee
          ? await createNotifications(tx, [
              {
                userId: invitee.id,
                workspaceId,
                type: 'WORKSPACE_INVITATION',
                data: {
                  invitationId: row.id,
                  workspaceName: row.workspace.name,
                  role,
                  invitedBy: toUserRef(row.invitedBy),
                },
              },
            ])
          : [];
        return { invitation: row, notifications };
      });
      publishNotifications(app.events, notifications);

      return reply.code(201).send({ data: { invitation: toInvitation(invitation), token } });
    },
  );

  app.delete(
    '/workspaces/:workspaceId/invitations/:invitationId',
    {
      preHandler: app.requireUser,
      schema: {
        tags: invitationsTags,
        summary: 'Revoke a pending invitation (ADMIN+)',
        params: z.object({ workspaceId: uuid, invitationId: uuid }),
        response: { 204: z.null(), ...errors },
      },
    },
    async (req, reply) => {
      const { workspaceId, invitationId } = req.params;
      await authorize(app.db, req.principal, workspaceId, 'member:invite');
      const inv = await app.db.invitation.findFirst({
        where: { id: invitationId, workspaceId },
        select: { id: true },
      });
      if (!inv) throw notFound('Invitation');
      const { count } = await app.db.invitation.updateMany({
        where: { id: invitationId, status: 'PENDING' },
        data: { status: 'REVOKED', respondedAt: new Date() },
      });
      if (count === 0) throw conflict('Invitation is no longer pending');
      return reply.code(204).send(null);
    },
  );

  app.get(
    '/invitations',
    {
      preHandler: app.requireUser,
      schema: {
        tags: invitationsTags,
        summary: 'Pending, non-expired invitations addressed to my email',
        response: { 200: envelope(z.array(invitationSchema)), ...errors },
      },
    },
    async (req) => {
      const user = await app.db.user.findUniqueOrThrow({
        where: { id: req.principal.userId },
        select: { email: true },
      });
      const rows = await app.db.invitation.findMany({
        where: { email: user.email, status: 'PENDING', expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
        include: invitationInclude,
      });
      return { data: rows.map(toInvitation) };
    },
  );

  app.post(
    '/invitations/accept',
    {
      preHandler: app.requireUser,
      schema: {
        tags: invitationsTags,
        summary: 'Accept an invitation by its token; returns the workspace',
        body: z.object({ token: z.string().min(1).max(200) }),
        response: { 200: envelope(workspaceSchema), ...errors },
      },
    },
    async (req) => {
      const inv = await app.db.invitation.findUnique({
        where: { tokenHash: sha256(req.body.token) },
        select: { id: true },
      });
      if (!inv) throw notFound('Invitation');
      const workspaceId = await acceptInvitation(app.db, app.events, req.principal, inv.id);
      return { data: await loadWorkspace(app.db, workspaceId, req.principal.userId) };
    },
  );

  app.post(
    '/invitations/:invitationId/accept',
    {
      preHandler: app.requireUser,
      schema: {
        tags: invitationsTags,
        summary: 'Accept an invitation addressed to my email; returns the workspace',
        params: invitationParams,
        response: { 200: envelope(workspaceSchema), ...errors },
      },
    },
    async (req) => {
      const workspaceId = await acceptInvitation(
        app.db,
        app.events,
        req.principal,
        req.params.invitationId,
      );
      return { data: await loadWorkspace(app.db, workspaceId, req.principal.userId) };
    },
  );

  app.post(
    '/invitations/:invitationId/decline',
    {
      preHandler: app.requireUser,
      schema: {
        tags: invitationsTags,
        summary: 'Decline an invitation addressed to my email',
        params: invitationParams,
        response: { 200: envelope(invitationSchema), ...errors },
      },
    },
    async (req) => {
      const { invitationId } = req.params;
      const inv = await ownInvitation(app.db, req.principal.userId, invitationId);
      if (inv.status !== 'PENDING') throw conflict('Invitation is no longer pending');
      const { count } = await app.db.invitation.updateMany({
        where: { id: invitationId, status: 'PENDING' },
        data: { status: 'DECLINED', respondedAt: new Date() },
      });
      if (count === 0) throw conflict('Invitation is no longer pending');
      const updated = await app.db.invitation.findUniqueOrThrow({
        where: { id: invitationId },
        include: invitationInclude,
      });
      return { data: toInvitation(updated) };
    },
  );
};

export default routes;
