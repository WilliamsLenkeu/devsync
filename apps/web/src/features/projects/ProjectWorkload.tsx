import { TASK_STATUSES } from '@devsync/shared';
import { ErrorState } from '@/components/states';
import { Skeleton } from '@/components/ui/skeleton';
import { humanize } from '@/lib/format';
import type { Task } from '@/lib/types';
import { cn } from '@/lib/utils';
import { STATUS_CHIP } from '@/features/tasks/milk';
import { useProjectTasks } from './queries';

const BAR: Partial<Record<string, string>> = {
  BACKLOG: 'bg-[#6C757D]',
  TODO: 'bg-[#17A2B8]',
  IN_PROGRESS: 'bg-[#017E84]',
  IN_REVIEW: 'bg-[#F0AD4E]',
  DONE: 'bg-[#28A745]',
};

/** Barres de charge par statut (remplace la bande Progress plate). */
export function ProjectWorkload({ projectId }: { projectId: string }) {
  const tasks = useProjectTasks(projectId);

  if (tasks.isPending) {
    return (
      <div className="space-y-2.5" aria-busy="true" aria-label="Loading workload">
        {TASK_STATUSES.map((s) => (
          <Skeleton key={s} className="h-7 w-full rounded-md" />
        ))}
      </div>
    );
  }
  if (tasks.isError) {
    return <ErrorState error={tasks.error} onRetry={() => void tasks.refetch()} />;
  }

  const total = Math.max(tasks.data.length, 1);
  const counts = Object.fromEntries(
    TASK_STATUSES.map((s) => [s, tasks.data.filter((t) => t.status === s).length]),
  ) as Record<(typeof TASK_STATUSES)[number], number>;

  return (
    <ul className="space-y-2.5" aria-label="Workload by status">
      {TASK_STATUSES.map((status) => {
        const n = counts[status];
        const pct = Math.round((n / total) * 100);
        return (
          <li key={status} className="grid gap-1">
            <div className="flex items-center justify-between gap-2">
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[11px] font-medium',
                  STATUS_CHIP[status],
                )}
              >
                {humanize(status)}
              </span>
              <span className="font-mono text-[12px] tabular-nums text-[#8F8F8F]">
                {n} · {pct}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#E9ECEF]">
              <div
                className={cn(
                  'h-full rounded-full motion-safe:transition-[width] motion-safe:duration-300',
                  BAR[status] ?? 'bg-[#017E84]',
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function countByStatus(tasks: Task[]) {
  return TASK_STATUSES.map((status) => ({
    status,
    count: tasks.filter((t) => t.status === status).length,
  }));
}
