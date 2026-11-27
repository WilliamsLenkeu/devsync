import { useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { playRouteEnter } from '@/lib/routeTransition';

/** Fade doux à chaque changement de route authée. */
export function RouteTransition({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const tween = playRouteEnter(el);
    return () => {
      tween?.kill();
    };
  }, [pathname]);

  return (
    <div ref={ref} className="min-h-0 flex-1">
      {children}
    </div>
  );
}
