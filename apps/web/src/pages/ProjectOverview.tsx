import gsap from 'gsap';
import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { ErrorState } from '@/components/states';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectActivity } from '@/features/projects/ProjectActivity';
import { ProjectHeader } from '@/features/projects/ProjectHeader';
import { ProjectKpis } from '@/features/projects/ProjectKpis';
import { ProjectMembers } from '@/features/projects/ProjectMembers';
import { ProjectRecentTasks } from '@/features/projects/ProjectRecentTasks';
import { ProjectWorkload } from '@/features/projects/ProjectWorkload';
import { useProject, useProjectTasks } from '@/features/projects/queries';
import { prefersReducedMotion } from '@/features/tasks/milk';
import { useWorkspace } from '@/lib/workspace';

/**
 * Vue project repensée (Milk Desk / Odoo) :
 * control panel → KPIs → work (tasks + workload) | team + activity.
 */
export function ProjectOverviewPage() {
  const { projectId = '' } = useParams();
  const { workspace, can } = useWorkspace();
  const project = useProject(projectId);
  const tasks = useProjectTasks(projectId);
  const canManage = can('project:update');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!project.data || prefersReducedMotion()) return;
    const root = rootRef.current;
    if (!root) return;
    const blocks = root.querySelectorAll('[data-milk-band]');
    const ctx = gsap.context(() => {
      gsap.fromTo(
        blocks,
        { autoAlpha: 0, y: 6 },
        { autoAlpha: 1, y: 0, duration: 0.3, stagger: 0.04, ease: 'power2.out' },
      );
    }, root);
    return () => ctx.revert();
  }, [project.data?.id]);

  if (project.isPending) {
    return <OverviewSkeleton />;
  }
  if (project.isError)
    return <ErrorState error={project.error} onRetry={() => void project.refetch()} />;

  const p = project.data;

  return (
    <div ref={rootRef} className="flex min-h-full flex-col bg-[#F8F9FA]">
      <div data-milk-band>
        <ProjectHeader project={p} canManage={canManage} />
      </div>

      <div className="flex flex-1 flex-col gap-5 px-4 py-5 md:px-6">
        <div data-milk-band>
          <ProjectKpis project={p} tasks={tasks.data} />
        </div>

        <div
          data-milk-band
          className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(18rem,0.85fr)]"
        >
          <div className="grid gap-5">
            <section
              aria-labelledby="about-heading"
              className="rounded-lg border border-[#DEE2E6] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,.04)]"
            >
              <h2
                id="about-heading"
                className="border-b border-[#DEE2E6] pb-2 text-sm font-semibold text-[#212529]"
              >
                About
              </h2>
              {p.description ? (
                <p className="mt-3 text-[14px] leading-relaxed text-[#212529] text-pretty">
                  {p.description}
                </p>
              ) : (
                <p className="mt-3 text-[14px] text-[#8F8F8F]">
                  No description yet
                  {canManage ? ' — use Edit to add one.' : '.'}
                </p>
              )}
            </section>

            <section
              aria-labelledby="tasks-heading"
              className="rounded-lg border border-[#DEE2E6] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,.04)]"
            >
              <div className="mb-3 flex items-end justify-between gap-2 border-b border-[#DEE2E6] pb-2">
                <h2 id="tasks-heading" className="text-sm font-semibold text-[#212529]">
                  Recent tasks
                </h2>
                <p className="text-[12px] text-[#8F8F8F]">Last updated first</p>
              </div>
              <ProjectRecentTasks projectId={p.id} workspaceId={workspace.id} />
            </section>

            <section
              aria-labelledby="workload-heading"
              className="rounded-lg border border-[#DEE2E6] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,.04)]"
            >
              <h2
                id="workload-heading"
                className="mb-3 border-b border-[#DEE2E6] pb-2 text-sm font-semibold text-[#212529]"
              >
                Workload by status
              </h2>
              <ProjectWorkload projectId={p.id} />
            </section>
          </div>

          <aside className="grid gap-5 content-start">
            <section className="rounded-lg border border-[#DEE2E6] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,.04)]">
              <ProjectMembers
                projectId={p.id}
                workspaceId={workspace.id}
                canManage={canManage}
              />
            </section>
            <section
              aria-labelledby="activity-heading"
              className="rounded-lg border border-[#DEE2E6] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,.04)]"
            >
              <h2
                id="activity-heading"
                className="mb-2 border-b border-[#DEE2E6] pb-2 text-sm font-semibold text-[#212529]"
              >
                Activity
              </h2>
              <ProjectActivity projectId={p.id} />
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="bg-[#F8F9FA]" aria-busy="true" aria-label="Loading project">
      <div className="border-b border-[#DEE2E6] bg-white px-4 py-3 md:px-6">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="mt-2 h-7 w-48" />
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4 md:px-6">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
