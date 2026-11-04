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
              New project
            </Button>
          )
        }
      />

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList>
          {FILTERS.map((f) => (
            <TabsTrigger key={f.value} value={f.value}>
              {f.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={filter} className="pt-4">
          {projects.isPending && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-48 rounded-xl" />
              ))}
            </div>
          )}
          {projects.isError && <ErrorState error={projects.error} onRetry={() => void projects.refetch()} />}
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

      {canCreate && <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} workspaceId={workspace.id} />}
    </>
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
  if (projects.length === 0) {
    return (
      <EmptyState
        icon={FolderKanban}
        title={EMPTY_TITLE[filter]}
        description={
          filter === 'ALL'
            ? 'A project groups tasks on a Kanban board, with its own members and activity.'
            : 'Switch to another filter to see the rest of your projects.'
        }
        action={
          onCreate &&
          filter === 'ALL' && (
            <Button onClick={onCreate}>
              <Plus aria-hidden />
              New project
            </Button>
          )
        }
      />
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {projects.map((p) => (
        <li key={p.id}>
          <ProjectCard project={p} workspaceId={workspaceId} />
        </li>
      ))}
    </ul>
  );
}
