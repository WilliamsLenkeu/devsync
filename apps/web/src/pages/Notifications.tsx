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
    <div className="mx-auto max-w-2xl p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Notifications"
        description="Assignments, mentions, and invitations across your workspaces."
        actions={
          <Button
            variant="outline"
            size="sm"
            className="min-h-11 sm:min-h-8"
            disabled={!unread || markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            {markAll.isPending ? 'Marking…' : 'Mark all as read'}
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="h-11 w-full justify-start sm:h-9 sm:w-auto">
          <TabsTrigger value="all" className="min-h-9 flex-1 sm:flex-none">
            All
          </TabsTrigger>
          <TabsTrigger value="unread" className="min-h-9 flex-1 sm:flex-none">
            Unread{unread > 0 ? ` (${unread})` : ''}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {list.isError ? (
            <ErrorState error={list.error} onRetry={() => void list.refetch()} />
          ) : list.isPending ? (
            <div className="grid gap-0 divide-y border-y" aria-busy="true" aria-label="Loading notifications">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="py-3">
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={Bell}
              title={tab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              description={
                tab === 'unread'
                  ? 'New assignments and mentions will appear here.'
                  : 'Assignments, mentions, and invitations show up here when they arrive.'
              }
            />
          ) : (
            <div className="grid gap-4">
              <ul className="divide-y border-y" aria-busy={list.isFetchingNextPage}>
                {items.map((n) => (
                  <NotificationRow key={n.id} n={n} />
                ))}
              </ul>
              {list.hasNextPage && (
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-11 sm:min-h-8"
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
