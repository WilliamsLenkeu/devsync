import { z } from 'zod';

export const pageQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  cursor: z.string().optional(),
});

/** Cursor = base64url("<createdAt ISO>|<id>"); lists are ordered by (createdAt desc, id desc). */
export const encodeCursor = (row: { createdAt: Date; id: string }): string =>
  Buffer.from(`${row.createdAt.toISOString()}|${row.id}`).toString('base64url');

export const decodeCursor = (cursor: string): { createdAt: Date; id: string } | null => {
  const [iso, id] = Buffer.from(cursor, 'base64url').toString().split('|');
  const createdAt = iso ? new Date(iso) : undefined;
  return createdAt && !Number.isNaN(createdAt.getTime()) && id ? { createdAt, id } : null;
};

/** Prisma `where` fragment selecting rows strictly after the cursor in (createdAt desc, id desc) order. */
export const afterCursor = (cursor: string | undefined) => {
  const c = cursor ? decodeCursor(cursor) : null;
  return c
    ? {
        OR: [{ createdAt: { lt: c.createdAt } }, { createdAt: c.createdAt, id: { lt: c.id } }],
      }
    : {};
};

/** Fetch `limit + 1` rows, then call this to trim and compute `nextCursor`. */
export const paginate = <T extends { createdAt: Date; id: string }>(rows: T[], limit: number) => {
  const page = rows.slice(0, limit);
  const last = page[page.length - 1];
  return { data: page, nextCursor: rows.length > limit && last ? encodeCursor(last) : null };
};
