import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { timeAgo } from '@/lib/format';
import type { AppNotification } from '@/lib/types';
import { cn } from '@/lib/utils';
import { NotificationText } from './notificationView';
import { useNotificationActions } from './hooks';

export function NotificationRow({ n, onOpened }: { n: AppNotification; onOpened?: () => void }) {
  const { open, markRead } = useNotificationActions();
  const unread = !n.readAt;

  return (
    <li
      className={cn(
        'group flex items-stretch gap-0.5',
        unread && 'bg-accent/35',
      )}
    >
      <button
        type="button"
        onClick={() => {
          open(n);
          onOpened?.();
        }}
        className="flex min-h-14 min-w-0 flex-1 items-start gap-3 px-3 py-3 text-left outline-none transition-colors hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <span
          aria-hidden
          className={cn(
            'mt-1.5 size-1.5 shrink-0 rounded-full',
            unread ? 'bg-primary' : 'bg-transparent',
          )}
        />
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              'block text-sm text-pretty',
              unread ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            <NotificationText n={n} />
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground tabular-nums">
            {timeAgo(n.createdAt)}
            {unread && <span className="sr-only">, unread</span>}
          </span>
        </span>
      </button>
      {unread && (
        <Button
          variant="ghost"
          size="icon"
          className="my-auto mr-1 size-11 shrink-0 opacity-100 sm:size-8 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
          aria-label="Mark as read"
          title="Mark as read"
          disabled={markRead.isPending}
          onClick={() => markRead.mutate(n.id)}
        >
          <Check aria-hidden />
        </Button>
      )}
    </li>
  );
}
