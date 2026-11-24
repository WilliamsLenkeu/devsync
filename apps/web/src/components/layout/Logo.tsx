import { cn } from '@/lib/utils';

/** Brand mark: mono DS on signal square (DESIGN.md sync motif). */
export function Logo({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-6 shrink-0 place-items-center rounded-md bg-primary font-mono text-[11px] font-semibold tracking-tight text-primary-foreground',
        className,
      )}
    >
      DS
    </span>
  );
}
