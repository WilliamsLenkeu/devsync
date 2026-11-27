import gsap from 'gsap';
import { useEffect, useLayoutEffect, type DependencyList, type RefObject } from 'react';

/** Milk Desk motion — soft GSAP, no cyber wipe/glow. Honors prefers-reduced-motion. */

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  // Skip enter animations in Vitest so queries see accessible roles.
  if (import.meta.env?.MODE === 'test') return true;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
}

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/** Soft fade + rise page enter (~200–280ms). */
export function usePageEnter(
  ref: RefObject<HTMLElement | null>,
  deps: DependencyList = [],
  opts?: { y?: number; duration?: number },
) {
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      gsap.set(el, { clearProps: 'all' });
      return;
    }
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { autoAlpha: 0, y: opts?.y ?? 8 },
        { autoAlpha: 1, y: 0, duration: opts?.duration ?? 0.22, ease: 'power1.out' },
      );
    }, el);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller owns deps
  }, deps);
}

/** Soft stagger for list/table rows. */
export function useStaggerEnter(
  ref: RefObject<HTMLElement | null>,
  selector: string,
  deps: DependencyList = [],
  opts?: { y?: number; stagger?: number; duration?: number },
) {
  useIsoLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const items = root.querySelectorAll(selector);
    if (!items.length) return;
    if (prefersReducedMotion()) {
      gsap.set(items, { clearProps: 'all' });
      return;
    }
    const ctx = gsap.context(() => {
      gsap.fromTo(
        items,
        { autoAlpha: 0, y: opts?.y ?? 6 },
        {
          autoAlpha: 1,
          y: 0,
          duration: opts?.duration ?? 0.2,
          stagger: opts?.stagger ?? 0.035,
          ease: 'power1.out',
        },
      );
    }, root);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Material-soft dialog enter (scale+fade). */
export function useDialogEnter(
  ref: RefObject<HTMLElement | null>,
  open: boolean,
  opts?: { y?: number; duration?: number },
) {
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el || !open) return;
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { autoAlpha: 0, y: opts?.y ?? 6, scale: 0.98 },
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: opts?.duration ?? 0.2,
          ease: 'power1.out',
        },
      );
    }, el);
    return () => ctx.revert();
  }, [open, opts?.duration, opts?.y, ref]);
}
