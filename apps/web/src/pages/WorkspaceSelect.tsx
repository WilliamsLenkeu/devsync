import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Mail, Plus } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useDocumentTitle } from '@/components/layout/useDocumentTitle';
import { EmptyState, ErrorState, PageHeader } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateWorkspaceDialog } from '@/features/workspaces/CreateWorkspaceDialog';
import { getLastWorkspace } from '@/features/workspaces/lastWorkspace';
import { formatDate, humanize } from '@/lib/format';
import { api, errorMessage } from '@/lib/api';
import { usePageEnter, useStaggerEnter } from '@/lib/motion';
import { qk } from '@/lib/queryKeys';
import type { Invitation, Workspace } from '@/lib/types';

export function WorkspaceSelectPage() {
  useDocumentTitle('Workspaces');
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [createOpen, setCreateOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const workspacesQuery = useQuery({
    queryKey: qk.workspaces,
    queryFn: () => api.get<Workspace[]>('/workspaces'),
  });
  const invitationsQuery = useQuery({
    queryKey: qk.myInvitations,
    queryFn: () => api.get<Invitation[]>('/invitations'),
  });

  const respond = useMutation({
    mutationFn: ({
      invitation,
      action,
    }: {
      invitation: Invitation;
      action: 'accept' | 'decline';
    }) => api.post(`/invitations/${invitation.id}/${action}`),
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
  const error = workspacesQuery.error ?? invitationsQuery.error;
  const loading = workspacesQuery.isPending || invitationsQuery.isPending;

  usePageEnter(rootRef, [loading, workspaces.length, invitations.length]);
  useStaggerEnter(rootRef, '[data-stagger-item]', [loading, workspaces.length, invitations.length]);

  if (!browsing && !loading && !error && invitations.length === 0) {
    const lastId = getLastWorkspace();
    const target =
      (lastId ? workspaces.find((w) => w.id === lastId) : undefined) ??
      (workspaces.length === 1 ? workspaces[0] : undefined);
    if (target) return <Navigate to={`/w/${target.id}`} replace />;
  }

  return (
    <div ref={rootRef} className="mx-auto grid max-w-2xl gap-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Workspaces"
        description="Open a workspace, accept an invitation, or create a new one."
        actions={
          <Button
            className="bg-[#017E84] text-white hover:bg-[#016a6f]"
            onClick={() => setCreateOpen(true)}
          >
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
        <div className="grid gap-2" aria-busy="true" aria-label="Loading workspaces">
          <Skeleton className="h-14 rounded-lg" />
          <Skeleton className="h-14 rounded-lg" />
          <Skeleton className="h-14 rounded-lg" />
        </div>
      ) : (
        <>
          {invitations.length > 0 && (
            <section
              aria-labelledby="invitations-title"
              className="overflow-hidden rounded-lg border border-[#DEE2E6] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
            >
              <div className="flex items-center gap-2 border-b border-[#DEE2E6] px-4 py-2.5">
                <Mail className="size-3.5 text-[#017E84]" aria-hidden />
                <h2 id="invitations-title" className="text-sm font-semibold text-[#212529]">
                  Pending invitations
                </h2>
                <Badge className="bg-[#E9ECEF] text-[#495057] tabular-nums hover:bg-[#E9ECEF]">
                  {invitations.length}
                </Badge>
              </div>
              <ul className="divide-y divide-[#DEE2E6]">
                {invitations.map((inv) => {
                  const busy = respond.isPending && respond.variables?.invitation.id === inv.id;
                  return (
                    <li
                      key={inv.id}
                      data-stagger-item
                      className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[#212529]">{inv.workspaceName}</p>
                        <p className="mt-0.5 text-sm text-[#6C757D] text-pretty">
                          Invited by {inv.invitedBy.name} as {humanize(inv.role)}. Expires{' '}
                          {formatDate(inv.expiresAt)}.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="min-h-11 border-[#DEE2E6] bg-[#E9ECEF] text-[#212529] hover:bg-[#DEE2E6] sm:min-h-8"
                          disabled={busy}
                          aria-label={`Decline invitation to ${inv.workspaceName}`}
                          onClick={() => respond.mutate({ invitation: inv, action: 'decline' })}
                        >
                          Decline
                        </Button>
                        <Button
                          size="sm"
                          className="min-h-11 bg-[#017E84] text-white hover:bg-[#016a6f] sm:min-h-8"
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

          <section
            aria-labelledby="workspaces-title"
            className="overflow-hidden rounded-lg border border-[#DEE2E6] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
          >
            <h2
              id="workspaces-title"
              className="border-b border-[#DEE2E6] px-4 py-2.5 text-sm font-semibold text-[#212529]"
            >
              Your workspaces
            </h2>
            {workspaces.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon={Building2}
                  title="No workspaces yet"
                  description="Create a workspace for your team, or accept an invitation from an admin."
                  action={
                    <Button
                      className="bg-[#017E84] text-white hover:bg-[#016a6f]"
                      onClick={() => setCreateOpen(true)}
                    >
                      <Plus aria-hidden />
                      Create workspace
                    </Button>
                  }
                />
              </div>
            ) : (
              <ul className="divide-y divide-[#DEE2E6]">
                {workspaces.map((ws) => (
                  <li key={ws.id} data-stagger-item>
                    <Link
                      to={`/w/${ws.id}`}
                      className="flex items-center gap-3 px-4 py-3 outline-none transition-colors duration-150 hover:bg-[#F8F9FA] focus-visible:bg-[#F8F9FA] focus-visible:ring-2 focus-visible:ring-[#017E84]/35"
                    >
                      <span
                        aria-hidden
                        className="grid size-8 shrink-0 place-items-center rounded-md bg-[#E9ECEF] text-[#495057]"
                      >
                        <Building2 className="size-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-medium text-[#212529]">{ws.name}</span>
                          <Badge
                            variant="secondary"
                            className="shrink-0 border-transparent bg-[#E9ECEF] text-[#495057]"
                          >
                            {humanize(ws.role)}
                          </Badge>
                        </span>
                        <span className="mt-0.5 block truncate font-mono text-xs text-[#6C757D]">
                          {ws.slug}
                          <span className="mx-1.5 text-[#DEE2E6]">·</span>
                          <span className="tabular-nums">
                            {ws.memberCount} {ws.memberCount === 1 ? 'member' : 'members'}
                          </span>
                        </span>
                      </span>
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
