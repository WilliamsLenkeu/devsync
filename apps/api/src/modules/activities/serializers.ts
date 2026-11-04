import { z } from 'zod';
import type { Prisma } from '../../generated/prisma/client';
import { ActivityType } from '../../generated/prisma/enums';
import type { Db } from '../../db';
import { afterCursor, paginate } from '../../lib/pagination';
import { dateTime, uuid } from '../../lib/schemas';

export const userRefSchema = z.object({
  id: uuid,
  name: z.string(),
  avatarUrl: z.string().nullable(),
});

export const activitySchema = z.object({
  id: uuid,
  type: z.enum(ActivityType),
  workspaceId: uuid,
  projectId: uuid.nullable(),
  taskId: uuid.nullable(),
  actor: userRefSchema.nullable(),
  viaAgent: z.boolean(),
  data: z.record(z.string(), z.unknown()),
  createdAt: dateTime,
});

/** Paginated list body: `{ data, nextCursor }` (not wrapped in the `{ data }` envelope). */
export const paginated = <T extends z.ZodType>(item: T) =>
  z.object({ data: z.array(item), nextCursor: z.string().nullable() });

export const activityInclude = {
  actor: { select: { id: true, name: true, avatarUrl: true } },
} as const satisfies Prisma.ActivityInclude;

export type ActivityRow = Prisma.ActivityGetPayload<{ include: typeof activityInclude }>;

export type ActivityDto = z.infer<typeof activitySchema>;

export const toActivityDto = (row: ActivityRow): ActivityDto => ({
  id: row.id,
  type: row.type,
  workspaceId: row.workspaceId,
  projectId: row.projectId,
  taskId: row.taskId,
  actor: row.actor,
  viaAgent: row.apiTokenId !== null,
  data: row.data as Record<string, unknown>,
  createdAt: row.createdAt,
});

/** Paginated activity feed (createdAt desc, id desc) for an arbitrary `where`. */
export const listActivities = async (
  db: Db,
  where: Prisma.ActivityWhereInput,
  { limit, cursor }: { limit: number; cursor?: string },
) => {
  const rows = await db.activity.findMany({
    where: { AND: [where, afterCursor(cursor)] },
    include: activityInclude,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
  });
  const page = paginate(rows, limit);
  return { data: page.data.map(toActivityDto), nextCursor: page.nextCursor };
};
