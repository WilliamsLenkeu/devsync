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
    <li className="flex items-center gap-1 px-2">
      <button
        type="button"
        onClick={() => {
          open(n);
          onOpened?.();
        }}
        className="flex min-w-0 flex-1 items-start gap-3 rounded-md px-2 py-3 text-left outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <span
          aria-hidden
          className={cn(
            'mt-1.5 size-2 shrink-0 rounded-full',
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
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {timeAgo(n.createdAt)}
            {unread && <span className="sr-only">, unread</span>}
          </span>
        </span>
      </button>
      {unread && (
        <Button
          variant="ghost"
          size="icon-sm"
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
