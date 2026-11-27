import gsap from 'gsap';
import { Archive, FolderKanban, Plus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { EmptyState, ErrorState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreateProjectDialog } from '@/features/projects/ProjectFormDialog';
import { ProjectCard } from '@/features/projects/ProjectCard';
import { useProjects } from '@/features/projects/queries';
import { prefersReducedMotion } from '@/features/tasks/milk';
import type { Project } from '@/lib/types';
import type { ProjectStatus } from '@devsync/shared';
import { useWorkspace } from '@/lib/workspace';

type Filter = 'ALL' | ProjectStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ARCHIVED', label: 'Archived' },
];

/** Index projets Milk — control panel + KPI + grille de cartes. */
export function ProjectListPage() {
  const { workspace, can } = useWorkspace();
  const [filter, setFilter] = useState<Filter>('ALL');
  const [createOpen, setCreateOpen] = useState(false);
  const projects = useProjects(workspace.id, filter === 'ALL' ? undefined : filter);
  const allProjects = useProjects(workspace.id);
  const canCreate = can('project:create');
  const openCreate = () => setCreateOpen(true);

  const summary = useMemo(() => {
    const list = allProjects.data ?? [];
    const active = list.filter((p) => p.status === 'ACTIVE').length;
    const archived = list.filter((p) => p.status === 'ARCHIVED').length;
    const tasks = list.reduce((n, p) => n + p.taskCounts.total, 0);
    const done = list.reduce((n, p) => n + p.taskCounts.done, 0);
    return { total: list.length, active, archived, tasks, done };
  }, [allProjects.data]);

  return (
    <div className="flex min-h-full flex-col bg-[#F8F9FA]">
      <header className="sticky top-0 z-10 border-b border-[#DEE2E6] bg-white/95 px-4 py-3 backdrop-blur-sm md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-[#212529]">Projects</h1>
            <p className="mt-0.5 text-[14px] text-[#8F8F8F]">
              Boards, progress and overview for each project.
            </p>
          </div>
          {canCreate ? (
            <Button className="bg-[#017E84] text-white hover:bg-[#016A6F]" onClick={openCreate}>
              <Plus aria-hidden />
              Create project
            </Button>
          ) : null}
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-5 px-4 py-5 md:px-6">
        <section
          aria-label="Workspace project summary"
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        >
          <SummaryTile label="Projects" value={String(summary.total)} hint="in this workspace" />
          <SummaryTile label="Active" value={String(summary.active)} hint="ready for work" accent />
          <SummaryTile
            label="Tasks"
            value={String(summary.tasks)}
            hint={`${summary.done} done`}
          />
          <SummaryTile
            label="Archived"
            value={String(summary.archived)}
            hint="read-only"
            icon
          />
        </section>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList
            variant="line"
            aria-label="Filter projects by status"
            className="bg-transparent"
          >
            {FILTERS.map((f) => (
              <TabsTrigger
                key={f.value}
                value={f.value}
                className="data-[state=active]:text-[#017E84] data-[state=active]:after:bg-[#017E84]"
              >
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value={filter} className="pt-4">
            {projects.isPending && <ProjectListSkeleton />}
            {projects.isError && (
              <ErrorState error={projects.error} onRetry={() => void projects.refetch()} />
            )}
            {projects.data && (
              <ProjectsGrid
                projects={projects.data}
                workspaceId={workspace.id}
                filter={filter}
                onCreate={canCreate ? openCreate : undefined}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      {canCreate ? (
        <CreateProjectDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          workspaceId={workspace.id}
        />
      ) : null}
    </div>
  );
}

function SummaryTile({
  label,
  value,
  hint,
  accent,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
  icon?: boolean;
}) {
  return (
    <div
      className={
        accent
          ? 'rounded-lg border border-[#017E84]/35 bg-white p-3.5 shadow-[0_1px_2px_rgba(0,0,0,.04)]'
          : 'rounded-lg border border-[#DEE2E6] bg-white p-3.5 shadow-[0_1px_2px_rgba(0,0,0,.04)]'
      }
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-medium tracking-wide text-[#8F8F8F] uppercase">{label}</p>
        {icon ? <Archive className="size-4 text-[#8F8F8F]" aria-hidden /> : null}
      </div>
      <p
        className={
          accent
            ? 'mt-1 text-2xl font-semibold tabular-nums text-[#017E84]'
            : 'mt-1 text-2xl font-semibold tabular-nums text-[#212529]'
        }
      >
        {value}
      </p>
      <p className="mt-0.5 text-[13px] text-[#8F8F8F]">{hint}</p>
    </div>
  );
}

const EMPTY_TITLE: Record<Filter, string> = {
  ALL: 'No projects yet',
  ACTIVE: 'No active projects',
  ARCHIVED: 'No archived projects',
};

function ProjectsGrid({
  projects,
  workspaceId,
  filter,
  onCreate,
}: {
  projects: Project[];
  workspaceId: string;
  filter: Filter;
  onCreate?: () => void;
}) {
  const gridRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || prefersReducedMotion() || projects.length === 0) return;
    const cards = grid.querySelectorAll(':scope > li');
    const ctx = gsap.context(() => {
      gsap.fromTo(
        cards,
        { autoAlpha: 0, y: 8 },
        { autoAlpha: 1, y: 0, duration: 0.28, stagger: 0.04, ease: 'power2.out' },
      );
    }, grid);
    return () => ctx.revert();
  }, [projects]);

  if (projects.length === 0) {
    return (
      <EmptyState
        icon={FolderKanban}
        title={EMPTY_TITLE[filter]}
        description={
          filter === 'ALL'
            ? 'A project groups tasks on a board, with its own members and activity.'
            : 'Switch to another filter to see the rest of your projects.'
        }
        action={
          onCreate &&
          filter === 'ALL' && (
            <Button className="bg-[#017E84] text-white hover:bg-[#016A6F]" onClick={onCreate}>
              <Plus aria-hidden />
              Create project
            </Button>
          )
        }
      />
    );
  }

  return (
    <ul
      ref={gridRef}
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
    >
      {projects.map((p) => (
        <li key={p.id}>
          <ProjectCard project={p} workspaceId={workspaceId} />
        </li>
      ))}
    </ul>
  );
}

function ProjectListSkeleton() {
  return (
    <div
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
      aria-busy="true"
      aria-label="Loading projects"
    >
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border border-[#DEE2E6] bg-white p-4">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="mt-3 h-5 w-40" />
          <Skeleton className="mt-2 h-10 w-full" />
          <Skeleton className="mt-4 h-2 w-full" />
        </div>
      ))}
    </div>
  );
}
