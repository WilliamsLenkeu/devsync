import { useParams } from 'react-router-dom';
import { ErrorState } from '@/components/states';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectActivity } from '@/features/projects/ProjectActivity';
import { ProjectHeader } from '@/features/projects/ProjectHeader';
import { ProjectMembers } from '@/features/projects/ProjectMembers';
import { ProjectProgress } from '@/features/projects/ProjectProgress';
import { useProject } from '@/features/projects/queries';
import { useWorkspace } from '@/lib/workspace';

/**
 * Design Read: project hub before the board, dial ENERGY 2 / RHYTHM 2 / MOTION 1.
 * Job: open the board or check progress. Bands: header → progress → activity | members.
 */
export function ProjectOverviewPage() {
  const { projectId = '' } = useParams();
  const { workspace, can } = useWorkspace();
  const project = useProject(projectId);
  const canManage = can('project:update');

  if (project.isPending) {
    return <OverviewSkeleton />;
  }
  if (project.isError)
    return <ErrorState error={project.error} onRetry={() => void project.refetch()} />;

  const p = project.data;
  return (
    <div className="space-y-6">
      <ProjectHeader project={p} canManage={canManage} />
      <ProjectProgress project={p} />
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.85fr)] lg:gap-8">
        <section aria-labelledby="activity-heading" className="min-w-0 space-y-2">
          <h2 id="activity-heading" className="border-b border-border pb-2 text-sm font-semibold tracking-tight">
            Activity
          </h2>
          <ProjectActivity projectId={p.id} />
        </section>
        <ProjectMembers projectId={p.id} workspaceId={workspace.id} canManage={canManage} />
      </div>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading project">
      <div className="space-y-2.5 border-b border-border pb-5">
        <Skeleton className="h-4 w-20" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-14" />
        </div>
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-16" />
        </div>
      </div>
      <div className="space-y-3 border-y border-border py-4">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-10" />
        </div>
        <Skeleton className="h-2.5 w-full" />
        <div className="flex flex-col border-t border-border pt-3 sm:flex-row sm:divide-x">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-1 justify-between gap-2 py-1.5 sm:flex-col sm:px-3">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-5 w-6" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-7 lg:grid-cols-2">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <div className="divide-y border-t border-border">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 py-2.5">
                <Skeleton className="size-7 rounded-full" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <div className="divide-y border-t border-border pt-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <Skeleton className="size-8 rounded-full" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
