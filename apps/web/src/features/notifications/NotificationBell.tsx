import { Bell } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/states';
import { NotificationRow } from './NotificationRow';
import { useNotificationActions, useRecentNotifications, useUnreadCount } from './hooks';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const unread = useUnreadCount().data ?? 0;
  const recent = useRecentNotifications(open);
  const { markAll } = useNotificationActions();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        >
          <Bell aria-hidden />
          {unread > 0 && (
            <span
              aria-hidden
              className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground tabular-nums"
            >
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Notifications</h2>
          <Button
            variant="ghost"
            size="sm"
            disabled={!unread || markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            Mark all as read
          </Button>
        </div>
        <div className="max-h-96 overflow-y-auto py-1" aria-busy={recent.isPending}>
          {recent.isError ? (
            <div className="p-3">
              <ErrorState error={recent.error} onRetry={() => void recent.refetch()} />
            </div>
          ) : recent.isPending ? (
            <div className="grid gap-2 p-3">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : recent.data.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              You're all caught up.
            </p>
          ) : (
            <ul>
              {recent.data.map((n) => (
                <NotificationRow key={n.id} n={n} onOpened={() => setOpen(false)} />
              ))}
            </ul>
          )}
        </div>
        <div className="border-t p-2">
          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link to="/notifications" onClick={() => setOpen(false)}>
              View all notifications
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
