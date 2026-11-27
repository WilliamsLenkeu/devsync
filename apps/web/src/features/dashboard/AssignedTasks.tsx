import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { formatDate, humanize, isOverdue } from '@/lib/format';
import type { Dashboard, Task } from '@/lib/types';
import { cn } from '@/lib/utils';

const PRIORITY_CLASS: Record<Task['priority'], string> = {
  URGENT: 'bg-[#DC3545]/12 text-[#DC3545]',
  HIGH: 'bg-[#FFC107]/20 text-[#856404]',
  MEDIUM: 'bg-[#E9ECEF] text-[#495057]',
  LOW: 'text-[#6C757D]',
};

/** Milk Desk assigned band — dense table-like rows. */
export function AssignedTasks({
  workspaceId,
  assigned,
  className,
}: {
  workspaceId: string;
  assigned: Dashboard['assignedToMe'];
  className?: string;
}) {
  return (
    <section
      aria-labelledby="assigned-heading"
      className={cn(
        'rounded-lg border border-[#DEE2E6] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-3 border-b border-[#DEE2E6] px-4 py-2.5">
        <h2 id="assigned-heading" className="text-sm font-semibold text-[#212529]">
          Assigned to me
        </h2>
        {assigned.count > 0 && (
          <span className="rounded-full bg-[#E9ECEF] px-2 py-0.5 text-xs font-medium tabular-nums text-[#495057]">
            {assigned.count}
          </span>
        )}
      </div>

      {assigned.tasks.length === 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-5">
          <p className="text-sm text-[#6C757D]">
            Nothing assigned to you right now. Browse a project to pick up work.
          </p>
          <Link
            to={`/w/${workspaceId}/projects`}
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'border-[#DEE2E6] bg-[#E9ECEF] text-[#212529] hover:bg-[#DEE2E6]',
            )}
          >
            Browse projects
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-[#DEE2E6]">
          {assigned.tasks.map((task) => {
            const overdue = isOverdue(task.dueDate, task.status);
            return (
              <li
                key={task.id}
                data-stagger-item
                className={cn(
                  'flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 hover:bg-[#F8F9FA]',
                  overdue && 'bg-[#DC3545]/[0.04]',
                )}
              >
                <span className="font-mono text-[11px] font-medium text-[#6C757D]">{task.key}</span>
                <Link
                  to={`/w/${workspaceId}/projects/${task.projectId}/board?task=${task.id}`}
                  className="min-w-0 flex-1 truncate text-sm font-medium text-[#212529] hover:text-[#017E84] hover:underline"
                >
                  {task.title}
                </Link>
                <Badge
                  variant="outline"
                  className={cn('border-transparent font-normal', PRIORITY_CLASS[task.priority])}
                >
                  {humanize(task.priority)}
                </Badge>
                {task.dueDate && (
                  <span
                    className={cn(
                      'text-xs tabular-nums text-[#6C757D]',
                      overdue &&
                        'rounded px-1.5 py-0.5 font-semibold text-[#DC3545] bg-[#DC3545]/10',
                    )}
                  >
                    {overdue ? 'Overdue · ' : 'Due '}
                    {formatDate(task.dueDate)}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {assigned.count > assigned.tasks.length && (
        <p className="border-t border-[#DEE2E6] px-4 py-2 text-xs text-[#6C757D]">
          Showing {assigned.tasks.length} of {assigned.count} open tasks.
        </p>
      )}
    </section>
  );
}
