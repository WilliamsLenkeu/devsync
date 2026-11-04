export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

let refreshing: Promise<boolean> | null = null;

/** One refresh at a time; concurrent 401s share the same attempt. */
const refreshSession = (): Promise<boolean> =>
  (refreshing ??= fetch('/api/auth/refresh', { method: 'POST', credentials: 'same-origin' })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    }));

/** Fired when the session is definitively gone (refresh failed); AuthProvider listens to it. */
export const SESSION_EXPIRED_EVENT = 'devsync:session-expired';

async function request<T>(method: Method, path: string, body?: unknown, retry = true): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (res.status === 401 && retry && !path.startsWith('/auth/')) {
    if (await refreshSession()) return request<T>(method, path, body, false);
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
  if (res.status === 204) return undefined as T;

  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (json as { error?: { code: string; message: string; details?: unknown } } | null)?.error;
    throw new ApiError(res.status, err?.code ?? 'INTERNAL', err?.message ?? res.statusText, err?.details);
  }
  return json as T;
}

const qs = (params?: Record<string, string | number | boolean | undefined | null>) => {
  const entries = Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return entries.length ? `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)]))}` : '';
};

/** Unwraps the `{ data }` envelope. Use `api.page` for `{ data, nextCursor }` lists. */
export const api = {
  get: <T>(path: string, params?: Record<string, string | number | boolean | undefined | null>) =>
    request<{ data: T }>('GET', path + qs(params)).then((r) => r.data),
  page: <T>(path: string, params?: Record<string, string | number | boolean | undefined | null>) =>
    request<{ data: T[]; nextCursor: string | null }>('GET', path + qs(params)),
  post: <T = void>(path: string, body?: unknown) =>
    request<{ data: T } | undefined>('POST', path, body ?? {}).then((r) => r?.data as T),
  patch: <T>(path: string, body: unknown) => request<{ data: T }>('PATCH', path, body).then((r) => r.data),
  delete: (path: string) => request<void>('DELETE', path),
};

export const errorMessage = (err: unknown, fallback = 'Something went wrong') =>
  err instanceof Error ? err.message : fallback;
