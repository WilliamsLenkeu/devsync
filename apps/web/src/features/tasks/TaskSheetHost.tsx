import gsap from 'gsap';
import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { withTaskParam } from './boardLogic';
import { TaskDetails } from './TaskDetails';

/**
 * Opens task detail when the URL has `?task=<id>`.
 * Radix Dialog (Sheet) provides Esc close + focus trap.
 * GSAP micro on open (200ms); skipped under prefers-reduced-motion.
 * Mounted once in WorkspaceLayout.
 */
export function TaskSheetHost() {
  const [params, setParams] = useSearchParams();
  const taskId = params.get('task');
  const bodyRef = useRef<HTMLDivElement>(null);
  const close = () => setParams((prev) => withTaskParam(prev, null), { replace: true });

  useEffect(() => {
    const el = bodyRef.current;
    if (!taskId || !el) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    if (reduce) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { x: 12, opacity: 0.88 },
        { x: 0, opacity: 1, duration: 0.2, ease: 'power2.out' },
      );
    }, el);

    return () => ctx.revert();
  }, [taskId]);

  return (
    <Sheet open={!!taskId} onOpenChange={(open) => !open && close()}>
      <SheetContent
        side="right"
        showCloseButton
        className="w-full gap-0 overflow-y-auto p-0 data-[state=closed]:duration-150 data-[state=open]:duration-200 max-sm:inset-y-0 max-sm:h-dvh max-sm:max-w-none sm:max-w-xl"
      >
        <SheetTitle className="sr-only">Task details</SheetTitle>
        <SheetDescription className="sr-only">
          Edit the task, comments and activity. Press Escape to close.
        </SheetDescription>
        <div ref={bodyRef} className="min-h-0 flex-1">
          {taskId && <TaskDetails taskId={taskId} onClose={close} />}
        </div>
      </SheetContent>
    </Sheet>
  );
}
