import { ChevronRight, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/features/notifications/NotificationBell';
import type { Workspace } from '@/lib/types';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

export function TopBar({ workspace, onOpenNav }: { workspace?: Workspace; onOpenNav: () => void }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4 lg:px-6">
      <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation" onClick={onOpenNav}>
        <Menu aria-hidden />
      </Button>
      <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
        <Link to="/app" className="rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50">
          Workspaces
        </Link>
        {workspace && (
          <>
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate font-medium">{workspace.name}</span>
          </>
        )}
      </nav>
      <NotificationBell />
      <ThemeToggle />
      <UserMenu />
    </header>
  );
}
