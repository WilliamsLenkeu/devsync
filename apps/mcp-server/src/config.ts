export interface Config {
  apiUrl: string;
  token: string;
}

export class ConfigError extends Error {}

export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const token = env.DEVSYNC_API_TOKEN?.trim() ?? '';
  if (!token) {
    throw new ConfigError('DEVSYNC_API_TOKEN is missing (create a scoped token in the DevSync web UI, "API tokens").');
  }
  if (!token.startsWith('dsk_')) {
    throw new ConfigError("DEVSYNC_API_TOKEN is invalid: it must start with 'dsk_'.");
  }

  const apiUrl = (env.DEVSYNC_API_URL?.trim() || 'http://localhost:3000').replace(/\/+$/, '');
  let parsed: URL;
  try {
    parsed = new URL(apiUrl);
  } catch {
    throw new ConfigError(`DEVSYNC_API_URL is not a valid URL: ${apiUrl}`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new ConfigError('DEVSYNC_API_URL must use http or https.');
  }

  return { apiUrl, token };
}
