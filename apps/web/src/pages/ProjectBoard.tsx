import { Archive, ArrowLeft, KanbanSquare, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { InlineNotice, NoticeDialog, notify } from '@/components/feedback';
import { EmptyState, ErrorState } from '@/components/states';
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
import { errorMessage } from '@/lib/api';
import { useWorkspace } from '@/lib/workspace';

/** Milk Desk board — control panel + light kanban. */
export function ProjectBoardPage() {
  const { projectId = '' } = useParams();
  const { workspace, can } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const [creating, setCreating] = useState(false);
  const [loadHelpOpen, setLoadHelpOpen] = useState(false);

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
      <div className="bg-[#F8F9FA] p-6">
        <ErrorState error={project.error} onRetry={() => void project.refetch()} />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#F8F9FA]">
      {/* Control panel */}
      <div className="shrink-0 border-b border-[#DEE2E6] bg-white px-4 pt-3 sm:px-5">
        <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              to={`/w/${workspace.id}/projects/${projectId}`}
              className={buttonVariants({
                variant: 'ghost',
                size: 'sm',
                className: '-ml-2 h-8 text-[#8F8F8F] hover:text-[#212529]',
              })}
            >
              <ArrowLeft aria-hidden />
              Overview
            </Link>
            <h1 className="truncate text-lg font-semibold text-[#212529]">
              {project.data?.name ?? 'Board'}
            </h1>
            {project.data && (
              <p className="mt-0.5 text-sm text-[#8F8F8F]">
                <span className="font-mono text-[#017E84]">{project.data.identifier}</span>
                {' · '}Board
              </p>
            )}
          </div>
        </div>

        {archived && (
          <div
            role="status"
            className="mb-2 flex items-start gap-2.5 rounded-lg border border-[#DEE2E6] bg-[#FFF3CD] px-3 py-2 text-sm text-[#856404]"
          >
            <Archive className="mt-0.5 size-4 shrink-0" aria-hidden />
            <div>
              <p className="font-medium">Project archived</p>
              <p className="text-[13px]">
                The board is read-only. Restore the project to edit tasks again.
              </p>
            </div>
          </div>
        )}

        <BoardToolbar
          filters={filters}
          members={members.data ?? []}
          onChange={updateFilters}
          onClear={clearFilters}
          primaryAction={
            canWrite ? (
              <Button
                size="sm"
                className="h-9 bg-[#017E84] text-white hover:bg-[#016A6F]"
                onClick={() => setCreating(true)}
              >
                <Plus aria-hidden />
                New task
              </Button>
            ) : undefined
          }
        />
        {!manual && (
          <div className="pb-3">
            <InlineNotice
              tone="info"
              title="Manual reorder paused"
              description="Column reordering is off while filters or a custom sort are active. Cross-column moves still work."
            />
          </div>
        )}
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 p-3 sm:p-4">
        {tasks.isError && (
          <InlineNotice
            tone="error"
            title="Board failed to load"
            description={errorMessage(tasks.error)}
            action={
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="h-8 bg-[#017E84] text-white hover:bg-[#016A6F]"
                  onClick={() => {
                    void tasks.refetch().then((r) => {
                      if (r.isError) notify.error('Still failing', { description: errorMessage(r.error) });
                      else notify.success('Board reloaded');
                    });
                  }}
                >
                  Try again
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 border-[#F5C6CB] bg-white"
                  onClick={() => setLoadHelpOpen(true)}
                >
                  Details
                </Button>
              </div>
            }
          />
        )}

        {tasks.data ? (
          tasks.data.length === 0 && !hasActiveFilters(filters) ? (
            <EmptyState
              icon={KanbanSquare}
              title="No tasks yet"
              description="Create the first task to start the board."
              action={
                canWrite && (
                  <Button
                    size="sm"
                    className="bg-[#017E84] text-white hover:bg-[#016A6F]"
                    onClick={() => setCreating(true)}
                  >
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
        ) : tasks.isError ? null : (
          <BoardSkeleton />
        )}
      </div>

      <NoticeDialog
        open={loadHelpOpen}
        onOpenChange={setLoadHelpOpen}
        tone="error"
        title="Could not load the board"
        description={
          tasks.error
            ? errorMessage(tasks.error)
            : 'Check that the API is reachable, then retry.'
        }
        confirmLabel="Retry"
        cancelLabel="Close"
        onConfirm={() => {
          setLoadHelpOpen(false);
          void tasks.refetch();
        }}
      />

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
    <div className="flex min-h-0 gap-3 overflow-hidden" aria-busy="true" aria-label="Loading board">
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          className="w-[17rem] shrink-0 space-y-2 rounded-lg border border-[#DEE2E6] bg-[#F8F9FA] p-2 sm:w-72"
        >
          <Skeleton className="h-8 w-full rounded-md bg-white" />
          <Skeleton className="h-20 w-full rounded-lg bg-white" />
          <Skeleton className="h-20 w-full rounded-lg bg-white" />
          <Skeleton className="h-16 w-full rounded-lg bg-white" />
        </div>
      ))}
      <p className="sr-only">Loading board…</p>
    </div>
  );
}
