import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TaskPriority, TaskStatus } from '@devsync/shared';
import {
  CalendarDays,
  ChevronDown,
  ChevronsUp,
  ChevronUp,
  Equal,
  GripVertical,
  MessageSquare,
  UserRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { UserAvatar } from '@/components/UserAvatar';
import { cn } from '@/lib/utils';
import { formatDate, humanize, isOverdue } from '@/lib/format';
import type { Task } from '@/lib/types';
import { taskHref, withTaskParam } from './boardLogic';

export interface DragData {
  status: TaskStatus;
}

/** Priority is text + icon, never color alone (R-25 / color-only). */
const PRIORITY: Record<TaskPriority, { icon: LucideIcon; className: string }> = {
  URGENT: { icon: ChevronsUp, className: 'text-destructive' },
  HIGH: { icon: ChevronUp, className: 'text-foreground' },
  MEDIUM: { icon: Equal, className: 'text-primary' },
  LOW: { icon: ChevronDown, className: 'text-muted-foreground' },
};

export function PriorityBadge({
  priority,
  compact = false,
}: {
  priority: TaskPriority;
  compact?: boolean;
}) {
  const { icon: Icon, className } = PRIORITY[priority];
  const label = humanize(priority);
  return (
    <span
      className={cn('inline-flex items-center gap-1 text-xs font-medium', className)}
      title={label}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {!compact && <span>{label}</span>}
      {compact && <span className="sr-only">{label}</span>}
    </span>
  );
}

/**
 * Dense task surface for the board.
 * Identity motif: mono key. Signal accent on selected / drag overlay.
 */
export function TaskCardView({
  task,
  overlay = false,
  selected = false,
  dragHandle,
}: {
  task: Task;
  overlay?: boolean;
  selected?: boolean;
  dragHandle?: ReactNode;
}) {
  const [params, setParams] = useSearchParams();
  const overdue = isOverdue(task.dueDate, task.status);
  const shownLabels = task.labels.slice(0, 3);

  return (
    <article
      className={cn(
        'relative border border-border bg-card p-2.5',
        'rounded-md',
        'motion-safe:transition-[border-color,background-color,box-shadow] motion-safe:duration-150',
        'hover:border-primary/55 hover:bg-accent/30',
        'has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-ring',
        overlay && 'border-primary bg-accent/40 shadow-sm ring-1 ring-primary/35',
        selected && !overlay && 'border-primary bg-accent/35 ring-1 ring-primary/40',
      )}
    >
      <div className="flex items-start gap-0.5">
        {dragHandle}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[11px] font-semibold tracking-tight text-foreground/75">
              {task.key}
            </span>
            <PriorityBadge priority={task.priority} compact />
          </div>
          <a
            href={taskHref(params, task.id)}
            onClick={(e) => {
              e.preventDefault();
              setParams(withTaskParam(params, task.id));
            }}
            className="mt-0.5 block text-[13px] leading-snug font-medium text-pretty after:absolute after:inset-0 after:rounded-md focus-visible:outline-none"
          >
            {task.title}
          </a>
        </div>
      </div>

      {shownLabels.length > 0 && (
        <ul className="mt-1.5 flex flex-wrap gap-1">
          {shownLabels.map((label) => (
            <li
              key={label.id}
              className="rounded-sm px-1.5 py-px text-[10px] font-medium"
              style={{ backgroundColor: `${label.color}26`, color: label.color }}
            >
              {label.name}
            </li>
          ))}
          {task.labels.length > shownLabels.length && (
            <li className="text-[10px] text-muted-foreground">
              +{task.labels.length - shownLabels.length}
            </li>
          )}
        </ul>
      )}

      <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <div className="flex min-w-0 items-center gap-2">
          {task.dueDate && (
            <span
              className={cn(
                'flex items-center gap-1 tabular-nums',
                overdue &&
                  'rounded-sm bg-destructive/10 px-1 py-px font-semibold text-destructive',
              )}
            >
              <CalendarDays className="size-3 shrink-0" aria-hidden />
              <span>
                {overdue ? `Overdue · ${formatDate(task.dueDate)}` : formatDate(task.dueDate)}
              </span>
            </span>
          )}
          {task.commentCount > 0 && (
            <span
              className="flex items-center gap-1 tabular-nums"
              aria-label={`${task.commentCount} comments`}
            >
              <MessageSquare className="size-3 shrink-0" aria-hidden />
              {task.commentCount}
            </span>
          )}
        </div>
        {task.assignee ? (
          <UserAvatar user={task.assignee} className="size-5" />
        ) : (
          <span
            className="grid size-5 place-items-center rounded-full border border-dashed border-border"
            title="Unassigned"
            aria-label="Unassigned"
          >
            <UserRound className="size-2.5" aria-hidden />
          </span>
        )}
      </div>
    </article>
  );
}

/** Drag listeners live on a dedicated grip so the title link stays clickable. */
export function SortableTaskCard({ task, canDrag }: { task: Task; canDrag: boolean }) {
  const [params] = useSearchParams();
  const selected = params.get('task') === task.id;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { status: task.status } satisfies DragData,
    disabled: !canDrag,
  });

  const handle = canDrag ? (
    <button
      type="button"
      className={cn(
        'relative z-10 -ml-1 grid size-8 shrink-0 place-items-center rounded-md',
        'cursor-grab touch-manipulation text-muted-foreground',
        'hover:bg-muted hover:text-foreground',
        'focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        'active:cursor-grabbing',
        'motion-safe:transition-colors motion-safe:duration-150',
      )}
      aria-label={`Move ${task.key}`}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="size-3.5" aria-hidden />
    </button>
  ) : undefined;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && 'opacity-35')}
    >
      <TaskCardView task={task} selected={selected} dragHandle={handle} />
    </div>
  );
}
