import gsap from 'gsap';

export function prefersReducedMotion(): boolean {
  return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
}

/**
 * Entrée de route Milk Desk — fade court ~200ms (DESIGN.md v5).
 * No-op si prefers-reduced-motion.
 */
export function playRouteEnter(el: HTMLElement): gsap.core.Tween | null {
  if (prefersReducedMotion()) {
    gsap.set(el, { clearProps: 'opacity,transform' });
    return null;
  }

  return gsap.fromTo(
    el,
    { opacity: 0, y: 6 },
    { opacity: 1, y: 0, duration: 0.2, ease: 'power1.out', clearProps: 'opacity,transform' },
  );
}
