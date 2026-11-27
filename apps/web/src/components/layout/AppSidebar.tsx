import { can } from '@devsync/shared';
import {
  Activity,
  FolderKanban,
  KeyRound,
  LayoutDashboard,
  PanelLeft,
  PanelLeftClose,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { Logo } from '@/components/layout/Logo';
import { navLinkClass } from '@/components/layout/navLinkClass';
import { WorkspaceSwitcher } from '@/components/layout/WorkspaceSwitcher';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Workspace } from '@/lib/types';

interface AppSidebarProps {
  workspace?: Workspace;
  onNavigate?: () => void;
  /** Rail icônes (collapsed hors peek). */
  collapsed?: boolean;
  /** Sidebar épinglée ouverte (pas seulement peek). */
  pinned?: boolean;
  onToggleCollapse?: () => void;
}

export function AppSidebar({
  workspace,
  onNavigate,
  collapsed = false,
  pinned = true,
  onToggleCollapse,
}: AppSidebarProps) {
  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div
        className={cn(
          'flex h-12 items-center border-b border-sidebar-border',
          collapsed ? 'justify-center px-1' : 'gap-2 px-2',
        )}
      >
        {collapsed ? (
          <Link
            to="/app"
            onClick={onNavigate}
            className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            aria-label="DevSync"
          >
            <Logo />
          </Link>
        ) : (
          <>
            <Logo />
            <Link
              to="/app"
              onClick={onNavigate}
              className="min-w-0 flex-1 truncate rounded-md text-sm font-semibold text-sidebar-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              DevSync
            </Link>
            {onToggleCollapse ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 text-muted-foreground hover:bg-sidebar-accent hover:text-primary"
                onClick={onToggleCollapse}
                aria-label={pinned ? 'Collapse sidebar' : 'Keep sidebar open'}
                aria-expanded={pinned}
              >
                {pinned ? (
                  <PanelLeftClose className="size-4" aria-hidden />
                ) : (
                  <PanelLeft className="size-4" aria-hidden />
                )}
              </Button>
            ) : null}
          </>
        )}
      </div>

      <div className={cn('border-b border-sidebar-border', collapsed ? 'px-1.5 py-2' : 'px-2.5 py-2.5')}>
        <WorkspaceSwitcher current={workspace} compact={collapsed} />
      </div>
      {workspace ? (
        <WorkspaceNav workspace={workspace} onNavigate={onNavigate} collapsed={collapsed} />
      ) : (
        <div className={cn('flex-1 py-4', collapsed ? 'px-1.5' : 'px-3')}>
          {!collapsed ? (
            <p className="text-sm leading-normal text-muted-foreground text-pretty">
              Choose a workspace to open its board and settings.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function WorkspaceNav({
  workspace,
  onNavigate,
  collapsed,
}: {
  workspace: Workspace;
  onNavigate?: () => void;
  collapsed: boolean;
}) {
  const base = `/w/${workspace.id}`;

  const links: NavItem[] = [
    { to: base, label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: `${base}/projects`, label: 'Projects', icon: FolderKanban },
    { to: `${base}/activity`, label: 'Activity', icon: Activity },
    { to: `${base}/members`, label: 'Members', icon: Users },
    { to: `${base}/api-tokens`, label: 'API tokens', icon: KeyRound },
    ...(can(workspace.role, 'workspace:update')
      ? [{ to: `${base}/settings`, label: 'Settings', icon: Settings }]
      : []),
  ];

  return (
    <div
      className={cn(
        'flex min-h-0 flex-1 flex-col overflow-y-auto py-3',
        collapsed ? 'px-1.5' : 'px-2',
      )}
    >
      <nav aria-label="Workspace">
        <ul className="grid gap-0.5">
          {links.map((item) => (
            <li key={item.label}>
              <NavItemLink item={item} onNavigate={onNavigate} collapsed={collapsed} />
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

function NavItemLink({
  item,
  onNavigate,
  collapsed,
}: {
  item: NavItem;
  onNavigate?: () => void;
  collapsed: boolean;
}) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) => cn(navLinkClass(isActive), collapsed && 'justify-center px-0')}
    >
      <Icon className="size-4 shrink-0 opacity-70" aria-hidden />
      {collapsed ? <span className="sr-only">{item.label}</span> : item.label}
    </NavLink>
  );
}
