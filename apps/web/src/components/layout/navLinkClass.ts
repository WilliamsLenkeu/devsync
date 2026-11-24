import { cn } from '@/lib/utils';

/** Active nav: tinted surface + sync pip (DESIGN.md). No colored left stripe (impeccable ban). */
export function navLinkClass(active: boolean): string {
  return cn(
    'relative flex min-h-11 items-center gap-2 rounded-md px-2.5 text-sm outline-none transition-colors duration-150',
    'focus-visible:ring-2 focus-visible:ring-ring',
    active
      ? 'bg-sidebar-accent font-medium text-sidebar-foreground'
      : 'border-transparent text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
    active &&
      "before:absolute before:left-1.5 before:top-1/2 before:size-1.5 before:-translate-y-1/2 before:rounded-full before:bg-primary before:content-[''] before:shadow-[0_0_0_3px_color-mix(in_oklch,var(--primary)_25%,transparent)] pl-5",
  );
}
