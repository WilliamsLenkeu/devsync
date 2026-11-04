import { z } from 'zod';
import { taskPrioritySchema, taskStatusSchema } from '@devsync/shared';
import type { Prisma } from '../../generated/prisma/client';
import { dateTime, uuid } from '../../lib/schemas';

export const userRefSelect = { id: true, name: true, avatarUrl: true } as const;
const userRefSchema = z.object({ id: uuid, name: z.string(), avatarUrl: z.string().nullable() });

const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const labelSchema = z.object({ id: uuid, name: z.string(), color: z.string() });
export const labelInputSchema = z.object({
  name: z.string().trim().min(1).max(50),
  color: colorSchema.optional(),
});

export const taskSchema = z.object({
  id: uuid,
  projectId: uuid,
  number: z.number().int(),
  key: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  position: z.number(),
  dueDate: dateTime.nullable(),
  assignee: userRefSchema.nullable(),
  reporter: userRefSchema,
  labels: z.array(labelSchema),
  commentCount: z.number().int(),
  createdAt: dateTime,
  updatedAt: dateTime,
});
export type Task = z.infer<typeof taskSchema>;

export const commentSchema = z.object({
  id: uuid,
  taskId: uuid,
  body: z.string(),
  author: userRefSchema,
  createdAt: dateTime,
  updatedAt: dateTime,
});
export type Comment = z.infer<typeof commentSchema>;

export const activitySchema = z.object({
  id: uuid,
  type: z.string(),
  workspaceId: uuid,
  projectId: uuid.nullable(),
  taskId: uuid.nullable(),
  actor: userRefSchema.nullable(),
  viaAgent: z.boolean(),
  data: z.unknown(),
  createdAt: dateTime,
});

export const createTaskBody = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(10000).nullish(),
  status: taskStatusSchema.default('BACKLOG'),
  priority: taskPrioritySchema.default('MEDIUM'),
  assigneeId: uuid.nullish(),
  dueDate: dateTime.nullish(),
  labels: z.array(labelInputSchema).max(20).optional(),
});
export type CreateTaskInput = z.infer<typeof createTaskBody>;

/** `status` is deliberately absent: moving between columns goes through `moveTask`. */
export const updateTaskBody = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(10000).nullable().optional(),
  priority: taskPrioritySchema.optional(),
  assigneeId: uuid.nullable().optional(),
  dueDate: dateTime.nullable().optional(),
  labels: z.array(labelInputSchema).max(20).optional(),
});
export type UpdateTaskInput = z.infer<typeof updateTaskBody>;

export const moveTaskBody = z.object({
  status: taskStatusSchema,
  beforeTaskId: uuid.nullish(),
});
export type MoveTaskInput = z.infer<typeof moveTaskBody>;

export const createCommentBody = z.object({
  body: z.string().trim().min(1).max(5000),
});

export const taskFiltersQuery = z.object({
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  assigneeId: z.union([z.literal('me'), z.literal('none'), uuid]).optional(),
  label: z.string().trim().optional(),
  q: z.string().trim().max(200).optional(),
  sort: z.enum(['position', 'createdAt', 'updatedAt', 'dueDate', 'priority']).default('position'),
  order: z.enum(['asc', 'desc']).default('asc'),
});
export type TaskFilters = z.infer<typeof taskFiltersQuery>;

export const taskInclude = {
  project: { select: { identifier: true, workspaceId: true } },
  assignee: { select: userRefSelect },
  reporter: { select: userRefSelect },
  labels: { select: { id: true, name: true, color: true }, orderBy: { name: 'asc' } },
  _count: { select: { comments: true } },
} as const satisfies Prisma.TaskInclude;
export type TaskRow = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;

export const commentInclude = {
  author: { select: userRefSelect },
} as const satisfies Prisma.TaskCommentInclude;
export type CommentRow = Prisma.TaskCommentGetPayload<{ include: typeof commentInclude }>;

export const activityInclude = {
  actor: { select: userRefSelect },
} as const satisfies Prisma.ActivityInclude;
export type ActivityRow = Prisma.ActivityGetPayload<{ include: typeof activityInclude }>;

type UserRow = { id: string; name: string; avatarUrl: string | null };
export const toUserRef = (u: UserRow) => ({ id: u.id, name: u.name, avatarUrl: u.avatarUrl });

export const toTaskDto = (row: TaskRow): Task => ({
  id: row.id,
  projectId: row.projectId,
  number: row.number,
  key: `${row.project.identifier}-${row.number}`,
  title: row.title,
  description: row.description,
  status: row.status,
  priority: row.priority,
  position: row.position,
  dueDate: row.dueDate,
  assignee: row.assignee ? toUserRef(row.assignee) : null,
  reporter: toUserRef(row.reporter),
  labels: row.labels,
  commentCount: row._count.comments,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export const toCommentDto = (row: CommentRow): Comment => ({
  id: row.id,
  taskId: row.taskId,
  body: row.body,
  author: toUserRef(row.author),
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export const toActivityDto = (row: ActivityRow) => ({
  id: row.id,
  type: row.type,
  workspaceId: row.workspaceId,
  projectId: row.projectId,
  taskId: row.taskId,
  actor: row.actor ? toUserRef(row.actor) : null,
  viaAgent: row.apiTokenId !== null,
  data: row.data,
  createdAt: row.createdAt,
});
