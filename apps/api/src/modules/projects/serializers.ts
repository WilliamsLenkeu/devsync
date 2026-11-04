import { z } from 'zod';
import { projectStatusSchema, type ProjectStatus } from '@devsync/shared';
import type { Db } from '../../db';
import { dateTime, uuid } from '../../lib/schemas';

export const projectSchema = z.object({
  id: uuid,
  workspaceId: uuid,
  name: z.string(),
  description: z.string().nullable(),
  identifier: z.string(),
  status: projectStatusSchema,
  taskCounts: z.object({ total: z.number().int(), done: z.number().int() }),
  createdAt: dateTime,
  updatedAt: dateTime,
});
export type ProjectOut = z.infer<typeof projectSchema>;

type Counts = ProjectOut['taskCounts'];
type ProjectRow = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  identifier: string;
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
};

const ZERO: Counts = { total: 0, done: 0 };

const countTasks = async (db: Db, projectIds: string[]) => {
  const rows = await db.task.groupBy({
    by: ['projectId', 'status'],
    where: { projectId: { in: projectIds } },
    _count: { _all: true },
  });
  const counts = new Map<string, Counts>();
  for (const r of rows) {
    const c = counts.get(r.projectId) ?? { total: 0, done: 0 };
    c.total += r._count._all;
    if (r.status === 'DONE') c.done += r._count._all;
    counts.set(r.projectId, c);
  }
  return counts;
};

const toProject = (p: ProjectRow, taskCounts: Counts): ProjectOut => ({
  id: p.id,
  workspaceId: p.workspaceId,
  name: p.name,
  description: p.description,
  identifier: p.identifier,
  status: p.status,
  taskCounts,
  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
});

export const loadProject = async (db: Db, projectId: string): Promise<ProjectOut> => {
  const p = await db.project.findUniqueOrThrow({ where: { id: projectId } });
  const counts = await countTasks(db, [projectId]);
  return toProject(p, counts.get(projectId) ?? ZERO);
};

export const listProjects = async (
  db: Db,
  workspaceId: string,
  status?: ProjectStatus,
): Promise<ProjectOut[]> => {
  const rows = await db.project.findMany({
    where: { workspaceId, ...(status ? { status } : {}) },
    orderBy: { createdAt: 'asc' },
  });
  const counts = await countTasks(
    db,
    rows.map((r) => r.id),
  );
  return rows.map((r) => toProject(r, counts.get(r.id) ?? ZERO));
};
