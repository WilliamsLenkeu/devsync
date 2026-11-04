export class DevSyncApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'DevSyncApiError';
  }
}

export interface ApiResponse<T> {
  data: T;
  nextCursor?: string | null;
}

export type Query = Record<string, string | number | undefined>;

export class DevSyncClient {
  constructor(
    private readonly apiUrl: string,
    private readonly token: string,
    private readonly timeoutMs = 15_000,
  ) {}

  async request<T>(
    method: 'GET' | 'POST' | 'PATCH',
    path: string,
    options: { query?: Query; body?: unknown } = {},
  ): Promise<ApiResponse<T>> {
    const url = new URL(`${this.apiUrl}/api/agent${path}`);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    const hasBody = options.body !== undefined;
    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/json',
          ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
        },
        body: hasBody ? JSON.stringify(options.body) : undefined,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new DevSyncApiError('TIMEOUT', `DevSync API did not respond within ${this.timeoutMs} ms.`, 0);
      }
      throw new DevSyncApiError('NETWORK_ERROR', `Cannot reach the DevSync API at ${this.apiUrl}.`, 0);
    }

    const json: unknown = await response.json().catch(() => undefined);
    if (!response.ok) {
      const error = (json as { error?: { code?: string; message?: string } } | undefined)?.error;
      const message = this.redact(error?.message ?? response.statusText ?? 'Request failed');
      throw new DevSyncApiError(error?.code ?? `HTTP_${response.status}`, message, response.status);
    }
    return json as ApiResponse<T>;
  }

  private redact(text: string): string {
    return text.replaceAll(this.token, '[redacted]');
  }
}
