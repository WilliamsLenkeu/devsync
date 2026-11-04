import { useParams } from 'react-router-dom';
import { ErrorState } from '@/components/states';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectActivity } from '@/features/projects/ProjectActivity';
import { ProjectHeader } from '@/features/projects/ProjectHeader';
import { ProjectMembers } from '@/features/projects/ProjectMembers';
import { ProjectProgress } from '@/features/projects/ProjectProgress';
import { useProject } from '@/features/projects/queries';
import { useWorkspace } from '@/lib/workspace';

export function ProjectOverviewPage() {
  const { projectId = '' } = useParams();
  const { workspace, can } = useWorkspace();
  const project = useProject(projectId);
  const canManage = can('project:update');

  if (project.isPending) {
    return (
      <div className="space-y-6" aria-busy="true">
        <Skeleton className="h-28" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (project.isError)
    return <ErrorState error={project.error} onRetry={() => void project.refetch()} />;

  const p = project.data;
  return (
    <>
      <ProjectHeader project={p} canManage={canManage} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <ProjectProgress project={p} />
          <section aria-labelledby="activity-heading">
            <h2 id="activity-heading" className="mb-3 text-sm font-semibold">
              Activity
            </h2>
            <ProjectActivity projectId={p.id} />
          </section>
        </div>
        <ProjectMembers projectId={p.id} workspaceId={workspace.id} canManage={canManage} />
      </div>
    </>
  );
}
