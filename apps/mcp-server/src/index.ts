import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { DevSyncClient } from './client.js';
import { loadConfig } from './config.js';
import { createServer } from './server.js';

// stdout is the MCP channel: everything human-readable goes to stderr.
let config: ReturnType<typeof loadConfig>;
try {
  config = loadConfig(process.env);
} catch (error) {
  process.stderr.write(`devsync-mcp: ${error instanceof Error ? error.message : 'invalid configuration'}\n`);
  process.exit(1);
}

const server = createServer({ client: new DevSyncClient(config.apiUrl, config.token) });
await server.connect(new StdioServerTransport());
process.stderr.write(`devsync-mcp ready (API: ${config.apiUrl})\n`);
