import { Activity, Bot, KeyRound, LayoutGrid, Radio, ShieldCheck, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '@/components/layout/useDocumentTitle';
import { Logo } from '@/components/layout/Logo';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';

const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: LayoutGrid,
    title: 'Kanban boards',
    body: 'One board per project. Move tasks across columns, filter by assignee, priority or label.',
  },
  {
    icon: Radio,
    title: 'Real-time collaboration',
    body: 'Changes reach everyone in the workspace as they happen, with presence and no page reloads.',
  },
  {
    icon: Activity,
    title: 'Activity feed',
    body: 'Every change to projects, tasks, comments and members is recorded with its author, human or agent.',
  },
  {
    icon: ShieldCheck,
    title: 'Roles and permissions',
    body: 'Owner, admin, member and viewer. The server enforces them on every request, not just in the interface.',
  },
  {
    icon: KeyRound,
    title: 'API tokens and MCP',
    body: 'Scoped, revocable tokens for agents. The MCP server lets AI coding tools read tasks and update them.',
  },
];

const MCP_CONFIG = `{
  "mcpServers": {
    "devsync": {
      "command": "pnpm",
      "args": ["--filter", "@devsync/mcp-server", "start"],
      "env": {
        "DEVSYNC_API_URL": "https://your-devsync-host/api",
        "DEVSYNC_API_TOKEN": "dsk_..."
      }
    }
  }
}`;

export function LandingPage() {
  useDocumentTitle('Collaboration for dev teams and AI agents');
  const { user } = useAuth();

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b">
        <nav aria-label="Main" className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2 rounded-md text-sm font-semibold outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
            <Logo />
            DevSync
          </Link>
          <div className="flex items-center gap-2">
            {user ? (
              <Button asChild size="sm">
                <Link to="/app">Open app</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/register">Get started</Link>
                </Button>
              </>
            )}
          </div>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 pt-20 pb-24 md:pt-28">
          <p className="font-mono text-xs tracking-widest text-cyan uppercase">For dev teams and the agents they run</p>
          <h1 className="mt-4 max-w-3xl text-5xl leading-[1.05] font-semibold tracking-[-0.04em] text-balance md:text-6xl">
            Plan the work with your team and your AI agents.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground text-pretty">
            DevSync is a task board, activity feed and real-time workspace for software teams. An API and an MCP server
            let coding agents read tasks, update status and comment, within the scopes and role you grant them.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link to={user ? '/app' : '/register'}>{user ? 'Open app' : 'Get started'}</Link>
            </Button>
            {!user && (
              <Button asChild variant="outline" size="lg">
                <Link to="/login">Sign in</Link>
              </Button>
            )}
          </div>
        </section>

        <section aria-labelledby="features-title" className="border-t">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <h2 id="features-title" className="text-2xl font-semibold tracking-tight">
              What is included
            </h2>
            <ul className="mt-10 grid gap-x-12 gap-y-10 md:grid-cols-2">
              {FEATURES.map((f) => (
                <li key={f.title} className="flex gap-4">
                  <f.icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                  <div>
                    <h3 className="font-medium">{f.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground text-pretty">{f.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="agents-title" className="border-t bg-secondary/40">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-[1fr_1.2fr]">
            <div>
              <Bot className="size-5 text-cyan" aria-hidden />
              <h2 id="agents-title" className="mt-4 text-2xl font-semibold tracking-tight text-balance">
                Connect your AI agent
              </h2>
              <p className="mt-3 text-sm text-muted-foreground text-pretty">
                Create an API token in your workspace with only the scopes the agent needs. The token works in that
                workspace alone, and you can revoke it at any time. Add the MCP server to your client with this
                configuration.
              </p>
            </div>
            <pre className="overflow-x-auto rounded-lg border bg-card p-4 font-mono text-[13px] leading-6">
              <code>{MCP_CONFIG}</code>
            </pre>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-6 text-sm text-muted-foreground">
          <span>DevSync</span>
          <span>Licensed under the terms of the LICENSE file in the repository.</span>
        </div>
      </footer>
    </div>
  );
}
