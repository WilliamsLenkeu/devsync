import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { useRef } from 'react';
import { useDocumentTitle } from '@/components/layout/useDocumentTitle';
import { EmptyState, ErrorState, PageHeader } from '@/components/states';
import { Skeleton } from '@/components/ui/skeleton';
import { InviteDialog } from '@/features/members/InviteDialog';
import { MembersTable } from '@/features/members/MembersTable';
import { PendingInvitations } from '@/features/members/PendingInvitations';
import { api } from '@/lib/api';
import { usePageEnter, useStaggerEnter } from '@/lib/motion';
import { qk } from '@/lib/queryKeys';
import type { Member } from '@/lib/types';
import { useWorkspace } from '@/lib/workspace';

/**
 * Design Read: Milk Desk roster — control panel + dense table,
 * ENERGY 2 / RHYTHM 3 / MOTION 2. One primary invite CTA.
 */
export function MembersPage() {
  useDocumentTitle('Members');
  const { workspace, can } = useWorkspace();
  const wid = workspace.id;
  const rootRef = useRef<HTMLDivElement>(null);
  const members = useQuery({
    queryKey: qk.members(wid),
    queryFn: () => api.get<Member[]>(`/workspaces/${wid}/members`),
  });

  usePageEnter(rootRef, [members.isSuccess, members.dataUpdatedAt]);
  useStaggerEnter(rootRef, '[data-stagger-item]', [members.isSuccess, members.dataUpdatedAt]);

  const count = workspace.memberCount;
  const people = count === 1 ? 'person' : 'people';

  return (
    <div ref={rootRef} className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Members"
        description={`${count} ${people} in ${workspace.name}.`}
        actions={can('member:invite') ? <InviteDialog workspaceId={wid} /> : undefined}
      />

      {members.isPending && (
        <div
          className="overflow-hidden rounded-lg border border-[#DEE2E6] bg-white"
          aria-busy="true"
          aria-label="Loading members"
        >
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 border-b border-[#DEE2E6] px-4 py-3 last:border-b-0"
            >
              <Skeleton className="size-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-56 max-w-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {members.isError && (
        <ErrorState error={members.error} onRetry={() => void members.refetch()} />
      )}

      {members.isSuccess && members.data.length === 0 && (
        <EmptyState
          icon={Users}
          title="No members yet"
          description="Invite teammates to share projects and tasks in this workspace."
          action={can('member:invite') ? <InviteDialog workspaceId={wid} /> : undefined}
        />
      )}

      {members.isSuccess && members.data.length > 0 && <MembersTable members={members.data} />}

      {can('member:invite') && members.isSuccess && (
        <div className="mt-8">
          <PendingInvitations workspaceId={wid} />
        </div>
      )}
    </div>
  );
}
