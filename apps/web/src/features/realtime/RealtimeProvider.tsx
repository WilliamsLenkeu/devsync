import type { ReactNode } from 'react';

/** Subscribes to the API WebSocket and keeps the query cache fresh (implemented by the realtime agent). */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
