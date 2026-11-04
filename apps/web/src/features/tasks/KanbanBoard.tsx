import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Over,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { TASK_STATUSES, type TaskStatus } from '@devsync/shared';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { humanize } from '@/lib/format';
import type { Task } from '@/lib/types';
import { getDropTarget, groupByStatus, isNoopDrop, type DropTarget } from './boardLogic';
import { SortableTaskCard, TaskCardView, type DragData } from './BoardCard';

export interface MoveRequest extends DropTarget {
  taskId: string;
}

interface KanbanBoardProps {
  tasks: Task[];
  canDrag: boolean;
  /** False when filters or a custom sort are active: reordering inside a column is disabled. */
  manualOrder: boolean;
  onMove: (move: MoveRequest) => void;
}

const columnDomId = (status: TaskStatus) => `col:${status}`;

export function KanbanBoard({ tasks, canDrag, manualOrder, onMove }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const groups = useMemo(() => groupByStatus(tasks), [tasks]);
  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const draggedTask = activeId ? byId.get(activeId) : undefined;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const describe = (id: string) => {
    const task = byId.get(id);
    return task ? `${task.key} ${task.title}` : 'task';
  };
  const columnOf = (over: Over | null) => {
    const data = over?.data.current as DragData | undefined;
    return data ? humanize(data.status) : 'no column';
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    const task = byId.get(String(active.id));
    const data = over?.data.current as DragData | undefined;
    if (!over || !task || !data) return;
    const overId = byId.has(String(over.id)) ? String(over.id) : null;
    const target = getDropTarget(tasks, task.id, overId, data.status);
    if (!canDrag || (target.status === task.status && !manualOrder)) return;
    if (isNoopDrop(tasks, task.id, target)) return;
    onMove({ taskId: task.id, ...target });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={({ active }) => setActiveId(String(active.id))}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={handleDragEnd}
      accessibility={{
        announcements: {
          onDragStart: ({ active }) =>
            `Picked up ${describe(String(active.id))}. Use arrow keys to move, space to drop, escape to cancel.`,
          onDragOver: ({ active, over }) =>
            `${describe(String(active.id))} is over ${columnOf(over)}.`,
          onDragEnd: ({ active, over }) =>
            over
              ? `Dropped ${describe(String(active.id))} in ${columnOf(over)}.`
              : `Move cancelled.`,
          onDragCancel: ({ active }) => `Cancelled moving ${describe(String(active.id))}.`,
        },
      }}
    >
      <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-4">
        {TASK_STATUSES.map((status) => (
          <BoardColumn key={status} status={status} tasks={groups[status]} canDrag={canDrag} />
        ))}
      </div>
      <DragOverlay>{draggedTask && <TaskCardView task={draggedTask} overlay />}</DragOverlay>
    </DndContext>
  );
}

function BoardColumn({
  status,
  tasks,
  canDrag,
}: {
  status: TaskStatus;
  tasks: Task[];
  canDrag: boolean;
}) {
  const title = humanize(status);
  const { setNodeRef, isOver } = useDroppable({
    id: columnDomId(status),
    data: { status } satisfies DragData,
  });

  return (
    <section aria-labelledby={`column-${status}`} className="flex w-72 shrink-0 flex-col sm:w-80">
      <header className="flex items-center justify-between px-1 pb-2">
        <h2 id={`column-${status}`} className="text-sm font-medium">
          {title}
        </h2>
        <span
          className="rounded-full bg-muted px-2 text-xs text-muted-foreground tabular-nums"
          aria-label={`${tasks.length} tasks`}
        >
          {tasks.length}
        </span>
      </header>
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-32 flex-1 flex-col gap-2 rounded-lg border border-transparent bg-muted/50 p-2 transition-colors',
          isOver && 'border-primary/40 bg-accent/50',
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} canDrag={canDrag} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <p className="grid flex-1 place-items-center py-6 text-xs text-muted-foreground">
            No tasks in {title}
          </p>
        )}
      </div>
    </section>
  );
}
