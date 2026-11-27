import { ChevronRight, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/features/notifications/NotificationBell';
import type { Workspace } from '@/lib/types';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

/**
 * Control panel Milk Desk : breadcrumb gauche, actions secondaires droite.
 * Pas de CTA primary ici — réserve aux vues.
 */
export function TopBar({ workspace, onOpenNav }: { workspace?: Workspace; onOpenNav: () => void }) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-1 border-b border-border bg-card px-2 shadow-[var(--elevation-1)] sm:px-4">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-10 md:hidden"
        aria-label="Menu"
        onClick={onOpenNav}
      >
        <Menu aria-hidden />
      </Button>

      <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1 text-sm">
        <Link
          to="/app"
          className="shrink-0 rounded-md px-1.5 py-1 text-muted-foreground outline-none transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          Workspaces
        </Link>
        {workspace && (
          <>
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate font-medium text-foreground" aria-current="page">
              {workspace.name}
            </span>
          </>
        )}
      </nav>

      <div className="flex shrink-0 items-center gap-0.5">
        <NotificationBell />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
