import { useQuery } from '@tanstack/react-query';
import { FolderKanban, Plus } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { EmptyState, ErrorState, PageHeader } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AssignedTasks } from '@/features/dashboard/AssignedTasks';
import { ProjectProgressList } from '@/features/dashboard/ProjectProgressList';
import { RecentActivity } from '@/features/dashboard/RecentActivity';
import { StatCards } from '@/features/dashboard/StatCards';
import { CreateProjectDialog } from '@/features/projects/ProjectFormDialog';
import { api } from '@/lib/api';
import { usePageEnter, useStaggerEnter } from '@/lib/motion';
import { qk } from '@/lib/queryKeys';
import type { Dashboard } from '@/lib/types';
import { useWorkspace } from '@/lib/workspace';

/**
 * Design Read: Milk Desk home — control panel + Material cards,
 * ENERGY 2 / RHYTHM 3 / MOTION 2. One primary CTA.
 */
export function DashboardPage() {
  const { workspace, can } = useWorkspace();
  const [createOpen, setCreateOpen] = useState(false);
  const canCreate = can('project:create');
  const rootRef = useRef<HTMLDivElement>(null);
  const dashboard = useQuery({
    queryKey: qk.dashboard(workspace.id),
    queryFn: () => api.get<Dashboard>(`/workspaces/${workspace.id}/dashboard`),
  });

  usePageEnter(rootRef, [dashboard.isSuccess, dashboard.dataUpdatedAt]);
  useStaggerEnter(rootRef, '[data-stagger-item]', [
    dashboard.isSuccess,
    dashboard.dataUpdatedAt,
    dashboard.data?.projectProgress.length,
  ]);

  let content: ReactNode;
  if (dashboard.isPending) {
    content = <DashboardSkeleton />;
  } else if (dashboard.isError) {
    content = <ErrorState error={dashboard.error} onRetry={() => void dashboard.refetch()} />;
  } else if (dashboard.data.projectProgress.length === 0) {
    content = (
      <EmptyState
        icon={FolderKanban}
        title="No projects yet"
        description="Create a project to group tasks on a board and track progress with your team."
        action={
          canCreate && (
            <Button
              className="bg-[#017E84] text-white hover:bg-[#016a6f]"
              onClick={() => setCreateOpen(true)}
            >
              <Plus aria-hidden />
              Create your first project
            </Button>
          )
        }
      />
    );
  } else {
    const data = dashboard.data;
    content = (
      <div className="space-y-5">
        <StatCards totals={data.totals} />
        <AssignedTasks workspaceId={workspace.id} assigned={data.assignedToMe} />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <ProjectProgressList workspaceId={workspace.id} projects={data.projectProgress} />
          <RecentActivity activity={data.recentActivity} />
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Dashboard"
        description={workspace.name}
        actions={
          canCreate &&
          !dashboard.isPending &&
          !dashboard.isError &&
          (dashboard.data?.projectProgress.length ?? 0) > 0 && (
            <Button
              className="bg-[#017E84] text-white hover:bg-[#016a6f]"
              onClick={() => setCreateOpen(true)}
            >
              <Plus aria-hidden />
              Create project
            </Button>
          )
        }
      />
      {content}
      {canCreate && (
        <CreateProjectDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          workspaceId={workspace.id}
        />
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-[#DEE2E6] bg-white p-3.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-2 h-7 w-10" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-[#DEE2E6] bg-white p-4">
        <Skeleton className="mb-3 h-4 w-28" />
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
