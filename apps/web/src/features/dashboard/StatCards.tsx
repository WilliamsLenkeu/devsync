import { cn } from '@/lib/utils';
import type { Dashboard } from '@/lib/types';

/** Milk Desk totals — soft Material cards in a dense strip. */
export function StatCards({ totals }: { totals: Dashboard['totals'] }) {
  const stats = [
    { label: 'Total tasks', value: totals.total },
    { label: 'Completed', value: totals.completed },
    { label: 'In progress', value: totals.inProgress, signal: totals.inProgress > 0 },
    { label: 'Overdue', value: totals.overdue, alert: totals.overdue > 0 },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((s) => (
        <div
          key={s.label}
          data-stagger-item
          className="rounded-lg border border-[#DEE2E6] bg-white px-3.5 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
        >
          <dt className="text-xs font-medium text-[#6C757D]">{s.label}</dt>
          <dd
            className={cn(
              'mt-1 text-2xl font-semibold tabular-nums tracking-tight',
              s.alert && 'text-[#DC3545]',
              s.signal && !s.alert && 'text-[#017E84]',
              !s.alert && !s.signal && 'text-[#212529]',
            )}
          >
            {s.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
