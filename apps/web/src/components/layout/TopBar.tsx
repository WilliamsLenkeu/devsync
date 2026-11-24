import { ChevronRight, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/features/notifications/NotificationBell';
import type { Workspace } from '@/lib/types';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

/** Dense field chrome. Flat, no blur. ENERGY 2 product dial. */
export function TopBar({ workspace, onOpenNav }: { workspace?: Workspace; onOpenNav: () => void }) {
  return (
    <header className="flex h-11 shrink-0 items-center gap-0.5 border-b border-border bg-background px-2 sm:px-3 lg:px-4">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-11 md:hidden"
        aria-label="Menu"
        onClick={onOpenNav}
      >
        <Menu aria-hidden />
      </Button>

      <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1 text-sm">
        <Link
          to="/app"
          className="shrink-0 rounded-sm px-1 py-0.5 text-muted-foreground outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
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
