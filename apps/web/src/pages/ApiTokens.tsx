import { useQuery } from '@tanstack/react-query';
import { KeyRound } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useDocumentTitle } from '@/components/layout/useDocumentTitle';
import { EmptyState, ErrorState, PageHeader } from '@/components/states';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateTokenDialog } from '@/features/api-tokens/CreateTokenDialog';
import { McpConfigCard } from '@/features/api-tokens/McpConfigCard';
import { TokensTable } from '@/features/api-tokens/TokensTable';
import { api } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type { ApiToken } from '@/lib/types';
import { useWorkspace } from '@/lib/workspace';

/**
 * Design Read: API secrets admin, signal-console,
 * dial ENERGY 2 / RHYTHM 2 / MOTION 1.
 * Job: create and revoke tokens. MCP stays collapsed secondary.
 */
export function ApiTokensPage() {
  useDocumentTitle('API tokens');
  const { workspace, can } = useWorkspace();
  const wid = workspace.id;
  const allowed = can('token:manage');
  const tokens = useQuery({
    queryKey: qk.apiTokens(wid),
    queryFn: () => api.get<ApiToken[]>(`/workspaces/${wid}/api-tokens`),
    enabled: allowed,
  });

  if (!allowed) return <Navigate to={`/w/${wid}`} replace />;

  const active = tokens.data?.filter((t) => !t.revokedAt) ?? [];

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="API tokens"
        description="Scoped secrets for scripts and integrations. The secret is shown only once."
        actions={<CreateTokenDialog workspaceId={wid} />}
      />

      <div className="grid gap-10">
        {tokens.isPending && (
          <div className="divide-y border-y" aria-busy="true" aria-label="Loading tokens">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="space-y-2 py-2.5">
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="h-3 w-48" />
              </div>
            ))}
          </div>
        )}

        {tokens.isError && (
          <ErrorState error={tokens.error} onRetry={() => void tokens.refetch()} />
        )}

        {tokens.isSuccess && active.length === 0 && (
          <EmptyState
            icon={KeyRound}
            title="No active tokens"
            description="Create a token to call the API from scripts or CI."
            action={<CreateTokenDialog workspaceId={wid} />}
          />
        )}

        {tokens.isSuccess && active.length > 0 && (
          <TokensTable workspaceId={wid} tokens={tokens.data} />
        )}

        <McpConfigCard />
      </div>
    </div>
  );
}
