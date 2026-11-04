import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { api, errorMessage } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type { AppNotification } from '@/lib/types';
import { notificationPath } from './notificationView';

export function useUnreadCount() {
  return useQuery({
    queryKey: qk.unreadCount,
    queryFn: async () => (await api.get<{ count: number }>('/notifications/unread-count')).count,
  });
}

/** Latest notifications for the bell popover (fetched only while it is open). */
export function useRecentNotifications(enabled: boolean) {
  return useQuery({
    queryKey: [...qk.notifications, 'recent'],
    queryFn: () => api.page<AppNotification>('/notifications', { limit: 8 }),
    select: (page) => page.data,
    enabled,
  });
}

export function useNotificationPages(unread: boolean) {
  return useInfiniteQuery({
    queryKey: [...qk.notifications, 'pages', { unread }],
    queryFn: ({ pageParam }) =>
      api.page<AppNotification>('/notifications', {
        limit: 30,
        unread: unread || undefined,
        cursor: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

/** Mark-read actions. Every mutation invalidates the `notifications` prefix, which also covers the unread count. */
export function useNotificationActions() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const onSettled = () => qc.invalidateQueries({ queryKey: qk.notifications });
  const onError = (err: unknown) => toast.error(errorMessage(err));

  const markRead = useMutation({
    mutationFn: (id: string) => api.post(`/notifications/${id}/read`),
    onSuccess: onSettled,
    onError,
  });
  const markAll = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: onSettled,
    onError,
  });

  const open = (n: AppNotification) => {
    if (!n.readAt) markRead.mutate(n.id);
    navigate(notificationPath(n));
  };

  return { open, markRead, markAll };
}
