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

/** Shell for every signed-in page. Sits ABOVE WorkspaceLayout, so it loads the workspace itself (same key, deduplicated). */
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

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Skip to content
      </a>
      <aside className="hidden w-60 shrink-0 border-r bg-sidebar md:block">
        <AppSidebar workspace={workspace} />
      </aside>
      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent side="left" className="w-72 bg-sidebar p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Workspace and project navigation</SheetDescription>
          <AppSidebar workspace={workspace} onNavigate={() => setNavOpen(false)} />
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
