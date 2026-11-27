import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Outlet, useMatch } from 'react-router-dom';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { setLastWorkspace } from '@/features/workspaces/lastWorkspace';
import { api } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import { cn } from '@/lib/utils';
import type { Workspace } from '@/lib/types';
import { AppSidebar } from './AppSidebar';
import { RouteTransition } from './RouteTransition';
import { TopBar } from './TopBar';

const SIDEBAR_COLLAPSED_KEY = 'devsync.sidebar.collapsed';
/** Aligné sur la transition width (~300ms) avant de passer en mode icônes. */
const SIDEBAR_LABEL_DELAY_MS = 280;

/**
 * Chrome Milk Desk (DESIGN.md v5) : sidebar blanche, control panel topbar,
 * fade de route ~200ms. Rail repliable + peek au survol (motion douce).
 */
export function AuthedLayout() {
  const workspaceId = useMatch('/w/:workspaceId/*')?.params.workspaceId;
  const [navOpen, setNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [peek, setPeek] = useState(false);
  const wide = !collapsed || peek;
  const [showLabels, setShowLabels] = useState(wide);

  const { data: workspace } = useQuery({
    queryKey: qk.workspace(workspaceId ?? ''),
    queryFn: () => api.get<Workspace>(`/workspaces/${workspaceId}`),
    enabled: !!workspaceId,
    retry: false,
  });

  useEffect(() => {
    if (workspace) setLastWorkspace(workspace.id);
  }, [workspace]);

  // Labels immédiatement à l’ouverture ; retardés à la fermeture pour suivre le width.
  useEffect(() => {
    if (wide) {
      setShowLabels(true);
      return;
    }
    const id = window.setTimeout(() => setShowLabels(false), SIDEBAR_LABEL_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [wide]);

  const closeNav = () => setNavOpen(false);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      if (!next) setPeek(false);
      return next;
    });
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:border focus:border-border focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:shadow-[var(--elevation-1)] focus:outline-none focus:ring-2 focus:ring-ring/40"
      >
        Skip to content
      </a>

      <aside
        className={cn(
          'relative hidden shrink-0 md:block',
          collapsed ? 'w-14' : 'w-56',
          !collapsed &&
            'transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
        )}
        onMouseEnter={() => {
          if (collapsed) setPeek(true);
        }}
        onMouseLeave={() => setPeek(false)}
      >
        <div
          className={cn(
            'h-full overflow-hidden border-r border-sidebar-border bg-sidebar',
            'transition-[width,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
            // Collapsed: always absolute so peek doesn't remount position (évite le jump).
            collapsed ? 'absolute inset-y-0 left-0 z-40' : 'relative w-full',
            collapsed ? (peek ? 'w-56 shadow-[var(--elevation-2)]' : 'w-14') : 'w-56',
          )}
        >
          <AppSidebar
            workspace={workspace}
            collapsed={!showLabels}
            pinned={!collapsed}
            onToggleCollapse={toggleCollapsed}
          />
        </div>
      </aside>

      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent
          side="left"
          showCloseButton
          className="w-[min(100%,18rem)] gap-0 border-sidebar-border bg-sidebar p-0 shadow-[var(--elevation-2)]"
        >
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SheetDescription className="sr-only">
            Workspace and project navigation
          </SheetDescription>
          <AppSidebar workspace={workspace} onNavigate={closeNav} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar workspace={workspace} onOpenNav={() => setNavOpen(true)} />
        <main
          id="main"
          tabIndex={-1}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto outline-none"
        >
          <RouteTransition>
            <Outlet />
          </RouteTransition>
        </main>
      </div>
    </div>
  );
}
