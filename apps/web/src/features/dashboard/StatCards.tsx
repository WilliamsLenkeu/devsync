import { cn } from '@/lib/utils';
import type { Dashboard } from '@/lib/types';

/** Flat totals strip from real dashboard aggregates (R-17). Not a card grid. */
export function StatCards({ totals }: { totals: Dashboard['totals'] }) {
  const stats = [
    { label: 'Total tasks', value: totals.total },
    { label: 'Completed', value: totals.completed },
    { label: 'In progress', value: totals.inProgress, signal: totals.inProgress > 0 },
    { label: 'Overdue', value: totals.overdue, alert: totals.overdue > 0 },
  ];

  return (
    <dl className="flex flex-col border-y border-border sm:flex-row sm:divide-x sm:divide-border">
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex flex-1 items-baseline justify-between gap-3 border-b border-border px-0 py-2.5 last:border-b-0 sm:flex-col sm:justify-start sm:gap-1 sm:border-b-0 sm:px-5 sm:py-3.5 first:sm:pl-0 last:sm:pr-0"
        >
          <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            {s.label}
          </dt>
          <dd
            className={cn(
              'text-2xl font-semibold tracking-tight tabular-nums sm:text-[1.75rem]',
              s.alert && 'text-destructive',
              s.signal && !s.alert && 'text-primary',
              !s.alert && !s.signal && 'text-foreground',
            )}
          >
            {s.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
