import { CopyButton } from '@/features/api-tokens/CopyButton';
import { defaultApiUrl, mcpConfigSnippet } from '@/features/api-tokens/mcpConfig';

export function McpConfigCard({ token = 'dsk_...' }: { token?: string }) {
  const snippet = mcpConfigSnippet(defaultApiUrl(), token);

  return (
    <section aria-labelledby="mcp-config" className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="mcp-config" className="text-sm font-medium">
            MCP server config
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Drop this into Cursor or Claude Desktop. Replace the token with a secret you just created.
          </p>
        </div>
        <CopyButton value={snippet} label="Copy JSON" />
      </div>
      <pre className="overflow-x-auto rounded-md bg-muted/60 p-3 font-mono text-xs leading-relaxed">{snippet}</pre>
    </section>
  );
}
