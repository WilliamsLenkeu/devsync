import { useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/layout/Logo';
import { usePageEnter } from '@/lib/motion';

/**
 * Design Read: Milk Desk auth — light Material card on soft gray field,
 * ENERGY 2 / RHYTHM 3 / MOTION 2. One teal CTA inside forms; no mint/cyber.
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
  const rootRef = useRef<HTMLElement>(null);
  usePageEnter(rootRef, [title]);

  return (
    <main
      ref={rootRef}
      className="grid min-h-dvh place-items-center bg-[#F8F9FA] px-4 py-10 font-sans text-[14px] leading-normal text-[#212529]"
    >
      <div className="w-full max-w-[22.5rem]">
        <Link
          to="/"
          className="mb-6 flex min-h-11 items-center justify-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#017E84]/40 focus-visible:ring-offset-2"
        >
          <Logo className="size-7 text-[12px]" />
          <span className="text-[15px] font-semibold tracking-tight text-[#212529]">DevSync</span>
        </Link>

        <section className="rounded-lg border border-[#DEE2E6] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
          <header className="border-b border-[#DEE2E6] pb-4">
            <h1 className="text-xl font-semibold leading-tight tracking-tight text-balance">
              {title}
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-[#6C757D] text-pretty">{description}</p>
          </header>
          <div className="mt-5">{children}</div>
        </section>
      </div>
    </main>
  );
}
