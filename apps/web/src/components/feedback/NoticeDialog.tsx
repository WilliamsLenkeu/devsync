import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { NOTICE_ICON, NOTICE_SURFACE, type NoticeTone } from './variants';

/**
 * Modal notice — info / success / warning / error.
 * Use for blocking confirmations or important outcomes; prefer `notify.*` toasts for transient feedback.
 */
export function NoticeDialog({
  open,
  onOpenChange,
  tone = 'info',
  title,
  description,
  confirmLabel = 'OK',
  cancelLabel,
  onConfirm,
  busy = false,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tone?: NoticeTone;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  busy?: boolean;
  children?: ReactNode;
}) {
  const Icon = NOTICE_ICON[tone];
  const surface = NOTICE_SURFACE[tone];
  const destructive = tone === 'error' || tone === 'warning';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden border-[#DEE2E6] p-0 sm:max-w-md">
        <div className={cn('h-1 w-full', surface.bar)} aria-hidden />
        <DialogHeader className="gap-3 px-5 pt-5 pb-2 text-left">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                'mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg border',
                surface.bg,
                surface.border,
              )}
            >
              <Icon className={cn('size-4', surface.icon)} aria-hidden />
            </span>
            <div className="min-w-0 space-y-1">
              <DialogTitle className="text-[15px] font-semibold text-[#212529]">{title}</DialogTitle>
              {description && (
                <DialogDescription className="text-[13px] leading-relaxed text-[#6C757D]">
                  {description}
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>
        {children && <div className="px-5 pb-2">{children}</div>}
        <DialogFooter className="gap-2 border-t border-[#DEE2E6] bg-[#F8F9FA] px-5 py-3 sm:gap-2">
          {cancelLabel && (
            <Button
              type="button"
              variant="outline"
              className="border-[#DEE2E6] bg-white"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              {cancelLabel}
            </Button>
          )}
          <Button
            type="button"
            disabled={busy}
            className={cn(
              destructive
                ? 'bg-[#DC3545] text-white hover:bg-[#C82333]'
                : 'bg-[#017E84] text-white hover:bg-[#016A6F]',
            )}
            onClick={() => {
              onConfirm?.();
              if (!onConfirm) onOpenChange(false);
            }}
          >
            {busy ? 'Please wait…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
