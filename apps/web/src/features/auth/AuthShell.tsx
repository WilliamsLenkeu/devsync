import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/layout/Logo';

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <Link
          to="/"
          className="mb-8 flex items-center justify-center gap-2 text-sm font-semibold outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 rounded-md"
        >
          <Logo />
          DevSync
        </Link>
        <div className="rounded-lg border bg-card p-6">
          <h1 className="text-lg font-semibold tracking-tight text-balance">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">{description}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  );
}
