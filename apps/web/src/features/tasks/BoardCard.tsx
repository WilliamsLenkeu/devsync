import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TaskPriority, TaskStatus } from '@devsync/shared';
import {
  CalendarDays,
  ChevronDown,
  ChevronsUp,
  ChevronUp,
  Equal,
  MessageSquare,
  UserRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { UserAvatar } from '@/components/UserAvatar';
import { cn } from '@/lib/utils';
import { formatDate, humanize, isOverdue } from '@/lib/format';
import type { Task } from '@/lib/types';
import { taskHref, withTaskParam } from './boardLogic';

export interface DragData {
  status: TaskStatus;
}

const PRIORITY: Record<TaskPriority, { icon: LucideIcon; className: string }> = {
  URGENT: { icon: ChevronsUp, className: 'text-destructive' },
  HIGH: { icon: ChevronUp, className: 'text-orange-600 dark:text-orange-400' },
  MEDIUM: { icon: Equal, className: 'text-primary' },
  LOW: { icon: ChevronDown, className: 'text-muted-foreground' },
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const { icon: Icon, className } = PRIORITY[priority];
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium', className)}>
      <Icon className="size-3.5" aria-hidden />
      {humanize(priority)}
    </span>
  );
}

/** Presentational card. Clicking it opens the detail sheet through `?task=`. */
export function TaskCardView({ task, overlay = false }: { task: Task; overlay?: boolean }) {
  const [params, setParams] = useSearchParams();
  const overdue = isOverdue(task.dueDate, task.status);
  const shownLabels = task.labels.slice(0, 3);

  return (
    <article
      className={cn(
        'relative rounded-md border bg-card p-3 shadow-xs transition-colors hover:border-primary/40 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring',
        overlay && 'rotate-1 shadow-lg',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-muted-foreground">{task.key}</span>
        <PriorityBadge priority={task.priority} />
      </div>
      <a
        href={taskHref(params, task.id)}
        onClick={(e) => {
          e.preventDefault();
          setParams(withTaskParam(params, task.id));
        }}
        className="mt-1.5 block text-sm leading-snug font-medium after:absolute after:inset-0 after:rounded-md focus-visible:outline-none"
      >
        {task.title}
      </a>
      {shownLabels.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1">
          {shownLabels.map((label) => (
            <li
              key={label.id}
              className="rounded px-1.5 py-0.5 text-[11px] font-medium"
              style={{ backgroundColor: `${label.color}26`, color: label.color }}
            >
              {label.name}
            </li>
          ))}
          {task.labels.length > shownLabels.length && (
            <li className="text-[11px] text-muted-foreground">
              +{task.labels.length - shownLabels.length}
            </li>
          )}
        </ul>
      )}
      <div className="mt-2.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex min-w-0 items-center gap-3">
          {task.dueDate && (
            <span
              className={cn('flex items-center gap-1', overdue && 'font-medium text-destructive')}
            >
              <CalendarDays className="size-3.5" aria-hidden />
              <span>
                {overdue ? `Overdue · ${formatDate(task.dueDate)}` : formatDate(task.dueDate)}
              </span>
            </span>
          )}
          {task.commentCount > 0 && (
            <span className="flex items-center gap-1" aria-label={`${task.commentCount} comments`}>
              <MessageSquare className="size-3.5" aria-hidden />
              {task.commentCount}
            </span>
          )}
        </div>
        {task.assignee ? (
          <UserAvatar user={task.assignee} />
        ) : (
          <span
            className="grid size-6 place-items-center rounded-full border border-dashed"
            title="Unassigned"
            aria-label="Unassigned"
          >
            <UserRound className="size-3" aria-hidden />
          </span>
        )}
      </div>
    </article>
  );
}

/** Sortable wrapper. Drag listeners are only attached when the user may move cards. */
export function SortableTaskCard({ task, canDrag }: { task: Task; canDrag: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { status: task.status } satisfies DragData,
    disabled: !canDrag,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...(canDrag ? attributes : {})}
      {...(canDrag ? listeners : {})}
      className={cn(canDrag && 'cursor-grab touch-manipulation', isDragging && 'opacity-40')}
    >
      <TaskCardView task={task} />
    </div>
  );
}
