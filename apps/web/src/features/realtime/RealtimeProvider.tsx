import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useMatch, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { RealtimeClient, type RealtimeStatus } from './client';
import { invalidationKeys, isRemovalOf, notificationToast, type DomainEvent } from './events';

interface RealtimeState {
  status: RealtimeStatus;
  presence: Record<string, string[]>;
}

const NO_ONE: string[] = [];
const RealtimeContext = createContext<RealtimeState>({ status: 'closed', presence: {} });

/** Keeps one WebSocket open for the signed-in user and maps domain events onto the query cache. */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const userId = useAuth().user?.id;
  const workspaceId = useMatch('/w/:workspaceId/*')?.params.workspaceId ?? null;
  const [state, setState] = useState<RealtimeState>({ status: 'closed', presence: {} });
  const navigateRef = useRef(navigate);
  const clientRef = useRef<RealtimeClient | null>(null);

  useEffect(() => {
    navigateRef.current = navigate;
  });

  useEffect(() => {
    if (!userId) return;
    const onEvent = (event: DomainEvent) => {
      for (const queryKey of invalidationKeys(event)) void qc.invalidateQueries({ queryKey });
      if (event.type === 'presence.changed') {
        const ids = event.data.userIds;
        const userIds = Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : NO_ONE;
        setState((s) => ({ ...s, presence: { ...s.presence, [event.workspaceId]: userIds } }));
      }
      const message = notificationToast(event);
      if (message) toast(message);
      if (isRemovalOf(event, userId)) {
        navigateRef.current('/app');
        toast('You were removed from this workspace');
      }
    };
    const url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/ws`;
    const client = new RealtimeClient(url, {
      onStatus: (status) => setState((s) => ({ ...s, status })),
      onSubscribed: (wid, presence) => setState((s) => ({ ...s, presence: { ...s.presence, [wid]: presence } })),
      onEvent,
      onReconnect: () => void qc.invalidateQueries(),
    });
    clientRef.current = client;
    client.start();
    return () => {
      client.stop();
      clientRef.current = null;
    };
  }, [qc, userId]);

  useEffect(() => {
    clientRef.current?.setWorkspace(workspaceId);
  }, [workspaceId, userId]);

  return <RealtimeContext.Provider value={state}>{children}</RealtimeContext.Provider>;
}

/** User ids currently connected to `workspaceId` (from the last `subscribed` / `presence.changed`). */
export function usePresence(workspaceId: string): string[] {
  return useContext(RealtimeContext).presence[workspaceId] ?? NO_ONE;
}

export function useRealtimeStatus(): RealtimeStatus {
  return useContext(RealtimeContext).status;
}
