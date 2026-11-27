import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { NOTICE_ICON, NOTICE_SURFACE, type NoticeTone } from './variants';

/** Compact in-page banner (control panels, board, progress). */
export function InlineNotice({
  tone = 'info',
  title,
  description,
  action,
  onDismiss,
  className,
}: {
  tone?: NoticeTone;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  onDismiss?: () => void;
  className?: string;
}) {
  const Icon = NOTICE_ICON[tone];
  const surface = NOTICE_SURFACE[tone];

  return (
    <div
      role={tone === 'error' || tone === 'warning' ? 'alert' : 'status'}
      className={cn(
        'flex gap-3 overflow-hidden rounded-lg border',
        surface.bg,
        surface.border,
        className,
      )}
    >
      <div className={cn('w-1 shrink-0 self-stretch', surface.bar)} aria-hidden />
      <div className="flex min-w-0 flex-1 items-start gap-2.5 py-2.5 pr-3">
        <Icon className={cn('mt-0.5 size-4 shrink-0', surface.icon)} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className={cn('text-sm font-semibold', surface.ink)}>{title}</p>
          {description && (
            <div className={cn('mt-0.5 text-[13px] leading-snug', surface.ink, 'opacity-90')}>
              {description}
            </div>
          )}
          {action && <div className="mt-2">{action}</div>}
        </div>
        {onDismiss && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn('h-7 shrink-0 px-2 text-[12px]', surface.ink)}
            onClick={onDismiss}
          >
            Dismiss
          </Button>
        )}
      </div>
    </div>
  );
}
