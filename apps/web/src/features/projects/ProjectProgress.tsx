import { TASK_STATUSES } from '@devsync/shared';
import { ErrorState } from '@/components/states';
import { Skeleton } from '@/components/ui/skeleton';
import { humanize } from '@/lib/format';
import type { Project } from '@/lib/types';
import { percent, ProgressBar } from './ProgressBar';
import { useProjectTasks } from './queries';

/** Totals come from the project itself; the per-status breakdown needs the task list. */
export function ProjectProgress({ project }: { project: Project }) {
  const tasks = useProjectTasks(project.id);
  const { total, done } = project.taskCounts;

  return (
    <section aria-labelledby="progress-heading" className="rounded-xl border bg-card p-5">
      <h2 id="progress-heading" className="text-sm font-semibold">
        Progress
      </h2>
      <div className="mt-3 flex justify-between text-sm">
        <span>
          {done} of {total} tasks done
        </span>
        <span className="text-muted-foreground">{percent(done, total)}%</span>
      </div>
      <ProgressBar done={done} total={total} className="mt-2" />

      <div className="mt-5">
        {tasks.isPending && <Skeleton className="h-16" />}
        {tasks.isError && <ErrorState error={tasks.error} onRetry={() => void tasks.refetch()} />}
        {tasks.data && (
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {TASK_STATUSES.map((status) => (
              <div key={status} className="rounded-md bg-muted/60 px-3 py-2">
                <dt className="text-xs text-muted-foreground">{humanize(status)}</dt>
                <dd className="text-lg font-semibold tabular-nums">
                  {tasks.data.filter((t) => t.status === status).length}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}
