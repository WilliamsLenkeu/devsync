/** Only same-origin relative paths are followed (open-redirect guard); anything else falls back to /app. */
export const safeNext = (next: string | null): string =>
  next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '/app';

export const withNext = (path: string, next: string | null): string =>
  next ? `${path}?next=${encodeURIComponent(next)}` : path;
