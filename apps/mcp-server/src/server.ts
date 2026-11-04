import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DevSyncClient } from './client.js';
import { registerTools } from './tools.js';

export function createServer({ client }: { client: DevSyncClient }): McpServer {
  const server = new McpServer({ name: 'devsync', version: '0.1.0' });
  registerTools(server, client);
  return server;
}
