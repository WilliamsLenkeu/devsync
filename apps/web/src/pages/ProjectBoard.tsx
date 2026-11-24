import { Archive, ArrowLeft, KanbanSquare, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { EmptyState, ErrorState, PageHeader } from '@/components/states';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BoardToolbar } from '@/features/tasks/BoardToolbar';
import { CreateTaskDialog } from '@/features/tasks/CreateTaskDialog';
import { KanbanBoard } from '@/features/tasks/KanbanBoard';
import {
  hasActiveFilters,
  isManualOrder,
  parseBoardFilters,
  writeBoardFilters,
  type BoardFilters,
} from '@/features/tasks/boardLogic';
import { useProject, useProjectMembers, useProjectTasks } from '@/features/tasks/taskQueries';
import { useMoveTask } from '@/features/tasks/taskMutations';
import { useWorkspace } from '@/lib/workspace';

export function ProjectBoardPage() {
  const { projectId = '' } = useParams();
  const { workspace, can } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const [creating, setCreating] = useState(false);

  const filters = parseBoardFilters(params);
  const project = useProject(projectId);
  const members = useProjectMembers(projectId);
  const tasks = useProjectTasks(projectId, filters);
  const move = useMoveTask({ workspaceId: workspace.id, projectId });

  const archived = project.data?.status === 'ARCHIVED';
  const canWrite = can('task:write') && !archived;
  const manual = isManualOrder(filters);

  const updateFilters = (patch: Partial<BoardFilters>) =>
    setParams((prev) => writeBoardFilters(prev, { ...parseBoardFilters(prev), ...patch }), {
      replace: true,
    });
  const clearFilters = () =>
    setParams((prev) => writeBoardFilters(prev, parseBoardFilters(new URLSearchParams())), {
      replace: true,
    });

  if (project.isError) {
    return (
      <div className="p-6">
        <ErrorState error={project.error} onRetry={() => void project.refetch()} />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-4 sm:p-6">
      <PageHeader
        title={project.data?.name ?? 'Board'}
        description={
          project.data && (
            <>
              <span className="font-mono text-foreground/80">{project.data.identifier}</span>
              <span className="text-muted-foreground"> · Board</span>
            </>
          )
        }
        actions={
          <>
            <Link
              to={`/w/${workspace.id}/projects/${projectId}`}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              <ArrowLeft aria-hidden />
              Overview
            </Link>
            {canWrite && (
              <Button size="sm" onClick={() => setCreating(true)}>
                <Plus aria-hidden />
                New task
              </Button>
            )}
          </>
        }
      />

      {archived && (
        <div
          role="status"
          className="mb-4 flex items-start gap-2.5 rounded-md border border-border bg-muted/40 px-3 py-2.5 text-sm"
        >
          <Archive className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <div>
            <p className="font-medium">Project archived</p>
            <p className="text-muted-foreground">
              The board is read-only. Restore the project to edit tasks again.
            </p>
          </div>
        </div>
      )}

      <div className="mb-3 shrink-0">
        <BoardToolbar
          filters={filters}
          members={members.data ?? []}
          onChange={updateFilters}
          onClear={clearFilters}
        />
        {!manual && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Column reordering is off while filters or a custom sort are active. Cross-column moves
            still work.
          </p>
        )}
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {tasks.data ? (
          tasks.data.length === 0 && !hasActiveFilters(filters) ? (
            <EmptyState
              icon={KanbanSquare}
              title="No tasks yet"
              description="Create the first task to start the board."
              action={
                canWrite && (
                  <Button size="sm" onClick={() => setCreating(true)}>
                    <Plus aria-hidden />
                    New task
                  </Button>
                )
              }
            />
          ) : tasks.data.length === 0 ? (
            <EmptyState
              icon={KanbanSquare}
              title="No matching tasks"
              description="Nothing matches these filters. Clear them to see the full board."
              action={
                <Button size="sm" variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <KanbanBoard
              tasks={tasks.data}
              canDrag={canWrite}
              manualOrder={manual}
              onMove={(request) => move.mutate(request)}
            />
          )
        ) : tasks.isError ? (
          <ErrorState error={tasks.error} onRetry={() => void tasks.refetch()} />
        ) : (
          <BoardSkeleton />
        )}
      </div>

      {canWrite && (
        <CreateTaskDialog
          open={creating}
          onOpenChange={setCreating}
          scope={{ workspaceId: workspace.id, projectId }}
          members={members.data ?? []}
        />
      )}
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div
      className="flex min-h-0 gap-2 overflow-hidden"
      aria-busy="true"
      aria-label="Loading board"
    >
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="w-[16.5rem] shrink-0 space-y-2 sm:w-72">
          <Skeleton className="h-4 w-20" />
          <div className="space-y-1 rounded-md bg-muted/40 p-1">
            <Skeleton className="h-16 w-full rounded-md" />
            <Skeleton className="h-16 w-full rounded-md" />
            <Skeleton className="h-14 w-full rounded-md" />
          </div>
        </div>
      ))}
      <p className="sr-only">Loading board…</p>
    </div>
  );
}
