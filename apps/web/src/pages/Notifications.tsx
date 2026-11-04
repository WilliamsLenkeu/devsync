import { Bell } from 'lucide-react';
import { useState } from 'react';
import { useDocumentTitle } from '@/components/layout/useDocumentTitle';
import { EmptyState, ErrorState, PageHeader } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NotificationRow } from '@/features/notifications/NotificationRow';
import {
  useNotificationActions,
  useNotificationPages,
  useUnreadCount,
} from '@/features/notifications/hooks';

type Tab = 'all' | 'unread';

export function NotificationsPage() {
  useDocumentTitle('Notifications');
  const [tab, setTab] = useState<Tab>('all');
  const list = useNotificationPages(tab === 'unread');
  const unread = useUnreadCount().data ?? 0;
  const { markAll } = useNotificationActions();
  const items = list.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div className="mx-auto max-w-3xl p-6 lg:p-8">
      <PageHeader
        title="Notifications"
        actions={
          <Button
            variant="outline"
            size="sm"
            disabled={!unread || markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            Mark all as read
          </Button>
        }
      />
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread{unread > 0 ? ` (${unread})` : ''}</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-4">
          {list.isError ? (
            <ErrorState error={list.error} onRetry={() => void list.refetch()} />
          ) : list.isPending ? (
            <div className="grid gap-2" aria-busy="true">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={Bell}
              title={tab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              description="Assignments, mentions and invitations show up here."
            />
          ) : (
            <div className="grid gap-4">
              <ul className="divide-y rounded-lg border py-1" aria-busy={list.isFetchingNextPage}>
                {items.map((n) => (
                  <NotificationRow key={n.id} n={n} />
                ))}
              </ul>
              {list.hasNextPage && (
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    disabled={list.isFetchingNextPage}
                    onClick={() => void list.fetchNextPage()}
                  >
                    {list.isFetchingNextPage ? 'Loading…' : 'Load more'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
