import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Dashboard } from '@/lib/types';

export function StatCards({ totals }: { totals: Dashboard['totals'] }) {
  const stats = [
    { label: 'Total tasks', value: totals.total },
    { label: 'Completed', value: totals.completed },
    { label: 'In progress', value: totals.inProgress },
    { label: 'Overdue', value: totals.overdue, alert: totals.overdue > 0 },
  ];

  return (
    <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label} className={cn('gap-2 py-5', s.alert && 'border-destructive/40 bg-destructive/5')}>
          <dt className="px-5 text-sm text-muted-foreground">{s.label}</dt>
          <dd className={cn('px-5 text-3xl font-semibold tabular-nums', s.alert && 'text-destructive')}>{s.value}</dd>
        </Card>
      ))}
    </dl>
  );
}
