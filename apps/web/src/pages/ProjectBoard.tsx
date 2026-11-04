import { ArrowLeft, KanbanSquare, Plus } from 'lucide-react';
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
    <div className="flex min-h-0 flex-1 flex-col p-6">
      <PageHeader
        title={project.data?.name ?? 'Board'}
        description={
          project.data && (
            <>
              <span className="font-mono">{project.data.identifier}</span> · Board
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
              Project overview
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
        <p
          role="status"
          className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm"
        >
          This project is archived. The board is read-only.
        </p>
      )}

      <div className="mb-3">
        <BoardToolbar
          filters={filters}
          members={members.data ?? []}
          onChange={updateFilters}
          onClear={clearFilters}
        />
        {!manual && (
          <p className="mt-2 text-xs text-muted-foreground">
            Reordering inside a column is disabled while filters or a custom sort are active. Moving
            cards between columns still works.
          </p>
        )}
      </div>

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
    <div className="flex gap-3 overflow-hidden" aria-busy="true" aria-label="Loading board">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="w-72 shrink-0 space-y-2 sm:w-80">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ))}
    </div>
  );
}
