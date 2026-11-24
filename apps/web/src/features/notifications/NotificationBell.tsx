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
          className="relative size-11 md:size-8"
          aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        >
          <Bell aria-hidden />
          {unread > 0 && (
            <span
              aria-hidden
              className="absolute top-1.5 right-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground tabular-nums md:top-0.5 md:right-0.5"
            >
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(100vw-1.5rem,24rem)] p-0">
        <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
          <h2 className="text-sm font-semibold tracking-tight">Notifications</h2>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            disabled={!unread || markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            {markAll.isPending ? 'Marking…' : 'Mark all as read'}
          </Button>
        </div>
        <div className="max-h-96 overflow-y-auto" aria-busy={recent.isPending}>
          {recent.isError ? (
            <div className="p-3">
              <ErrorState error={recent.error} onRetry={() => void recent.refetch()} />
            </div>
          ) : recent.isPending ? (
            <div className="grid gap-2 p-3" aria-busy="true" aria-label="Loading notifications">
              <Skeleton className="h-12 rounded-md" />
              <Skeleton className="h-12 rounded-md" />
              <Skeleton className="h-12 rounded-md" />
            </div>
          ) : recent.data.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <Bell className="size-5 text-muted-foreground" aria-hidden />
              <p className="text-sm font-medium">No notifications yet</p>
              <p className="text-xs text-muted-foreground text-pretty">
                Assignments, mentions, and invitations show up here.
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {recent.data.map((n) => (
                <NotificationRow key={n.id} n={n} onOpened={() => setOpen(false)} />
              ))}
            </ul>
          )}
        </div>
        <div className="border-t p-1.5">
          <Button asChild variant="ghost" size="sm" className="min-h-11 w-full justify-center sm:min-h-8">
            <Link to="/notifications" onClick={() => setOpen(false)}>
              View all notifications
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
