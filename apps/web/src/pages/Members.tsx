import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { useDocumentTitle } from '@/components/layout/useDocumentTitle';
import { EmptyState, ErrorState, PageHeader } from '@/components/states';
import { Skeleton } from '@/components/ui/skeleton';
import { InviteDialog } from '@/features/members/InviteDialog';
import { MembersTable } from '@/features/members/MembersTable';
import { PendingInvitations } from '@/features/members/PendingInvitations';
import { api } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type { Member } from '@/lib/types';
import { useWorkspace } from '@/lib/workspace';

export function MembersPage() {
  useDocumentTitle('Members');
  const { workspace, can } = useWorkspace();
  const wid = workspace.id;
  const members = useQuery({
    queryKey: qk.members(wid),
    queryFn: () => api.get<Member[]>(`/workspaces/${wid}/members`),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-10 p-6">
      <PageHeader
        title="Members"
        description={`${workspace.memberCount} people in ${workspace.name}.`}
        actions={can('member:invite') ? <InviteDialog workspaceId={wid} /> : undefined}
      />

      {members.isPending && <Skeleton className="h-40 w-full" />}
      {members.isError && <ErrorState error={members.error} onRetry={() => void members.refetch()} />}
      {members.isSuccess && members.data.length === 0 && (
        <EmptyState icon={Users} title="No members" description="Invite someone to get started." />
      )}
      {members.isSuccess && members.data.length > 0 && <MembersTable members={members.data} />}

      {can('member:invite') && <PendingInvitations workspaceId={wid} />}
    </div>
  );
}
