import gsap from 'gsap';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { withTaskParam } from './boardLogic';
import { prefersReducedMotion } from './milk';
import { TaskDetails } from './TaskDetails';

/**
 * Milk Desk task sheet — white Material surface, soft GSAP scale+fade enter/leave.
 */
export function TaskSheetHost() {
  const [params, setParams] = useSearchParams();
  const taskId = params.get('task');
  const [open, setOpen] = useState(!!taskId);
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);

  const clearTask = () => setParams((prev) => withTaskParam(prev, null), { replace: true });

  useEffect(() => {
    if (taskId) {
      closingRef.current = false;
      setOpen(true);
    } else if (!closingRef.current) {
      setOpen(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (!open || !taskId) return;
    const panel = panelRef.current;
    if (!panel || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        panel,
        { x: 24, autoAlpha: 0.9, scale: 0.985 },
        { x: 0, autoAlpha: 1, scale: 1, duration: 0.28, ease: 'power2.out' },
      );
      const bits = bodyRef.current?.querySelectorAll('header, [data-milk-sheet]');
      if (bits?.length) {
        gsap.fromTo(
          bits,
          { y: 8, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.22, stagger: 0.035, delay: 0.05, ease: 'power2.out' },
        );
      }
    }, panel);

    return () => ctx.revert();
  }, [open, taskId]);

  const requestClose = () => {
    if (closingRef.current) return;
    const panel = panelRef.current;
    if (!panel || prefersReducedMotion()) {
      setOpen(false);
      clearTask();
      return;
    }
    closingRef.current = true;
    gsap.to(panel, {
      x: 16,
      autoAlpha: 0,
      scale: 0.99,
      duration: 0.18,
      ease: 'power2.in',
      onComplete: () => {
        setOpen(false);
        clearTask();
        closingRef.current = false;
      },
    });
  };

  return (
    <Sheet open={open} onOpenChange={(next) => !next && requestClose()}>
      <SheetContent
        ref={panelRef}
        side="right"
        showCloseButton
        className="w-full gap-0 overflow-y-auto border-l border-[#DEE2E6] bg-white p-0 text-[#212529] shadow-[0_8px_28px_rgba(0,0,0,.12)] data-[state=closed]:duration-0 data-[state=open]:duration-0 max-sm:inset-y-0 max-sm:h-dvh max-sm:max-w-none sm:max-w-xl"
      >
        <SheetTitle className="sr-only">Task details</SheetTitle>
        <SheetDescription className="sr-only">
          Edit the task, comments and activity. Press Escape to close.
        </SheetDescription>
        <div ref={bodyRef} className="min-h-0 flex-1">
          {taskId && open && <TaskDetails taskId={taskId} onClose={requestClose} />}
        </div>
      </SheetContent>
    </Sheet>
  );
}
