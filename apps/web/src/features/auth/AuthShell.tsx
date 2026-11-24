import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/layout/Logo';

/**
 * Design Read: auth for eng teams, signal-console language,
 * ENERGY 2 / RHYTHM 2 / MOTION 1.
 * Field surface + ink band + sync pip. No Geist, no left stripe, no glass.
 */
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
    <main className="relative grid min-h-dvh place-items-center bg-background px-4 py-12 font-sans">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-sidebar" />
      <div className="w-full max-w-[22rem]">
        <Link
          to="/"
          className="mb-8 flex min-h-11 items-center justify-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Logo className="size-7 text-[12px]" />
          <span className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">
            DevSync
          </span>
        </Link>

        <section className="rounded-lg border border-border bg-card p-6 shadow-none">
          <div className="flex items-start gap-2.5">
            <span
              aria-hidden
              className="mt-2 size-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_0_3px_color-mix(in_oklch,var(--primary)_25%,transparent)]"
            />
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-[-0.025em] text-balance">{title}</h1>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground text-pretty">
                {description}
              </p>
            </div>
          </div>
          <div className="mt-6">{children}</div>
        </section>
      </div>
    </main>
  );
}
