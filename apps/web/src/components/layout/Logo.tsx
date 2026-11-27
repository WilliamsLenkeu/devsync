import { cn } from '@/lib/utils';

/** Marque Milk Desk : DS sur carré teal (pas mauve Odoo). */
export function Logo({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-7 shrink-0 place-items-center rounded-md bg-primary font-sans text-[11px] font-semibold tracking-tight text-primary-foreground',
        className,
      )}
    >
      DS
    </span>
  );
}
