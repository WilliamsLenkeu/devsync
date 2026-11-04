import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Smoke test of the real entrypoint (stdio), no DevSync API needed.
const pkgDir = fileURLToPath(new URL('..', import.meta.url));
const TOKEN = 'dsk_test_0123456789abcdefghijklmnopqrstuvwxyz';

const baseEnv = (): NodeJS.ProcessEnv => {
  const env = { ...process.env };
  delete env.DEVSYNC_API_TOKEN;
  delete env.DEVSYNC_API_URL;
  return env;
};

const start = (env: NodeJS.ProcessEnv) =>
  spawn(process.execPath, ['--import', 'tsx', 'src/index.ts'], { cwd: pkgDir, env });

describe('stdio entrypoint', () => {
  it('fails fast with exit code 1 when the token is missing', async () => {
    const child = start(baseEnv());
    let stderr = '';
    child.stderr.on('data', (chunk) => (stderr += chunk));
    const code = await new Promise<number | null>((resolve) => child.on('exit', resolve));
    expect(code).toBe(1);
    expect(stderr).toContain('DEVSYNC_API_TOKEN is missing');
  }, 30_000);

  it('answers MCP initialize over stdin/stdout', async () => {
    const child = start({ ...baseEnv(), DEVSYNC_API_TOKEN: TOKEN });
    const stdout = await new Promise<string>((resolve, reject) => {
      let buffer = '';
      child.stdout.on('data', (chunk) => {
        buffer += chunk;
        if (buffer.includes('\n')) resolve(buffer);
      });
      child.on('exit', (code) => reject(new Error(`exited early with code ${code}`)));
      child.stdin.write(
        JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2025-06-18',
            capabilities: {},
            clientInfo: { name: 'smoke', version: '0.0.0' },
          },
        }) + '\n',
      );
    });
    child.kill();

    const response = JSON.parse(stdout.split('\n')[0] as string);
    expect(response.result.serverInfo).toEqual({ name: 'devsync', version: '0.1.0' });
    expect(stdout).not.toContain(TOKEN);
  }, 30_000);
});
