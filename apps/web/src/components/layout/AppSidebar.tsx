import { can } from '@devsync/shared';
import { useQuery } from '@tanstack/react-query';
import { Activity, FolderKanban, KeyRound, LayoutDashboard, Settings, Users, type LucideIcon } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { Logo } from '@/components/layout/Logo';
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
    <div className="flex h-full flex-col gap-4 py-4">
      <div className="flex items-center gap-2 px-4">
        <Logo />
        <Link to="/app" onClick={onNavigate} className="rounded-md text-sm font-semibold outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
          DevSync
        </Link>
      </div>
      <div className="px-3">
        <WorkspaceSwitcher current={workspace} />
      </div>
      {workspace && <WorkspaceNav workspace={workspace} onNavigate={onNavigate} />}
    </div>
  );
}

function WorkspaceNav({ workspace, onNavigate }: { workspace: Workspace; onNavigate?: () => void }) {
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
    ...(can(workspace.role, 'workspace:update') ? [{ to: `${base}/settings`, label: 'Settings', icon: Settings }] : []),
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-3">
      <nav aria-label="Workspace">
        <ul className="grid gap-0.5">
          {links.map((item) => (
            <li key={item.label}>
              <NavItemLink item={item} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      </nav>
      {projects.data && projects.data.length > 0 && (
        <nav aria-labelledby="sidebar-projects">
          <h2 id="sidebar-projects" className="px-2 pb-1.5 text-xs font-medium text-muted-foreground">
            Active projects
          </h2>
          <ul className="grid gap-0.5">
            {projects.data.slice(0, 10).map((p) => (
              <li key={p.id}>
                <NavLink
                  to={`${base}/projects/${p.id}/board`}
                  onClick={onNavigate}
                  className={({ isActive }) => linkClass(isActive)}
                >
                  <span className="truncate">{p.name}</span>
                  <span className="ml-auto font-mono text-[11px] text-muted-foreground">{p.identifier}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
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
    <NavLink to={item.to} end={item.end} onClick={onNavigate} className={({ isActive }) => linkClass(isActive)}>
      <Icon className="size-4 shrink-0" aria-hidden />
      {item.label}
    </NavLink>
  );
}

const linkClass = (active: boolean) =>
  cn(
    'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50',
    active ? 'bg-sidebar-accent font-medium text-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent/60',
  );
