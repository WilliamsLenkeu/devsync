import { KanbanSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState, ErrorState } from '@/components/states';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { UserAvatar } from '@/components/UserAvatar';
import { formatDate, humanize, isOverdue, timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';
import { PRIORITY_CHIP, STATUS_CHIP } from '@/features/tasks/milk';
import { useProjectTasks } from './queries';

const RECENT = 12;

/** Dense recent-tasks table — self-fetches via useProjectTasks. */
export function ProjectRecentTasks({
  workspaceId,
  projectId,
}: {
  workspaceId: string;
  projectId: string;
}) {
  const tasks = useProjectTasks(projectId);
  const boardPath = `/w/${workspaceId}/projects/${projectId}/board`;

  if (tasks.isPending) {
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Loading tasks">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (tasks.isError) {
    return <ErrorState error={tasks.error} onRetry={() => void tasks.refetch()} />;
  }

  const sorted = [...tasks.data].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  const rows = sorted.slice(0, RECENT);

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={KanbanSquare}
        title="No tasks in this project"
        description="Create tasks on the board to track work and fill this list."
        action={
          <Link
            to={boardPath}
            className={buttonVariants({
              size: 'sm',
              className: 'bg-[#017E84] text-white hover:bg-[#016A6F]',
            })}
          >
            Open board
          </Link>
        }
      />
    );
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-[#DEE2E6]">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-9 text-[11px] font-medium tracking-wide text-[#8F8F8F] uppercase">
                Key
              </TableHead>
              <TableHead className="h-9 text-[11px] font-medium tracking-wide text-[#8F8F8F] uppercase">
                Title
              </TableHead>
              <TableHead className="hidden h-9 text-[11px] font-medium tracking-wide text-[#8F8F8F] uppercase sm:table-cell">
                Status
              </TableHead>
              <TableHead className="hidden h-9 text-[11px] font-medium tracking-wide text-[#8F8F8F] uppercase md:table-cell">
                Priority
              </TableHead>
              <TableHead className="hidden h-9 text-[11px] font-medium tracking-wide text-[#8F8F8F] uppercase lg:table-cell">
                Assignee
              </TableHead>
              <TableHead className="h-9 text-right text-[11px] font-medium tracking-wide text-[#8F8F8F] uppercase">
                Updated
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((task) => {
              const overdue = isOverdue(task.dueDate, task.status);
              return (
                <TableRow key={task.id} className="hover:bg-[#F8F9FA]">
                  <TableCell className="py-2 font-mono text-[12px] font-semibold text-[#017E84]">
                    <Link to={`${boardPath}?task=${task.id}`} className="hover:underline">
                      {task.key}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-[14rem] py-2 sm:max-w-xs">
                    <Link
                      to={`${boardPath}?task=${task.id}`}
                      className="block truncate text-sm font-medium text-[#212529] hover:text-[#017E84]"
                    >
                      {task.title}
                    </Link>
                    {task.dueDate && (
                      <p
                        className={cn(
                          'mt-0.5 text-[11px] tabular-nums text-[#8F8F8F]',
                          overdue && 'font-medium text-[#DC3545]',
                        )}
                      >
                        {overdue ? 'Overdue · ' : 'Due '}
                        {formatDate(task.dueDate)}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="hidden py-2 sm:table-cell">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[11px] font-medium',
                        STATUS_CHIP[task.status],
                      )}
                    >
                      {humanize(task.status)}
                    </span>
                  </TableCell>
                  <TableCell className="hidden py-2 md:table-cell">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[11px] font-medium',
                        PRIORITY_CHIP[task.priority],
                      )}
                    >
                      {humanize(task.priority)}
                    </span>
                  </TableCell>
                  <TableCell className="hidden py-2 lg:table-cell">
                    {task.assignee ? (
                      <span className="inline-flex items-center gap-1.5 text-[13px]">
                        <UserAvatar user={task.assignee} className="size-5" />
                        <span className="truncate">{task.assignee.name}</span>
                      </span>
                    ) : (
                      <span className="text-[13px] text-[#8F8F8F]">—</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2 text-right text-[12px] tabular-nums text-[#8F8F8F]">
                    {timeAgo(task.updatedAt)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {sorted.length > RECENT && (
        <p className="mt-2 text-[12px] text-[#8F8F8F]">
          Showing {RECENT} of {sorted.length}.{' '}
          <Link to={boardPath} className="font-medium text-[#017E84] hover:underline">
            Open board for the full set
          </Link>
          .
        </p>
      )}
    </div>
  );
}
