import { CheckCircle2, CircleDashed, ListTodo, Percent } from 'lucide-react';
import type { Project, Task } from '@/lib/types';
import { cn } from '@/lib/utils';
import { percent } from './ProgressBar';

/** Bande KPI type Odoo dashboard — 4 tuiles Material. */
export function ProjectKpis({
  project,
  tasks,
}: {
  project: Project;
  tasks: Task[] | undefined;
}) {
  const { total, done } = project.taskCounts;
  const inProgress =
    tasks?.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'IN_REVIEW').length ?? null;
  const open =
    tasks?.filter((t) => t.status !== 'DONE').length ?? Math.max(total - done, 0);

  const tiles = [
    {
      label: 'Completion',
      value: `${percent(done, total)}%`,
      hint: 'of tasks done',
      icon: Percent,
      accent: true,
    },
    {
      label: 'Done',
      value: String(done),
      hint: `of ${total} tasks`,
      icon: CheckCircle2,
      accent: false,
    },
    {
      label: 'Open',
      value: String(open),
      hint: 'not done yet',
      icon: ListTodo,
      accent: false,
    },
    {
      label: 'In flight',
      value: inProgress == null ? '—' : String(inProgress),
      hint: 'progress + review',
      icon: CircleDashed,
      accent: false,
    },
  ];

  return (
    <section aria-label="Project metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {tiles.map((tile) => {
        const Icon = tile.icon;
        return (
          <div
            key={tile.label}
            className={cn(
              'rounded-lg border border-[#DEE2E6] bg-white p-3.5 shadow-[0_1px_2px_rgba(0,0,0,.04)]',
              tile.accent && 'border-[#017E84]/35',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[12px] font-medium tracking-wide text-[#8F8F8F] uppercase">
                {tile.label}
              </p>
              <Icon
                className={cn('size-4', tile.accent ? 'text-[#017E84]' : 'text-[#8F8F8F]')}
                aria-hidden
              />
            </div>
            <p
              className={cn(
                'mt-1 text-2xl font-semibold tabular-nums tracking-tight',
                tile.accent ? 'text-[#017E84]' : 'text-[#212529]',
              )}
            >
              {tile.value}
            </p>
            <p className="mt-0.5 text-[13px] text-[#8F8F8F]">{tile.hint}</p>
          </div>
        );
      })}
      {/* Keep legacy copy for overview tests */}
      <p className="sr-only">
        {done} of {total} tasks done
      </p>
    </section>
  );
}
