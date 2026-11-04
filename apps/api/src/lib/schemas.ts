import { z } from 'zod';

export const uuid = z.string().uuid();
/** Response date field: handlers return `Date`, the wire carries an ISO-8601 string. */
export const dateTime = z.codec(z.iso.datetime(), z.date(), {
  decode: (s) => new Date(s),
  encode: (d) => d.toISOString(),
});

/** Wrap a payload schema in the standard success envelope `{ data }`. */
export const envelope = <T extends z.ZodType>(data: T) => z.object({ data });

export const errorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string(), details: z.unknown().optional() }),
});

export const userSchema = z.object({
  id: uuid,
  email: z.string().email(),
  name: z.string(),
  avatarUrl: z.string().nullable(),
  createdAt: dateTime,
});

export const idParams = <K extends string>(name: K) =>
  z.object({ [name]: uuid } as Record<K, typeof uuid>);
