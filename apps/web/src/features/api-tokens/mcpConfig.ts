/** Cursor / Claude Desktop MCP snippet for a DevSync API token. */
export function mcpConfigSnippet(apiUrl: string, token = 'dsk_...'): string {
  return JSON.stringify(
    {
      mcpServers: {
        devsync: {
          command: 'pnpm',
          args: ['--filter', '@devsync/mcp-server', 'start'],
          env: {
            DEVSYNC_API_URL: apiUrl,
            DEVSYNC_API_TOKEN: token,
          },
        },
      },
    },
    null,
    2,
  );
}

export const defaultApiUrl = (): string => `${location.origin}/api`;
