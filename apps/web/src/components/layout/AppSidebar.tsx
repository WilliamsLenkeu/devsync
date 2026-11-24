import { can } from '@devsync/shared';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  FolderKanban,
  KeyRound,
  LayoutDashboard,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { Logo } from '@/components/layout/Logo';
import { navLinkClass } from '@/components/layout/navLinkClass';
import { projectTint } from '@/components/layout/projectTint';
import { WorkspaceSwitcher } from '@/components/layout/WorkspaceSwitcher';
import { api } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import { cn } from '@/lib/utils';
import type { Project, Workspace } from '@/lib/types';

interface AppSidebarProps {
  workspace?: Workspace;
  onNavigate?: () => void;
}

export function AppSidebar({ workspace, onNavigate }: AppSidebarProps) {
  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex items-center gap-2 border-b border-sidebar-border px-3 py-2.5">
        <Logo />
        <Link
          to="/app"
          onClick={onNavigate}
          className="rounded-md text-sm font-semibold tracking-tight text-sidebar-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
        >
          DevSync
        </Link>
      </div>
      <div className="border-b border-sidebar-border px-2.5 py-2.5">
        <WorkspaceSwitcher current={workspace} />
      </div>
      {workspace ? (
        <WorkspaceNav workspace={workspace} onNavigate={onNavigate} />
      ) : (
        <div className="flex-1 px-3 py-5">
          <p className="text-sm text-sidebar-foreground/65 text-pretty">
            Choose a workspace to open its board and settings.
          </p>
        </div>
      )}
    </div>
  );
}

function WorkspaceNav({
  workspace,
  onNavigate,
}: {
  workspace: Workspace;
  onNavigate?: () => void;
}) {
  const base = `/w/${workspace.id}`;
  const projects = useQuery({
    queryKey: [...qk.projects(workspace.id), { status: 'ACTIVE' }],
    queryFn: () => api.get<Project[]>(`/workspaces/${workspace.id}/projects`, { status: 'ACTIVE' }),
  });

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
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-2 py-3">
      <nav aria-label="Workspace">
        <ul className="grid gap-0.5">
          {links.map((item) => (
            <li key={item.label}>
              <NavItemLink item={item} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      </nav>

      {projects.isPending ? (
        <p className="px-2.5 text-xs text-sidebar-foreground/55" aria-busy="true">
          Loading projects…
        </p>
      ) : projects.isError ? (
        <p className="px-2.5 text-xs text-destructive" role="alert">
          Could not load projects.
        </p>
      ) : projects.data.length > 0 ? (
        <nav aria-labelledby="sidebar-projects">
          <h2
            id="sidebar-projects"
            className="px-2.5 pb-1.5 text-[11px] font-medium tracking-wide text-sidebar-foreground/50 uppercase"
          >
            Active projects
          </h2>
          <ul className="grid gap-0.5">
            {projects.data.slice(0, 10).map((p) => (
              <li key={p.id}>
                <NavLink
                  to={`${base}/projects/${p.id}/board`}
                  onClick={onNavigate}
                  className={({ isActive }) => navLinkClass(isActive)}
                >
                  <span
                    aria-hidden
                    className={cn('size-2 shrink-0 rounded-[3px]', projectTint(p.identifier))}
                  />
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  <span className="shrink-0 font-mono text-[11px] text-sidebar-foreground/45">
                    {p.identifier}
                  </span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

function NavItemLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) => navLinkClass(isActive)}
    >
      <Icon className="size-4 shrink-0 opacity-70" aria-hidden />
      {item.label}
    </NavLink>
  );
}
