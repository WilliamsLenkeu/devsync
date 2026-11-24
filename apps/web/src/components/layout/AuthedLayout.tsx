import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Outlet, useMatch } from 'react-router-dom';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { setLastWorkspace } from '@/features/workspaces/lastWorkspace';
import { api } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type { Workspace } from '@/lib/types';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';

/**
 * Signed-in chrome: ink sidebar + field topbar (DESIGN.md signal-console).
 * Active nav = accent surface + sync pip (navLinkClass), never a left stripe.
 */
export function AuthedLayout() {
  const workspaceId = useMatch('/w/:workspaceId/*')?.params.workspaceId;
  const [navOpen, setNavOpen] = useState(false);
  const { data: workspace } = useQuery({
    queryKey: qk.workspace(workspaceId ?? ''),
    queryFn: () => api.get<Workspace>(`/workspaces/${workspaceId}`),
    enabled: !!workspaceId,
    retry: false,
  });

  useEffect(() => {
    if (workspace) setLastWorkspace(workspace.id);
  }, [workspace]);

  const closeNav = () => setNavOpen(false);

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:border focus:border-border focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>

      <aside className="hidden w-56 shrink-0 border-r border-sidebar-border bg-sidebar md:block">
        <AppSidebar workspace={workspace} />
      </aside>

      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent
          side="left"
          showCloseButton
          className="w-[min(100%,18rem)] gap-0 border-sidebar-border bg-sidebar p-0 shadow-none"
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
        <main id="main" tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto outline-none">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
