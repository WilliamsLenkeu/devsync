import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';
import { useRef, useState } from 'react';
import { ActivityItem } from '@/features/activity/ActivityItem';
import { useDocumentTitle } from '@/components/layout/useDocumentTitle';
import { EmptyState, ErrorState, PageHeader } from '@/components/states';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { usePageEnter, useStaggerEnter } from '@/lib/motion';
import { qk } from '@/lib/queryKeys';
import { useWorkspace } from '@/lib/workspace';
import type { Activity, Project } from '@/lib/types';

const ALL = 'all';

/**
 * Design Read: Milk Desk activity feed — control panel + dense list,
 * ENERGY 2 / RHYTHM 3 / MOTION 2.
 */
export function ActivityPage() {
  useDocumentTitle('Activity');
  const { workspace } = useWorkspace();
  const wid = workspace.id;
  const [filter, setFilter] = useState(ALL);
  const projectId = filter === ALL ? undefined : filter;
  const rootRef = useRef<HTMLDivElement>(null);

  const projects = useQuery({
    queryKey: qk.projects(wid),
    queryFn: () => api.get<Project[]>(`/workspaces/${wid}/projects`),
  });
  const feed = useInfiniteQuery({
    queryKey: [...qk.activity(wid), filter],
    queryFn: ({ pageParam }) =>
      api.page<Activity>(`/workspaces/${wid}/activity`, {
        projectId,
        cursor: pageParam,
        limit: 30,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const items = feed.data?.pages.flatMap((p) => p.data) ?? [];

  usePageEnter(rootRef, [filter, feed.isSuccess]);
  useStaggerEnter(rootRef, '[data-stagger-item]', [filter, items.length, feed.dataUpdatedAt]);

  return (
    <div ref={rootRef} className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Activity"
        description="Recent changes across projects, tasks, and members."
        actions={
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger
              className="w-48 border-[#DEE2E6] bg-white"
              aria-label="Filter by project"
            >
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All projects</SelectItem>
              {projects.data?.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {feed.isPending && (
        <ul
          className="overflow-hidden rounded-lg border border-[#DEE2E6] bg-white divide-y divide-[#DEE2E6]"
          aria-busy="true"
          aria-label="Loading activity"
        >
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-2.5">
              <Skeleton className="size-7 rounded-full" />
              <Skeleton className="h-4 flex-1" />
            </li>
          ))}
        </ul>
      )}

      {feed.isError && <ErrorState error={feed.error} onRetry={() => void feed.refetch()} />}

      {feed.isSuccess && items.length === 0 && (
        <EmptyState
          icon={History}
          title="No activity yet"
          description={
            filter === ALL
              ? 'Updates to projects, tasks, and members will show up here.'
              : 'Nothing happened in this project yet.'
          }
        />
      )}

      {items.length > 0 && (
        <div className="grid gap-4">
          <ul className="overflow-hidden rounded-lg border border-[#DEE2E6] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] divide-y divide-[#DEE2E6]">
            {items.map((a) => (
              <li key={a.id} data-stagger-item className="px-2 hover:bg-[#F8F9FA]">
                <ActivityItem activity={a} />
              </li>
            ))}
          </ul>
          {feed.hasNextPage && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                className="border-[#DEE2E6] bg-[#E9ECEF] text-[#212529] hover:bg-[#DEE2E6]"
                onClick={() => void feed.fetchNextPage()}
                disabled={feed.isFetchingNextPage}
              >
                {feed.isFetchingNextPage ? 'Loading…' : 'Load older activity'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
