import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import gsap from 'gsap';
import type { TaskPriority, TaskStatus } from '@devsync/shared';
import {
  CalendarDays,
  GripVertical,
  MessageSquare,
  UserRound,
} from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { UserAvatar } from '@/components/UserAvatar';
import { cn } from '@/lib/utils';
import { formatDate, humanize, isOverdue } from '@/lib/format';
import type { Task } from '@/lib/types';
import { taskHref, withTaskParam } from './boardLogic';
import { MILK, PRIORITY_CHIP, prefersReducedMotion } from './milk';

export interface DragData {
  status: TaskStatus;
}

/** Readable Milk badge — text + tone, never color alone. */
export function PriorityBadge({
  priority,
}: {
  priority: TaskPriority;
  /** @deprecated kept for call-site compat */
  compact?: boolean;
}) {
  const label = humanize(priority);
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
        PRIORITY_CHIP[priority],
      )}
      title={label}
    >
      {label}
    </span>
  );
}

/**
 * Milk Desk task card — white surface, soft elevation, teal selection.
 * Hover lift on inner node so DnD transform stays on the sortable wrapper.
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
  const liftRef = useRef<HTMLElement>(null);

  const onEnter = () => {
    if (overlay || prefersReducedMotion() || !liftRef.current) return;
    gsap.to(liftRef.current, {
      y: -2,
      boxShadow: MILK.shadowLift,
      duration: 0.18,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  };
  const onLeave = () => {
    if (overlay || prefersReducedMotion() || !liftRef.current) return;
    gsap.to(liftRef.current, {
      y: 0,
      boxShadow: MILK.shadow,
      duration: 0.2,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  };

  return (
    <article
      ref={liftRef}
      data-milk-card
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className={cn(
        'relative rounded-lg border border-[#DEE2E6] bg-white p-2.5',
        'will-change-transform',
        overlay && 'border-[#017E84] ring-2 ring-[#017E84]/25',
        selected && !overlay && 'border-[#017E84] ring-2 ring-[#017E84]/20',
        overdue && !selected && !overlay && 'border-[#DC3545]/40',
        'has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-[#017E84]',
      )}
      style={{ boxShadow: overlay || selected ? MILK.shadowLift : MILK.shadow }}
    >
      <div className="flex items-start gap-0.5">
        {dragHandle}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[11px] font-semibold tracking-tight text-[#017E84]">
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
            className="mt-1 block text-sm leading-snug font-medium text-[#212529] text-pretty after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none"
          >
            {task.title}
          </a>
        </div>
      </div>

      {shownLabels.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1">
          {shownLabels.map((label) => (
            <li
              key={label.id}
              className="rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{ backgroundColor: `${label.color}22`, color: label.color }}
            >
              {label.name}
            </li>
          ))}
          {task.labels.length > shownLabels.length && (
            <li className="text-[11px] text-[#8F8F8F]">+{task.labels.length - shownLabels.length}</li>
          )}
        </ul>
      )}

      <div className="mt-2 flex items-center justify-between gap-2 text-[12px] text-[#8F8F8F]">
        <div className="flex min-w-0 items-center gap-2">
          {task.dueDate && (
            <span
              className={cn(
                'flex items-center gap-1 tabular-nums',
                overdue &&
                  'rounded-full bg-[#F8D7DA] px-1.5 py-0.5 font-medium text-[#721C24]',
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
          <UserAvatar user={task.assignee} className="size-6" />
        ) : (
          <span
            className="grid size-6 place-items-center rounded-full border border-dashed border-[#DEE2E6]"
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
        'cursor-grab touch-manipulation text-[#8F8F8F]',
        'hover:bg-[#E9ECEF] hover:text-[#212529]',
        'focus-visible:bg-[#E9ECEF] focus-visible:ring-2 focus-visible:ring-[#017E84] focus-visible:outline-none',
        'active:cursor-grabbing',
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
      className={cn(isDragging && 'opacity-40')}
    >
      <TaskCardView task={task} selected={selected} dragHandle={handle} />
    </div>
  );
}
