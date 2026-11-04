import type { FastifyInstance } from 'fastify';
import { hasRole, TASK_PRIORITIES, type ProjectStatus, type TaskStatus } from '@devsync/shared';
import { authorize, authorizeProject, authorizeTask } from '../../authz';
import { recordActivity } from '../../activity';
import type { Prisma } from '../../generated/prisma/client';
import { badRequest, conflict, forbidden, notFound } from '../../errors';
import type { NewEvent } from '../../events';
import { createNotifications, publishNotifications, type NotificationInput } from '../../notify';
import { afterCursor, paginate } from '../../lib/pagination';
import type { Principal } from '../../types';
import {
  activityInclude,
  commentInclude,
  taskInclude,
  toActivityDto,
  toCommentDto,
  toTaskDto,
  toUserRef,
  userRefSelect,
  type CreateTaskInput,
  type Task,
  type TaskFilters,
  type TaskRow,
  type UpdateTaskInput,
  type Comment,
} from './schemas';

export interface Ctx {
  app: Pick<FastifyInstance, 'db' | 'events' | 'log'>;
  principal: Principal;
}

type Tx = Prisma.TransactionClient;
type Change = { from: Prisma.InputJsonValue | null; to: Prisma.InputJsonValue | null };

const STEP = 1024;
const EPS = 1e-6;
const DEFAULT_LABEL_COLOR = '#6366f1';
const MENTION_RE = /@\[[^\]]*\]\(user:([0-9a-fA-F-]{36})\)/g;
const KEY_RE = /^([A-Z][A-Z0-9]{1,5})-(\d{1,9})$/i;

/** Position between `prev` and `next` (absent = column edge), or null when the gap is exhausted and the column must be rebalanced. */
export function placeBetween(prev: number | undefined, next: number | undefined): number | null {
  if (next === undefined) return (prev ?? 0) + STEP;
  if (prev === undefined) return next - STEP;
  return next - prev < EPS ? null : prev + (next - prev) / 2;
}

/** Reassign evenly spaced positions to an ordered list of task ids. */
export const rebalanceColumn = (ids: string[]) =>
  ids.map((id, i) => ({ id, position: (i + 1) * STEP }));

/** Trim, drop case-insensitive duplicates (first wins), default the colour. */
export function normalizeLabels(labels: { name: string; color?: string }[]) {
  const seen = new Set<string>();
  return labels.flatMap(({ name, color }) => {
    const trimmed = name.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) return [];
    seen.add(key);
    return [{ name: trimmed, color: color ?? DEFAULT_LABEL_COLOR }];
  });
}

interface Effects {
  events: NewEvent[];
  notifications: NotificationInput[];
}

/** Run a mutation in one transaction; publish events and notifications only after commit. */
async function mutate<T>(ctx: Ctx, fn: (tx: Tx, fx: Effects) => Promise<T>): Promise<T> {
  const fx: Effects = { events: [], notifications: [] };
  const { result, rows } = await ctx.app.db.$transaction(async (tx) => {
    const result = await fn(tx, fx);
    return { result, rows: await createNotifications(tx, fx.notifications) };
  });
  for (const event of fx.events) ctx.app.events.publish(event);
  publishNotifications(ctx.app.events, rows);
  return result;
}

const keyOf = (t: TaskRow) => `${t.project.identifier}-${t.number}`;
const iso = (d: Date | null) => d?.toISOString() ?? null;
const names = (t: TaskRow) => t.labels.map((l) => l.name).sort();

const assertWritable = (project: { status: ProjectStatus }) => {
  if (project.status === 'ARCHIVED') throw conflict('Project is archived');
};

async function resolveAssignee(tx: Tx, projectId: string, assigneeId: string | null) {
  if (!assigneeId) return null;
  const member = await tx.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: assigneeId } },
    select: { user: { select: userRefSelect } },
  });
  if (!member) throw badRequest('Assignee must be a member of the project');
  return toUserRef(member.user);
}

/** Activity + TASK_ASSIGNED notification (never to the actor) + task.assigned event. */
async function recordAssignment(
  tx: Tx,
  ctx: Ctx,
  fx: Effects,
  task: TaskRow,
  assignee: ReturnType<typeof toUserRef> | null,
) {
  const { workspaceId } = task.project;
  const taskKey = keyOf(task);
  await recordActivity(tx, ctx.principal, {
    workspaceId,
    projectId: task.projectId,
    taskId: task.id,
    type: 'TASK_ASSIGNED',
    data: { taskKey, title: task.title, assignee },
  });
  if (assignee && assignee.id !== ctx.principal.userId) {
    const actor = await tx.user.findUniqueOrThrow({
      where: { id: ctx.principal.userId },
      select: userRefSelect,
    });
    fx.notifications.push({
      userId: assignee.id,
      workspaceId,
      type: 'TASK_ASSIGNED',
      data: {
        taskId: task.id,
        taskKey,
        title: task.title,
        projectId: task.projectId,
        actor: toUserRef(actor),
      },
    });
  }
  fx.events.push({
    type: 'task.assigned',
    workspaceId,
    projectId: task.projectId,
    actorId: ctx.principal.userId,
    data: { task: toTaskDto(task) },
  });
}

const searchClauses = (q: string, identifier: string): Prisma.TaskWhereInput[] => {
  const m = KEY_RE.exec(q);
  const keyMatch = m && m[1]?.toUpperCase() === identifier ? [{ number: Number(m[2]) }] : [];
  return [
    { title: { contains: q, mode: 'insensitive' } },
    { description: { contains: q, mode: 'insensitive' } },
    ...keyMatch,
  ];
};

export async function listTasks(
  ctx: Ctx,
  projectId: string,
  filters: TaskFilters,
): Promise<Task[]> {
  const { project } = await authorizeProject(ctx.app.db, ctx.principal, projectId, 'task:read');
  const where: Prisma.TaskWhereInput = {
    projectId,
    status: filters.status,
    priority: filters.priority,
    assigneeId:
      filters.assigneeId === 'me'
        ? ctx.principal.userId
        : filters.assigneeId === 'none'
          ? null
          : filters.assigneeId,
    labels: filters.label
      ? { some: { name: { equals: filters.label, mode: 'insensitive' } } }
      : undefined,
    OR: filters.q ? searchClauses(filters.q, project.identifier) : undefined,
  };
  const field = filters.sort === 'priority' ? 'position' : filters.sort;
  // ponytail: cap applied before the in-memory priority sort (SQL sorts the enum alphabetically); fine at 500 rows.
  const rows = await ctx.app.db.task.findMany({
    where,
    include: taskInclude,
    orderBy: [{ [field]: filters.order } as Prisma.TaskOrderByWithRelationInput, { id: 'asc' }],
    take: 500,
  });
  if (filters.sort === 'priority') {
    const sign = filters.order === 'asc' ? 1 : -1;
    rows.sort(
      (a, b) => sign * (TASK_PRIORITIES.indexOf(a.priority) - TASK_PRIORITIES.indexOf(b.priority)),
    );
  }
  return rows.map(toTaskDto);
}

export async function getTask(ctx: Ctx, taskId: string): Promise<Task> {
  await authorizeTask(ctx.app.db, ctx.principal, taskId, 'task:read');
  return toTaskDto(
    await ctx.app.db.task.findUniqueOrThrow({ where: { id: taskId }, include: taskInclude }),
  );
}

export async function createTask(
  ctx: Ctx,
  projectId: string,
  input: CreateTaskInput,
): Promise<Task> {
  const { project } = await authorizeProject(ctx.app.db, ctx.principal, projectId, 'task:write');
  assertWritable(project);
  return mutate(ctx, async (tx, fx) => {
    // Locks the project row for the rest of the transaction: serialises creations (distinct numbers) and column appends.
    const { taskCounter } = await tx.project.update({
      where: { id: projectId },
      data: { taskCounter: { increment: 1 } },
      select: { taskCounter: true },
    });
    const last = await tx.task.aggregate({
      where: { projectId, status: input.status },
      _max: { position: true },
    });
    const assignee = await resolveAssignee(tx, projectId, input.assigneeId ?? null);
    const row = await tx.task.create({
      data: {
        projectId,
        number: taskCounter,
        title: input.title,
        description: input.description ?? null,
        status: input.status,
        priority: input.priority,
        position: (last._max.position ?? 0) + STEP,
        assigneeId: assignee?.id ?? null,
        reporterId: ctx.principal.userId,
        dueDate: input.dueDate ?? null,
        labels: { create: normalizeLabels(input.labels ?? []) },
      },
      include: taskInclude,
    });
    const taskKey = keyOf(row);
    await recordActivity(tx, ctx.principal, {
      workspaceId: project.workspaceId,
      projectId,
      taskId: row.id,
      type: 'TASK_CREATED',
      data: { taskKey, title: row.title },
    });
    fx.events.push({
      type: 'task.created',
      workspaceId: project.workspaceId,
      projectId,
      actorId: ctx.principal.userId,
      data: { task: toTaskDto(row) },
    });
    if (assignee) await recordAssignment(tx, ctx, fx, row, assignee);
    return toTaskDto(row);
  });
}

export async function updateTask(ctx: Ctx, taskId: string, input: UpdateTaskInput): Promise<Task> {
  const { task } = await authorizeTask(ctx.app.db, ctx.principal, taskId, 'task:write');
  assertWritable(task.project);
  return mutate(ctx, async (tx, fx) => {
    const before = await tx.task.findUniqueOrThrow({ where: { id: taskId }, include: taskInclude });
    const assigneeChanged =
      input.assigneeId !== undefined && input.assigneeId !== before.assigneeId;
    const assignee = assigneeChanged
      ? await resolveAssignee(tx, before.projectId, input.assigneeId ?? null)
      : undefined;
    const after = await tx.task.update({
      where: { id: taskId },
      data: {
        title: input.title,
        description: input.description,
        priority: input.priority,
        dueDate: input.dueDate,
        ...(assigneeChanged && { assigneeId: assignee?.id ?? null }),
        ...(input.labels && { labels: { deleteMany: {}, create: normalizeLabels(input.labels) } }),
      },
      include: taskInclude,
    });

    const changes: Record<string, Change> = {};
    const track = (
      field: string,
      from: Prisma.InputJsonValue | null,
      to: Prisma.InputJsonValue | null,
    ) => {
      if (JSON.stringify(from) !== JSON.stringify(to)) changes[field] = { from, to };
    };
    track('title', before.title, after.title);
    track('description', before.description, after.description);
    track('priority', before.priority, after.priority);
    track('dueDate', iso(before.dueDate), iso(after.dueDate));
    track('labels', names(before), names(after));

    const { workspaceId } = after.project;
    if (Object.keys(changes).length > 0) {
      await recordActivity(tx, ctx.principal, {
        workspaceId,
        projectId: after.projectId,
        taskId,
        type: 'TASK_UPDATED',
        data: { taskKey: keyOf(after), title: after.title, changes },
      });
      fx.events.push({
        type: 'task.updated',
        workspaceId,
        projectId: after.projectId,
        actorId: ctx.principal.userId,
        data: { task: toTaskDto(after) },
      });
    }
    if (assigneeChanged) await recordAssignment(tx, ctx, fx, after, assignee ?? null);
    return toTaskDto(after);
  });
}

/** Assigning is a PATCH restricted to `assigneeId`: same rules, same events. */
export const assignTask = (ctx: Ctx, taskId: string, assigneeId: string | null) =>
  updateTask(ctx, taskId, { assigneeId });

export async function moveTask(
  ctx: Ctx,
  taskId: string,
  input: { status: TaskStatus; beforeTaskId?: string | null },
): Promise<Task> {
  const { task } = await authorizeTask(ctx.app.db, ctx.principal, taskId, 'task:write');
  assertWritable(task.project);
  return mutate(ctx, async (tx, fx) => {
    const current = await tx.task.findUniqueOrThrow({
      where: { id: taskId },
      include: taskInclude,
    });
    const siblings = await tx.task.findMany({
      where: { projectId: current.projectId, status: input.status, NOT: { id: taskId } },
      orderBy: [{ position: 'asc' }, { id: 'asc' }],
      select: { id: true, position: true },
    });
    const idx = input.beforeTaskId
      ? siblings.findIndex((s) => s.id === input.beforeTaskId)
      : siblings.length;
    if (idx === -1) throw badRequest('beforeTaskId must be another task in the target column');

    const position = placeBetween(siblings[idx - 1]?.position, siblings[idx]?.position);
    if (position === null) {
      const ids = siblings.map((s) => s.id);
      ids.splice(idx, 0, taskId);
      for (const u of rebalanceColumn(ids)) {
        await tx.task.update({ where: { id: u.id }, data: { position: u.position } });
      }
    } else {
      await tx.task.update({ where: { id: taskId }, data: { position } });
    }
    const after = await tx.task.update({
      where: { id: taskId },
      data: { status: input.status },
      include: taskInclude,
    });

    const { workspaceId } = after.project;
    const from = current.status;
    if (from === input.status) {
      fx.events.push({
        type: 'task.updated',
        workspaceId,
        projectId: after.projectId,
        actorId: ctx.principal.userId,
        data: { task: toTaskDto(after) },
      });
      return toTaskDto(after);
    }

    const taskKey = keyOf(after);
    await recordActivity(tx, ctx.principal, {
      workspaceId,
      projectId: after.projectId,
      taskId,
      type: 'TASK_STATUS_CHANGED',
      data: { taskKey, title: after.title, from, to: input.status },
    });
    const recipients = [...new Set([after.reporterId, after.assigneeId])].filter(
      (id): id is string => id !== null && id !== ctx.principal.userId,
    );
    if (recipients.length > 0) {
      const actor = await tx.user.findUniqueOrThrow({
        where: { id: ctx.principal.userId },
        select: userRefSelect,
      });
      for (const userId of recipients) {
        fx.notifications.push({
          userId,
          workspaceId,
          type: 'TASK_UPDATED',
          data: {
            taskId,
            taskKey,
            title: after.title,
            projectId: after.projectId,
            actor: toUserRef(actor),
            from,
            to: input.status,
          },
        });
      }
    }
    fx.events.push({
      type: 'task.status_changed',
      workspaceId,
      projectId: after.projectId,
      actorId: ctx.principal.userId,
      data: { task: toTaskDto(after), from, to: input.status },
    });
    return toTaskDto(after);
  });
}

export async function deleteTask(ctx: Ctx, taskId: string): Promise<void> {
  const { task, role } = await authorizeTask(ctx.app.db, ctx.principal, taskId, 'task:write');
  const me = ctx.principal.userId;
  if (!hasRole(role, 'ADMIN') && task.reporterId !== me && task.assigneeId !== me) {
    throw forbidden('Only the reporter, the assignee or an admin can delete this task');
  }
  await mutate(ctx, async (tx, fx) => {
    const row = await tx.task.findUniqueOrThrow({ where: { id: taskId }, include: taskInclude });
    // No taskId on the activity: it would cascade-delete with the task.
    await recordActivity(tx, ctx.principal, {
      workspaceId: row.project.workspaceId,
      projectId: row.projectId,
      type: 'TASK_DELETED',
      data: { taskKey: keyOf(row), title: row.title },
    });
    await tx.task.delete({ where: { id: taskId } });
    fx.events.push({
      type: 'task.deleted',
      workspaceId: row.project.workspaceId,
      projectId: row.projectId,
      actorId: me,
      data: { taskId, projectId: row.projectId },
    });
  });
}

export async function listTaskActivity(
  ctx: Ctx,
  taskId: string,
  query: { limit: number; cursor?: string },
) {
  await authorizeTask(ctx.app.db, ctx.principal, taskId, 'task:read');
  const rows = await ctx.app.db.activity.findMany({
    where: { taskId, ...afterCursor(query.cursor) },
    include: activityInclude,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: query.limit + 1,
  });
  const page = paginate(rows, query.limit);
  return { data: page.data.map(toActivityDto), nextCursor: page.nextCursor };
}

export async function listComments(ctx: Ctx, taskId: string): Promise<Comment[]> {
  await authorizeTask(ctx.app.db, ctx.principal, taskId, 'task:read');
  const rows = await ctx.app.db.taskComment.findMany({
    where: { taskId },
    include: commentInclude,
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });
  return rows.map(toCommentDto);
}

export async function addComment(ctx: Ctx, taskId: string, body: string): Promise<Comment> {
  const { task } = await authorizeTask(ctx.app.db, ctx.principal, taskId, 'comment:write');
  assertWritable(task.project);
  const { workspaceId } = task.project;
  const me = ctx.principal.userId;
  const mentioned = [
    ...new Set([...body.matchAll(MENTION_RE)].map((m) => (m[1] ?? '').toLowerCase())),
  ];
  return mutate(ctx, async (tx, fx) => {
    const members = await tx.workspaceMember.findMany({
      where: { workspaceId, userId: { in: mentioned, not: me } },
      select: { userId: true },
    });
    const row = await tx.taskComment.create({
      data: { taskId, authorId: me, body },
      include: commentInclude,
    });
    const taskKey = `${task.project.identifier}-${task.number}`;
    await recordActivity(tx, ctx.principal, {
      workspaceId,
      projectId: task.projectId,
      taskId,
      type: 'COMMENT_CREATED',
      data: { taskKey, title: task.title, commentId: row.id, excerpt: body.slice(0, 140) },
    });
    for (const m of members) {
      fx.notifications.push({
        userId: m.userId,
        workspaceId,
        type: 'COMMENT_MENTION',
        data: {
          taskId,
          taskKey,
          title: task.title,
          projectId: task.projectId,
          commentId: row.id,
          actor: toUserRef(row.author),
        },
      });
    }
    const dto = toCommentDto(row);
    fx.events.push({
      type: 'comment.created',
      workspaceId,
      projectId: task.projectId,
      actorId: me,
      data: { taskId, comment: dto },
    });
    return dto;
  });
}

export async function deleteComment(ctx: Ctx, commentId: string): Promise<void> {
  const comment = await ctx.app.db.taskComment.findUnique({
    where: { id: commentId },
    include: { task: { select: { project: { select: { workspaceId: true } } } } },
  });
  if (!comment) throw notFound('Comment');
  const role = await authorize(
    ctx.app.db,
    ctx.principal,
    comment.task.project.workspaceId,
    'comment:write',
  );
  if (comment.authorId !== ctx.principal.userId && !hasRole(role, 'ADMIN')) {
    throw forbidden('Only the author or an admin can delete this comment');
  }
  await ctx.app.db.taskComment.delete({ where: { id: commentId } });
}
