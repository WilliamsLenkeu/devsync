import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';
import { useState } from 'react';
import { ActivityItem } from '@/features/activity/ActivityItem';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState, PageHeader } from '@/components/states';
import { api } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import { useWorkspace } from '@/lib/workspace';
import type { Activity, Project } from '@/lib/types';

const ALL = 'all';

export function ActivityPage() {
  const { workspace } = useWorkspace();
  const wid = workspace.id;
  const [filter, setFilter] = useState(ALL);
  const projectId = filter === ALL ? undefined : filter;

  const projects = useQuery({
    queryKey: qk.projects(wid),
    queryFn: () => api.get<Project[]>(`/workspaces/${wid}/projects`),
  });
  const feed = useInfiniteQuery({
    queryKey: [...qk.activity(wid), filter],
    queryFn: ({ pageParam }) =>
      api.page<Activity>(`/workspaces/${wid}/activity`, { projectId, cursor: pageParam, limit: 30 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const items = feed.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div className="mx-auto max-w-3xl p-6">
      <PageHeader
        title="Activity"
        description="What happened in this workspace, most recent first."
        actions={
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-48" aria-label="Filter by project">
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
        <ul className="divide-y" aria-busy="true" aria-label="Loading activity">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="flex items-center gap-3 py-3">
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
          description="Changes to projects, tasks and members will show up here."
        />
      )}

      {items.length > 0 && (
        <>
          <ul className="divide-y">
            {items.map((a) => (
              <ActivityItem key={a.id} activity={a} />
            ))}
          </ul>
          {feed.hasNextPage && (
            <div className="flex justify-center pt-6">
              <Button variant="outline" onClick={() => void feed.fetchNextPage()} disabled={feed.isFetchingNextPage}>
                {feed.isFetchingNextPage ? 'Loading…' : 'Load more'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
