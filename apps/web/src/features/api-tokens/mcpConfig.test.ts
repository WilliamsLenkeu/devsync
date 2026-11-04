import { describe, expect, it } from 'vitest';
import { mcpConfigSnippet } from './mcpConfig';

describe('mcpConfigSnippet', () => {
  it('embeds api url and token', () => {
    const json = JSON.parse(mcpConfigSnippet('https://app.example/api', 'dsk_abc')) as {
      mcpServers: { devsync: { env: Record<string, string> } };
    };
    expect(json.mcpServers.devsync.env.DEVSYNC_API_URL).toBe('https://app.example/api');
    expect(json.mcpServers.devsync.env.DEVSYNC_API_TOKEN).toBe('dsk_abc');
  });
});
