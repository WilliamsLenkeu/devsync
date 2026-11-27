import { TASK_STATUSES, type TaskStatus } from '@devsync/shared';
import { cn } from '@/lib/utils';
import { STATUS_ACCENT } from '@/features/tasks/milk';

export const percent = (done: number, total: number) =>
  total === 0 ? 0 : Math.round((done / total) * 100);

/** Milk Desk progress — teal fill on soft track. */
export function ProgressBar({
  done,
  total,
  className,
}: {
  done: number;
  total: number;
  className?: string;
}) {
  const pct = percent(done, total);
  return (
    <div
      role="progressbar"
      aria-label={`${done} of ${total} tasks done`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={cn('h-2 w-full overflow-hidden rounded-sm bg-[#E9ECEF]', className)}
    >
      <div
        className="h-full rounded-sm bg-[#017E84] motion-safe:transition-[width] motion-safe:duration-200"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** Stacked status segments — Odoo-style stage mix for project progress. */
export function SegmentedProgress({
  counts,
  className,
}: {
  counts: Partial<Record<TaskStatus, number>>;
  className?: string;
}) {
  const total = TASK_STATUSES.reduce((sum, s) => sum + (counts[s] ?? 0), 0);
  if (total === 0) {
    return (
      <div
        role="progressbar"
        aria-label="No tasks yet"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={0}
        className={cn('h-2.5 w-full rounded-sm bg-[#E9ECEF]', className)}
      />
    );
  }

  return (
    <div
      role="progressbar"
      aria-label={`${total} tasks across stages`}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={counts.DONE ?? 0}
      className={cn('flex h-2.5 w-full overflow-hidden rounded-sm bg-[#E9ECEF]', className)}
    >
      {TASK_STATUSES.map((status) => {
        const n = counts[status] ?? 0;
        if (n === 0) return null;
        return (
          <div
            key={status}
            title={`${status}: ${n}`}
            className="h-full motion-safe:transition-[flex-grow] motion-safe:duration-200"
            style={{ flexGrow: n, backgroundColor: STATUS_ACCENT[status] }}
          />
        );
      })}
    </div>
  );
}
