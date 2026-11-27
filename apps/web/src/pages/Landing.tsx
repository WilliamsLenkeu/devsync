import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '@/components/layout/useDocumentTitle';
import { Logo } from '@/components/layout/Logo';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

gsap.registerPlugin(ScrollTrigger);

/**
 * Design Read Milk Desk v5: light enterprise, teal CTAs, soft GSAP.
 * Sticky reel + scrubbed chapters. Real screenshots only.
 */

const CHAPTERS = [
  {
    id: 'dashboard',
    label: '01 · Dashboard',
    title: 'See what is on you, and what moved',
    body: 'Assigned work, project progress, and the activity trail in one workspace home. Real numbers from your board, not marketing metrics.',
    image: '/screenshots/02-dashboard.png',
    alt: 'DevSync dashboard with assigned tasks, progress, and recent activity',
  },
  {
    id: 'board',
    label: '02 · Kanban',
    title: 'Move work where the team can see it',
    body: 'Columns for Todo, In progress, In review, and Done. Filters by assignee, priority, and label. Optimistic drag, task keys like WEB-12, comments with mentions.',
    image: '/screenshots/03-board.png',
    alt: 'DevSync Kanban board with task columns and cards',
  },
  {
    id: 'live',
    label: '03 · Live sync',
    title: 'When someone moves a card, everyone sees it',
    body: 'Realtime over WebSocket, presence on the board, notifications when you are mentioned or assigned. Roles enforced on every request.',
    image: '/screenshots/02-dashboard.png',
    alt: 'DevSync workspace overview showing live team context',
  },
] as const;

const CAPABILITIES = [
  ['Workspaces', 'Invite links, owners, admins, members, viewers'],
  ['Projects', 'Active and archived, progress from real statuses'],
  ['Kanban', 'Drag, filters, priorities, due dates, labels'],
  ['Task sheet', 'Description, comments, activity, delete confirm'],
  ['Activity', 'Who changed what, filter by project'],
  ['Notifications', 'Unread queue and mark-read'],
  ['Members', 'Roles and pending invitations'],
  ['API tokens', 'Scoped secrets under Settings, optional agents'],
] as const;

export function LandingPage() {
  useDocumentTitle('Collaboration for development teams');
  const { user } = useAuth();
  const rootRef = useRef<HTMLDivElement>(null);
  const reelRef = useRef<HTMLElement>(null);
  const [chapter, setChapter] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    setReduced(Boolean(mql?.matches));
    const onChange = () => setReduced(Boolean(mql?.matches));
    mql?.addEventListener?.('change', onChange);
    return () => mql?.removeEventListener?.('change', onChange);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const reel = reelRef.current;
    if (!root || !reel || reduced) return;

    const ctx = gsap.context(() => {
      gsap.from('[data-hero]', {
        opacity: 0,
        y: 24,
        duration: 0.75,
        stagger: 0.07,
        ease: 'power3.out',
      });

      const frames = gsap.utils.toArray<HTMLElement>('[data-frame]');
      const copyBlocks = gsap.utils.toArray<HTMLElement>('[data-chapter-copy]');
      const firstFrame = frames[0];
      const firstCopy = copyBlocks[0];
      if (!firstFrame || !firstCopy) return;

      gsap.set(frames, { autoAlpha: 0, scale: 1.02 });
      gsap.set(firstFrame, { autoAlpha: 1, scale: 1 });
      gsap.set(copyBlocks, { autoAlpha: 0, y: 16 });
      gsap.set(firstCopy, { autoAlpha: 1, y: 0 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: reel,
          start: 'top top',
          end: () => `+=${window.innerHeight * CHAPTERS.length * 1.15}`,
          pin: true,
          scrub: 0.65,
          anticipatePin: 1,
          onUpdate: (self) => {
            const idx = Math.min(CHAPTERS.length - 1, Math.floor(self.progress * CHAPTERS.length));
            setChapter(idx);
          },
        },
      });

      CHAPTERS.forEach((_, i) => {
        if (i === 0) return;
        const prevFrame = frames[i - 1];
        const prevCopy = copyBlocks[i - 1];
        const frame = frames[i];
        const copy = copyBlocks[i];
        if (!prevFrame || !prevCopy || !frame || !copy) return;
        const t = i;
        tl.to(prevFrame, { autoAlpha: 0, scale: 0.98, duration: 0.35 }, t);
        tl.to(prevCopy, { autoAlpha: 0, y: -12, duration: 0.3 }, t);
        tl.fromTo(
          frame,
          { autoAlpha: 0, scale: 1.03 },
          { autoAlpha: 1, scale: 1, duration: 0.4 },
          t + 0.05,
        );
        tl.fromTo(
          copy,
          { autoAlpha: 0, y: 18 },
          { autoAlpha: 1, y: 0, duration: 0.35 },
          t + 0.08,
        );
      });
    }, root);

    return () => ctx.revert();
  }, [reduced]);

  return (
    <div ref={rootRef} className="min-h-dvh bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,#f1f3f5_0%,#f8f9fa_40%,#ffffff_100%)]"
      />

      <header className="sticky top-0 z-50 border-b border-border bg-card/95 shadow-[var(--elevation-1)] backdrop-blur-sm">
        <nav
          aria-label="Main"
          className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6"
        >
          <Link
            to="/"
            className="flex min-h-11 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <Logo />
            <span className="text-[15px] font-semibold">DevSync</span>
          </Link>
          <div className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#reel" className="hover:text-foreground">
              Product tour
            </a>
            <a href="#capabilities" className="hover:text-foreground">
              Capabilities
            </a>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <Button asChild size="sm" className="min-h-11 px-4 sm:min-h-9">
                <Link to="/app">Open app</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="min-h-11 px-3 sm:min-h-9">
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button asChild size="sm" className="min-h-11 px-4 sm:min-h-9">
                  <Link to="/register">Create account</Link>
                </Button>
              </>
            )}
          </div>
        </nav>
      </header>

      <main className="relative">
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pb-24 sm:pt-24">
          <p data-hero className="text-xs font-medium tracking-[0.12em] text-primary uppercase">
            Collaboration for development teams
          </p>
          <h1
            data-hero
            className="mt-4 max-w-[14ch] text-[clamp(2.5rem,7vw,4.5rem)] font-semibold leading-[1.05] tracking-tight text-balance"
          >
            DevSync
          </h1>
          <p
            data-hero
            className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty sm:text-xl"
          >
            Workspaces, Kanban, realtime, roles, activity, and notifications. Scroll the product tour
            below. Every frame is a real screen from the app.
          </p>
          <div data-hero className="mt-10 flex flex-wrap gap-3">
            {user ? (
              <Button asChild size="lg" className="min-h-11 px-6">
                <Link to="/app">Open app</Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg" className="min-h-11 px-6">
                  <Link to="/register">Create account</Link>
                </Button>
                <Button asChild variant="secondary" size="lg" className="min-h-11 px-6">
                  <Link to="/login">Sign in</Link>
                </Button>
              </>
            )}
            <Button asChild variant="ghost" size="lg" className="min-h-11 px-4">
              <a href="#reel">See the product</a>
            </Button>
          </div>
        </section>

        <section
          id="reel"
          ref={reelRef}
          aria-label="Product tour"
          className="relative border-y border-border bg-card"
        >
          <div className="mx-auto flex min-h-dvh max-w-6xl flex-col justify-center gap-8 px-4 py-10 sm:px-6 lg:grid lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-12">
            <div className="relative z-10 max-w-md">
              <p className="text-xs font-medium tracking-[0.12em] text-primary uppercase">Product tour</p>
              <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Tour chapters">
                {CHAPTERS.map((c, i) => (
                  <span
                    key={c.id}
                    role="tab"
                    aria-selected={chapter === i}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs transition-colors duration-200',
                      chapter === i
                        ? 'border-primary bg-accent text-primary'
                        : 'border-border text-muted-foreground',
                    )}
                  >
                    {c.label}
                  </span>
                ))}
              </div>
              <div className="relative mt-8 min-h-[11rem]">
                {CHAPTERS.map((c, i) => (
                  <div
                    key={c.id}
                    data-chapter-copy
                    className={cn('space-y-3', reduced ? (i === 0 ? 'block' : 'mt-10 block') : 'absolute inset-x-0 top-0')}
                    style={reduced ? undefined : { visibility: i === 0 ? 'visible' : undefined }}
                  >
                    <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                      {c.title}
                    </h2>
                    <p className="text-sm leading-relaxed text-muted-foreground text-pretty sm:text-base">
                      {c.body}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-8 h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
                  style={{ width: `${((chapter + 1) / CHAPTERS.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="relative">
              <div className="overflow-hidden rounded-lg border border-border bg-card shadow-[var(--elevation-2)]">
                <div className="flex items-center gap-2 border-b border-border bg-muted/60 px-3 py-2">
                  <span className="size-2 rounded-full bg-border" />
                  <span className="size-2 rounded-full bg-border" />
                  <span className="size-2 rounded-full bg-border" />
                  <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                    app.devsync · live UI
                  </span>
                </div>
                <div className={cn('relative aspect-[16/10] bg-muted', reduced && 'space-y-0')}>
                  {CHAPTERS.map((c, i) => (
                    <img
                      key={c.id}
                      data-frame
                      src={c.image}
                      alt={c.alt}
                      width={1280}
                      height={800}
                      className={cn(
                        'h-full w-full object-cover object-top',
                        reduced ? 'relative block border-b border-border last:border-0' : 'absolute inset-0',
                      )}
                      style={reduced ? undefined : { opacity: i === 0 ? 1 : 0 }}
                    />
                  ))}
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Scroll to advance · real screenshots from DevSync
              </p>
            </div>
          </div>
        </section>

        <section id="capabilities" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">What ships today</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground text-pretty">
            Full surface area of the product. No invented modules.
          </p>
          <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CAPABILITIES.map(([title, desc]) => (
              <li
                key={title}
                className="rounded-lg border border-border bg-card p-5 shadow-[var(--elevation-1)]"
              >
                <p className="font-medium">{title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{desc}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="border-t border-border bg-card">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-16 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Put the team on one board</h2>
              <p className="mt-2 max-w-md text-muted-foreground">
                Create an account, open a workspace, invite people, ship from the Kanban.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="min-h-11 px-6">
                <Link to={user ? '/app' : '/register'}>{user ? 'Open app' : 'Create account'}</Link>
              </Button>
              {!user && (
                <Button asChild variant="secondary" size="lg" className="min-h-11 px-6">
                  <Link to="/login">Sign in</Link>
                </Button>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-background py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2 text-foreground">
            <Logo className="size-6 text-[10px]" />
            <span className="font-medium">DevSync</span>
          </div>
          <p>Collaboration for development teams.</p>
          <div className="flex gap-4">
            <Link to="/login" className="hover:text-foreground">
              Sign in
            </Link>
            <Link to="/register" className="hover:text-foreground">
              Create account
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
