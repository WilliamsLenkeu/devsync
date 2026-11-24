import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { formatDate, humanize, isOverdue } from '@/lib/format';
import type { Dashboard, Task } from '@/lib/types';
import { cn } from '@/lib/utils';

const PRIORITY_CLASS: Record<Task['priority'], string> = {
  URGENT: 'bg-destructive/10 text-destructive',
  HIGH: 'bg-accent text-accent-foreground',
  MEDIUM: 'bg-secondary text-secondary-foreground',
  LOW: 'text-muted-foreground',
};

/** Primary dashboard band: open assigned work as flat rows. */
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
    <section aria-labelledby="assigned-heading" className={cn(className)}>
      <div className="flex items-baseline justify-between gap-3 border-b border-border pb-2">
        <h2 id="assigned-heading" className="text-sm font-semibold tracking-tight">
          Assigned to me
        </h2>
        {assigned.count > 0 && (
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {assigned.count}
          </span>
        )}
      </div>

      {assigned.tasks.length === 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 py-5">
          <p className="text-sm text-muted-foreground">Nothing assigned to you right now.</p>
          <Link
            to={`/w/${workspaceId}/projects`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Browse projects
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {assigned.tasks.map((task) => {
            const overdue = isOverdue(task.dueDate, task.status);
            return (
              <li
                key={task.id}
                className={cn(
                  'flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5',
                  overdue && 'bg-destructive/[0.04]',
                )}
              >
                <span className="font-mono text-[11px] font-medium tracking-tight text-foreground/65">
                  {task.key}
                </span>
                <Link
                  to={`/w/${workspaceId}/projects/${task.projectId}/board?task=${task.id}`}
                  className="min-w-0 flex-1 truncate text-sm font-medium hover:text-primary hover:underline"
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
                      'text-xs tabular-nums text-muted-foreground',
                      overdue && 'rounded-sm bg-destructive/10 px-1.5 py-0.5 font-semibold text-destructive',
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
        <p className="border-t border-border py-2.5 text-xs text-muted-foreground">
          Showing {assigned.tasks.length} of {assigned.count} open tasks.
        </p>
      )}
    </section>
  );
}
