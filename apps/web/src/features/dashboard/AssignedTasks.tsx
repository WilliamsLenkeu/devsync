import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, humanize, isOverdue } from '@/lib/format';
import type { Dashboard, Task } from '@/lib/types';
import { cn } from '@/lib/utils';

const PRIORITY_CLASS: Record<Task['priority'], string> = {
  URGENT: 'bg-destructive/10 text-destructive',
  HIGH: 'bg-accent text-accent-foreground',
  MEDIUM: 'bg-secondary text-secondary-foreground',
  LOW: '',
};

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
    <Card className={cn('gap-4 py-5', className)}>
      <CardHeader>
        <CardTitle className="text-sm">Assigned to me</CardTitle>
      </CardHeader>
      <CardContent>
        {assigned.tasks.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nothing assigned to you right now.</p>
        ) : (
          <ul className="divide-y">
            {assigned.tasks.map((task) => {
              const overdue = isOverdue(task.dueDate, task.status);
              return (
                <li key={task.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                  <span className="font-mono text-xs text-muted-foreground">{task.key}</span>
                  <Link
                    to={`/w/${workspaceId}/projects/${task.projectId}/board?task=${task.id}`}
                    className="min-w-0 flex-1 truncate text-sm font-medium hover:text-primary hover:underline"
                  >
                    {task.title}
                  </Link>
                  <Badge variant="outline" className={cn('border-transparent', PRIORITY_CLASS[task.priority])}>
                    {humanize(task.priority)}
                  </Badge>
                  {task.dueDate && (
                    <span className={cn('text-xs tabular-nums text-muted-foreground', overdue && 'font-medium text-destructive')}>
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
          <p className="mt-2 text-xs text-muted-foreground">
            Showing {assigned.tasks.length} of {assigned.count} open tasks.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
