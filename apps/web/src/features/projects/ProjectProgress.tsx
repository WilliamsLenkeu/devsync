import { TASK_STATUSES, type TaskStatus } from '@devsync/shared';
import { InlineNotice } from '@/components/feedback';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { humanize } from '@/lib/format';
import type { Project } from '@/lib/types';
import { cn } from '@/lib/utils';
import { STATUS_CHIP } from '@/features/tasks/milk';
import { percent, ProgressBar, SegmentedProgress } from './ProgressBar';
import { useProjectTasks } from './queries';

/** Milk Desk progress band — segmented stages + status chips. */
export function ProjectProgress({ project }: { project: Project }) {
  const tasks = useProjectTasks(project.id);
  const { total, done } = project.taskCounts;

  const counts: Partial<Record<TaskStatus, number>> = {};
  if (tasks.data) {
    for (const status of TASK_STATUSES) {
      counts[status] = tasks.data.filter((t) => t.status === status).length;
    }
  }

  return (
    <section
      aria-labelledby="progress-heading"
      className="space-y-3 rounded-lg border border-[#DEE2E6] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,.04)]"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="progress-heading" className="text-sm font-semibold text-[#212529]">
            Progress
          </h2>
          <p className="mt-0.5 text-[14px] text-[#8F8F8F]">
            {done} of {total} tasks done
          </p>
        </div>
        <span className="text-lg font-semibold tabular-nums tracking-tight text-[#017E84]">
          {percent(done, total)}%
        </span>
      </div>

      {tasks.data ? (
        <SegmentedProgress counts={counts} />
      ) : (
        <ProgressBar done={done} total={total} />
      )}

      {tasks.isPending && (
        <dl
          className="grid grid-cols-2 gap-2 border-t border-[#DEE2E6] pt-3 sm:grid-cols-5"
          aria-busy="true"
          aria-label="Loading status counts"
        >
          {TASK_STATUSES.map((status) => (
            <div key={status} className="rounded-md border border-[#DEE2E6] bg-[#F8F9FA] px-2.5 py-2">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="mt-2 h-5 w-6" />
            </div>
          ))}
        </dl>
      )}

      {tasks.isError && (
        <InlineNotice
          tone="error"
          title="Could not load stage breakdown"
          description="Task counts by column are unavailable right now."
          action={
            <Button
              size="sm"
              variant="outline"
              className="h-8 border-[#F5C6CB] bg-white"
              onClick={() => void tasks.refetch()}
            >
              Try again
            </Button>
          }
        />
      )}

      {tasks.data && (
        <dl className="grid grid-cols-2 gap-2 border-t border-[#DEE2E6] pt-3 sm:grid-cols-5">
          {TASK_STATUSES.map((status) => (
            <div
              key={status}
              className="rounded-md border border-[#DEE2E6] bg-[#F8F9FA] px-2.5 py-2"
            >
              <dt>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[11px] font-medium',
                    STATUS_CHIP[status],
                  )}
                >
                  {humanize(status)}
                </span>
              </dt>
              <dd className="mt-1.5 text-base font-semibold tabular-nums text-[#212529]">
                {counts[status] ?? 0}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
