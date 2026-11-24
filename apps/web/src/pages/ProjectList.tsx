import { FolderKanban, Plus } from 'lucide-react';
import { useState } from 'react';
import { EmptyState, ErrorState, PageHeader } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreateProjectDialog } from '@/features/projects/ProjectFormDialog';
import { ProjectCard } from '@/features/projects/ProjectCard';
import { useProjects } from '@/features/projects/queries';
import type { Project } from '@/lib/types';
import type { ProjectStatus } from '@devsync/shared';
import { useWorkspace } from '@/lib/workspace';

type Filter = 'ALL' | ProjectStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ARCHIVED', label: 'Archived' },
];

/**
 * Design Read: project index for eng teammates, dial ENERGY 2 / RHYTHM 2 / MOTION 1.
 * Job: pick a project to open. Flat rows, not a card mosaic.
 */
export function ProjectListPage() {
  const { workspace, can } = useWorkspace();
  const [filter, setFilter] = useState<Filter>('ALL');
  const [createOpen, setCreateOpen] = useState(false);
  const projects = useProjects(workspace.id, filter === 'ALL' ? undefined : filter);
  const canCreate = can('project:create');
  const openCreate = () => setCreateOpen(true);

  return (
    <>
      <PageHeader
        title="Projects"
        description="Boards, tasks and progress for each project."
        actions={
          canCreate && (
            <Button onClick={openCreate}>
              <Plus aria-hidden />
              Create project
            </Button>
          )
        }
      />

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList variant="line" aria-label="Filter projects by status">
          {FILTERS.map((f) => (
            <TabsTrigger key={f.value} value={f.value}>
              {f.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={filter} className="pt-2">
          {projects.isPending && <ProjectListSkeleton />}
          {projects.isError && (
            <ErrorState error={projects.error} onRetry={() => void projects.refetch()} />
          )}
          {projects.data && (
            <ProjectsList
              projects={projects.data}
              workspaceId={workspace.id}
              filter={filter}
              onCreate={canCreate ? openCreate : undefined}
            />
          )}
        </TabsContent>
      </Tabs>

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

const EMPTY_TITLE: Record<Filter, string> = {
  ALL: 'No projects yet',
  ACTIVE: 'No active projects',
  ARCHIVED: 'No archived projects',
};

function ProjectsList({
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
            <Button onClick={onCreate}>
              <Plus aria-hidden />
              Create project
            </Button>
          )
        }
      />
    );
  }

  return (
    <div>
      <div className="hidden border-b border-border py-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase sm:grid sm:grid-cols-[minmax(0,1fr)_11rem_7rem] sm:gap-6">
        <span>Project</span>
        <span>Progress</span>
        <span className="text-right">Updated</span>
      </div>
      <ul>
        {projects.map((p) => (
          <li key={p.id}>
            <ProjectCard project={p} workspaceId={workspaceId} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProjectListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading projects">
      <div className="hidden border-b py-2 sm:grid sm:grid-cols-[minmax(0,1fr)_11rem_7rem] sm:gap-6">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="ml-auto h-3 w-14" />
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="grid grid-cols-1 gap-2.5 border-b border-border py-3 sm:grid-cols-[minmax(0,1fr)_11rem_7rem] sm:items-center sm:gap-6"
        >
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56 max-w-full" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-2.5 w-full" />
          </div>
          <Skeleton className="h-3 w-20 sm:ml-auto" />
        </div>
      ))}
    </div>
  );
}
