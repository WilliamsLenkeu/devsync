import { useQuery } from '@tanstack/react-query';
import { FolderKanban, Plus } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { EmptyState, ErrorState, PageHeader } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AssignedTasks } from '@/features/dashboard/AssignedTasks';
import { ProjectProgressList } from '@/features/dashboard/ProjectProgressList';
import { RecentActivity } from '@/features/dashboard/RecentActivity';
import { StatCards } from '@/features/dashboard/StatCards';
import { CreateProjectDialog } from '@/features/projects/ProjectFormDialog';
import { api } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type { Dashboard } from '@/lib/types';
import { useWorkspace } from '@/lib/workspace';

/**
 * Design Read: app home for eng teammates, signal-console language,
 * dial ENERGY 2 / RHYTHM 2 / MOTION 1.
 * Job: see my open work, then project progress, then recent noise.
 * Composition: totals strip → assigned band → progress + activity stack (not card grid).
 */
export function DashboardPage() {
  const { workspace, can } = useWorkspace();
  const [createOpen, setCreateOpen] = useState(false);
  const canCreate = can('project:create');
  const dashboard = useQuery({
    queryKey: qk.dashboard(workspace.id),
    queryFn: () => api.get<Dashboard>(`/workspaces/${workspace.id}/dashboard`),
  });

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
            <Button onClick={() => setCreateOpen(true)}>
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
      <div className="space-y-7">
        <StatCards totals={data.totals} />
        <AssignedTasks workspaceId={workspace.id} assigned={data.assignedToMe} />
        <div className="grid gap-7 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-8">
          <ProjectProgressList workspaceId={workspace.id} projects={data.projectProgress} />
          <RecentActivity activity={data.recentActivity} />
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={workspace.name}
        actions={
          canCreate &&
          !dashboard.isPending &&
          !dashboard.isError &&
          (dashboard.data?.projectProgress.length ?? 0) > 0 && (
            <Button onClick={() => setCreateOpen(true)}>
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
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-7" aria-busy="true" aria-label="Loading dashboard">
      <div className="flex flex-col border-y sm:flex-row sm:divide-x">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex flex-1 items-baseline justify-between gap-3 border-b py-2.5 last:border-b-0 sm:flex-col sm:gap-1 sm:border-b-0 sm:px-5 sm:py-3.5 first:sm:pl-0"
          >
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-7 w-10" />
          </div>
        ))}
      </div>
      <div>
        <Skeleton className="mb-2 h-4 w-28" />
        <div className="divide-y border-t">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 py-2.5">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-5 w-14" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-7 lg:grid-cols-2">
        <div>
          <Skeleton className="mb-2 h-4 w-32" />
          <div className="space-y-3 border-t pt-2.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-2.5 w-full" />
              </div>
            ))}
          </div>
        </div>
        <div>
          <Skeleton className="mb-2 h-4 w-28" />
          <div className="divide-y border-t">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 py-2.5">
                <Skeleton className="size-7 rounded-full" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
