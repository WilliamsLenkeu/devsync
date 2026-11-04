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
        description="Projects group tasks on a board. Create one to start tracking work with your team."
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
      <div className="space-y-6">
        <StatCards totals={data.totals} />
        <div className="grid gap-6 lg:grid-cols-3">
          <AssignedTasks workspaceId={workspace.id} assigned={data.assignedToMe} className="lg:col-span-2" />
          <ProjectProgressList workspaceId={workspace.id} projects={data.projectProgress} />
        </div>
        <RecentActivity activity={data.recentActivity} />
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Dashboard" description={workspace.name} />
      {content}
      {canCreate && <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} workspaceId={workspace.id} />}
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
