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
import gsap from 'gsap';
import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { humanize } from '@/lib/format';
import type { Task } from '@/lib/types';
import { getDropTarget, groupByStatus, isNoopDrop, type DropTarget } from './boardLogic';
import { SortableTaskCard, TaskCardView, type DragData } from './BoardCard';
import { STATUS_ACCENT, STATUS_CHIP, prefersReducedMotion } from './milk';

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
  const rootRef = useRef<HTMLDivElement>(null);
  const groups = useMemo(() => groupByStatus(tasks), [tasks]);
  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const draggedTask = activeId ? byId.get(activeId) : undefined;
  const taskSignature = tasks.map((t) => t.id).join(',');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion()) return;

    const cols = root.querySelectorAll<HTMLElement>('[data-milk-col]');
    const cards = root.querySelectorAll<HTMLElement>('[data-milk-card]');
    const ctx = gsap.context(() => {
      gsap.fromTo(
        cols,
        { autoAlpha: 0, y: 10 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.28,
          stagger: 0.04,
          ease: 'power2.out',
          clearProps: 'transform',
        },
      );
      if (cards.length) {
        gsap.fromTo(
          cards,
          { autoAlpha: 0, y: 6 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.22,
            stagger: 0.02,
            delay: 0.08,
            ease: 'power2.out',
            clearProps: 'transform',
          },
        );
      }
    }, root);

    return () => ctx.revert();
  }, [taskSignature]);

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
      <div
        ref={rootRef}
        className="-mx-1 flex min-h-0 min-w-0 flex-1 gap-3 overflow-x-auto overflow-y-hidden px-1 pb-2"
      >
        {TASK_STATUSES.map((status) => (
          <BoardColumn key={status} status={status} tasks={groups[status]} canDrag={canDrag} />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {draggedTask && <TaskCardView task={draggedTask} overlay />}
      </DragOverlay>
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
  const accent = STATUS_ACCENT[status];

  return (
    <section
      data-milk-col
      aria-labelledby={`column-${status}`}
      className="flex w-[min(100%,17.5rem)] shrink-0 flex-col overflow-hidden rounded-lg border border-[#DEE2E6] bg-white shadow-[0_1px_2px_rgba(0,0,0,.04)] sm:w-72"
    >
      <div className="h-1 w-full shrink-0" style={{ backgroundColor: accent }} aria-hidden />
      <header className="flex items-center gap-2 border-b border-[#DEE2E6] bg-[#F8F9FA] px-3 py-2.5">
        <h2 id={`column-${status}`} className="min-w-0 flex-1 truncate text-sm font-semibold text-[#212529]">
          {title}
        </h2>
        <span
          className={cn(
            'rounded-full px-1.5 py-0.5 font-mono text-[11px] font-medium tabular-nums',
            STATUS_CHIP[status],
          )}
          aria-label={`${tasks.length} tasks`}
        >
          {tasks.length}
        </span>
      </header>

      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-32 flex-1 flex-col gap-2 bg-[#F8F9FA] p-2 motion-safe:transition-[box-shadow,background-color] motion-safe:duration-150',
          isOver && 'bg-[#017E84]/08 ring-2 ring-inset ring-[#017E84]/35',
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} canDrag={canDrag} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <p className="grid flex-1 place-items-center rounded-md border border-dashed border-[#DEE2E6] bg-white/70 px-2 py-10 text-center text-[12px] text-[#8F8F8F] text-balance">
            Drop tasks here
            <span className="sr-only">. {title} is empty.</span>
          </p>
        )}
      </div>
    </section>
  );
}
