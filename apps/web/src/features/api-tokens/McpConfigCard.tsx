import { CopyButton } from '@/features/api-tokens/CopyButton';
import { defaultApiUrl, mcpConfigSnippet } from '@/features/api-tokens/mcpConfig';

/** Collapsed optional helper for AI clients. Never the page hero. */
export function McpConfigCard({ token = 'dsk_...' }: { token?: string }) {
  const snippet = mcpConfigSnippet(defaultApiUrl(), token);

  return (
    <details className="group border-t border-dashed pt-6 text-sm">
      <summary className="cursor-pointer list-none py-1 text-muted-foreground marker:content-none hover:text-foreground [&::-webkit-details-marker]:hidden">
        <span className="flex items-start justify-between gap-3">
          <span>
            <span className="font-medium">Optional: MCP for AI agents</span>
            <span className="mt-0.5 block text-sm font-normal text-muted-foreground">
              JSON snippet for Cursor or Claude Desktop. Not required for day-to-day use.
            </span>
          </span>
          <span className="shrink-0 pt-0.5 text-xs font-normal group-open:hidden">Show</span>
          <span className="hidden shrink-0 pt-0.5 text-xs font-normal group-open:inline">Hide</span>
        </span>
      </summary>
      <div className="mt-3 space-y-3 border border-border bg-muted/20 p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Paste into your client config. Replace the placeholder with a token you just created.
          </p>
          <CopyButton value={snippet} label="Copy JSON" />
        </div>
        <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-foreground">
          {snippet}
        </pre>
      </div>
    </details>
  );
}
