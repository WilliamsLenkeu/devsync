import { Bell } from 'lucide-react';
import { useRef, useState } from 'react';
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
import { usePageEnter, useStaggerEnter } from '@/lib/motion';

type Tab = 'all' | 'unread';

export function NotificationsPage() {
  useDocumentTitle('Notifications');
  const [tab, setTab] = useState<Tab>('all');
  const list = useNotificationPages(tab === 'unread');
  const unread = useUnreadCount().data ?? 0;
  const { markAll } = useNotificationActions();
  const items = list.data?.pages.flatMap((p) => p.data) ?? [];
  const rootRef = useRef<HTMLDivElement>(null);

  usePageEnter(rootRef, [tab, list.isSuccess]);
  useStaggerEnter(rootRef, '[data-stagger-item]', [tab, items.length, list.dataUpdatedAt]);

  return (
    <div ref={rootRef} className="mx-auto max-w-2xl p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Notifications"
        description="Assignments, mentions, and invitations across your workspaces."
        actions={
          <Button
            variant="outline"
            size="sm"
            className="min-h-11 border-[#DEE2E6] bg-[#E9ECEF] text-[#212529] hover:bg-[#DEE2E6] sm:min-h-8"
            disabled={!unread || markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            {markAll.isPending ? 'Marking…' : 'Mark all as read'}
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="h-11 w-full justify-start rounded-md border border-[#DEE2E6] bg-[#F8F9FA] p-0.5 sm:h-9 sm:w-auto">
          <TabsTrigger
            value="all"
            className="min-h-9 flex-1 data-[state=active]:bg-white data-[state=active]:text-[#017E84] data-[state=active]:shadow-sm sm:flex-none"
          >
            All
          </TabsTrigger>
          <TabsTrigger
            value="unread"
            className="min-h-9 flex-1 data-[state=active]:bg-white data-[state=active]:text-[#017E84] data-[state=active]:shadow-sm sm:flex-none"
          >
            Unread{unread > 0 ? ` (${unread})` : ''}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {list.isError ? (
            <ErrorState error={list.error} onRetry={() => void list.refetch()} />
          ) : list.isPending ? (
            <div
              className="overflow-hidden rounded-lg border border-[#DEE2E6] bg-white"
              aria-busy="true"
              aria-label="Loading notifications"
            >
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="border-b border-[#DEE2E6] px-4 py-3 last:border-b-0">
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
              <ul
                className="overflow-hidden rounded-lg border border-[#DEE2E6] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] divide-y divide-[#DEE2E6]"
                aria-busy={list.isFetchingNextPage}
              >
                {items.map((n) => (
                  <li key={n.id} data-stagger-item className="hover:bg-[#F8F9FA]">
                    <NotificationRow n={n} />
                  </li>
                ))}
              </ul>
              {list.hasNextPage && (
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-11 border-[#DEE2E6] bg-[#E9ECEF] text-[#212529] hover:bg-[#DEE2E6] sm:min-h-8"
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
