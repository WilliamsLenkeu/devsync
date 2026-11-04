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
    <div className="mx-auto max-w-4xl space-y-10 p-6">
      <PageHeader
        title="API tokens"
        description="Scoped secrets for agents and the MCP server. Shown only once at creation."
        actions={<CreateTokenDialog workspaceId={wid} />}
      />

      {tokens.isPending && <Skeleton className="h-40 w-full" />}
      {tokens.isError && <ErrorState error={tokens.error} onRetry={() => void tokens.refetch()} />}
      {tokens.isSuccess && active.length === 0 && (
        <EmptyState
          icon={KeyRound}
          title="No active tokens"
          description="Create a token, then paste it into your MCP client config."
          action={<CreateTokenDialog workspaceId={wid} />}
        />
      )}
      {tokens.isSuccess && active.length > 0 && <TokensTable workspaceId={wid} tokens={tokens.data} />}

      <McpConfigCard />
    </div>
  );
}
