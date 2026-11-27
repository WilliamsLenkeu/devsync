import { cn } from '@/lib/utils';

/** Nav active : wash teal + poids medium (Milk Desk). Pas de stripe mauve. */
export function navLinkClass(active: boolean): string {
  return cn(
    'flex min-h-9 items-center gap-2.5 rounded-md px-2.5 text-sm outline-none transition-colors duration-150',
    'focus-visible:ring-2 focus-visible:ring-ring/40',
    active
      ? 'bg-sidebar-accent font-medium text-primary'
      : 'font-normal text-sidebar-foreground/80 hover:bg-muted hover:text-sidebar-foreground',
  );
}
