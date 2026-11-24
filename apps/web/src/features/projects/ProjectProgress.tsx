import { TASK_STATUSES } from '@devsync/shared';
import { ErrorState } from '@/components/states';
import { Skeleton } from '@/components/ui/skeleton';
import { humanize } from '@/lib/format';
import type { Project } from '@/lib/types';
import { percent, ProgressBar } from './ProgressBar';
import { useProjectTasks } from './queries';

/** Totals from project; per-status counts from the real task list (R-17). Flat band. */
export function ProjectProgress({ project }: { project: Project }) {
  const tasks = useProjectTasks(project.id);
  const { total, done } = project.taskCounts;

  return (
    <section aria-labelledby="progress-heading" className="space-y-3 border-y border-border py-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="progress-heading" className="text-sm font-semibold tracking-tight">
            Progress
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {done} of {total} tasks done
          </p>
        </div>
        <span className="text-xl font-semibold tabular-nums tracking-tight text-primary">
          {percent(done, total)}%
        </span>
      </div>
      <ProgressBar done={done} total={total} />

      {tasks.isPending && (
        <dl
          className="flex flex-col border-t border-border pt-3 sm:flex-row sm:divide-x sm:divide-border"
          aria-busy="true"
          aria-label="Loading status counts"
        >
          {TASK_STATUSES.map((status) => (
            <div
              key={status}
              className="flex flex-1 items-baseline justify-between gap-2 border-b border-border py-1.5 last:border-b-0 sm:flex-col sm:gap-0.5 sm:border-b-0 sm:px-3 sm:py-0 first:sm:pl-0 last:sm:pr-0"
            >
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-5 w-6" />
            </div>
          ))}
        </dl>
      )}
      {tasks.isError && <ErrorState error={tasks.error} onRetry={() => void tasks.refetch()} />}
      {tasks.data && (
        <dl className="flex flex-col border-t border-border pt-3 sm:flex-row sm:divide-x sm:divide-border">
          {TASK_STATUSES.map((status) => (
            <div
              key={status}
              className="flex flex-1 items-baseline justify-between gap-2 border-b border-border py-1.5 last:border-b-0 sm:flex-col sm:gap-0.5 sm:border-b-0 sm:px-3 sm:py-0 first:sm:pl-0 last:sm:pr-0"
            >
              <dt className="text-[11px] text-muted-foreground">{humanize(status)}</dt>
              <dd className="text-base font-semibold tabular-nums">
                {tasks.data.filter((t) => t.status === status).length}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
