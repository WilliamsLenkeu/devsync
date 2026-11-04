import { cn } from '@/lib/utils';

export const percent = (done: number, total: number) =>
  total === 0 ? 0 : Math.round((done / total) * 100);

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
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-muted', className)}
    >
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
