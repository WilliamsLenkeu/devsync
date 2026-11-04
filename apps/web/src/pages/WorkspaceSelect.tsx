import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useDocumentTitle } from '@/components/layout/useDocumentTitle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateWorkspaceDialog } from '@/features/workspaces/CreateWorkspaceDialog';
import { getLastWorkspace } from '@/features/workspaces/lastWorkspace';
import { EmptyState, ErrorState, PageHeader } from '@/components/states';
import { formatDate, humanize } from '@/lib/format';
import { api, errorMessage } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type { Invitation, Workspace } from '@/lib/types';

export function WorkspaceSelectPage() {
  useDocumentTitle('Workspaces');
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [createOpen, setCreateOpen] = useState(false);

  const workspacesQuery = useQuery({ queryKey: qk.workspaces, queryFn: () => api.get<Workspace[]>('/workspaces') });
  const invitationsQuery = useQuery({ queryKey: qk.myInvitations, queryFn: () => api.get<Invitation[]>('/invitations') });

  const respond = useMutation({
    mutationFn: ({ invitation, action }: { invitation: Invitation; action: 'accept' | 'decline' }) =>
      api.post(`/invitations/${invitation.id}/${action}`),
    onSuccess: (_data, { invitation, action }) => {
      void qc.invalidateQueries({ queryKey: qk.myInvitations });
      void qc.invalidateQueries({ queryKey: qk.workspaces });
      if (action === 'decline') {
        toast.success(`Declined the invitation to ${invitation.workspaceName}`);
        return;
      }
      toast.success(`Joined ${invitation.workspaceName}`);
      navigate(`/w/${invitation.workspaceId}`);
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const workspaces = workspacesQuery.data ?? [];
  const invitations = invitationsQuery.data ?? [];
  const browsing = (state as { browse?: boolean } | null)?.browse === true;

  // Auto-open the workspace used last time, unless the user came here via "All workspaces".
  if (!browsing && workspaces.length === 1 && invitations.length === 0 && getLastWorkspace() === workspaces[0].id) {
    return <Navigate to={`/w/${workspaces[0].id}`} replace />;
  }

  const error = workspacesQuery.error ?? invitationsQuery.error;
  const loading = workspacesQuery.isPending || invitationsQuery.isPending;

  return (
    <div className="mx-auto grid max-w-4xl gap-10 p-6 lg:p-8">
      <PageHeader
        title="Workspaces"
        description="Open a workspace, accept an invitation or create a new one."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus aria-hidden />
            Create workspace
          </Button>
        }
      />

      {error ? (
        <ErrorState
          error={error}
          onRetry={() => {
            void workspacesQuery.refetch();
            void invitationsQuery.refetch();
          }}
        />
      ) : loading ? (
        <div className="grid gap-3 sm:grid-cols-2" aria-busy="true">
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
        </div>
      ) : (
        <>
          {invitations.length > 0 && (
            <section aria-labelledby="invitations-title" className="grid gap-3">
              <h2 id="invitations-title" className="text-sm font-medium">
                Invitations
              </h2>
              <ul className="divide-y rounded-lg border">
                {invitations.map((inv) => {
                  const busy = respond.isPending && respond.variables?.invitation.id === inv.id;
                  return (
                    <li key={inv.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{inv.workspaceName}</p>
                        <p className="text-sm text-muted-foreground">
                          Invited by {inv.invitedBy.name} as {humanize(inv.role)} · expires {formatDate(inv.expiresAt)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          aria-label={`Decline invitation to ${inv.workspaceName}`}
                          onClick={() => respond.mutate({ invitation: inv, action: 'decline' })}
                        >
                          Decline
                        </Button>
                        <Button
                          size="sm"
                          disabled={busy}
                          aria-label={`Accept invitation to ${inv.workspaceName}`}
                          onClick={() => respond.mutate({ invitation: inv, action: 'accept' })}
                        >
                          {busy ? 'Joining…' : 'Accept'}
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section aria-labelledby="workspaces-title" className="grid gap-3">
            <h2 id="workspaces-title" className="text-sm font-medium">
              Your workspaces
            </h2>
            {workspaces.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="No workspaces yet"
                description="Create a workspace for your team, or accept an invitation from an admin."
                action={<Button onClick={() => setCreateOpen(true)}>Create workspace</Button>}
              />
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {workspaces.map((ws) => (
                  <li key={ws.id}>
                    <Link
                      to={`/w/${ws.id}`}
                      className="block h-full rounded-lg border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="truncate font-medium">{ws.name}</h3>
                        <Badge variant="secondary">{humanize(ws.role)}</Badge>
                      </div>
                      <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{ws.slug}</p>
                      <p className="mt-4 text-sm tabular-nums text-muted-foreground">
                        {ws.memberCount} {ws.memberCount === 1 ? 'member' : 'members'}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <CreateWorkspaceDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
