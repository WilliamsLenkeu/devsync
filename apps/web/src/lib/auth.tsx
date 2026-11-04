import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api, ApiError, SESSION_EXPIRED_EVENT } from './api';
import { qk } from './queryKeys';
import type { User } from './types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { email: string; name: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  /** Replace the cached user after a profile update. */
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { data: user = null, isLoading } = useQuery({
    queryKey: qk.me,
    queryFn: async () => {
      try {
        return (await api.get<{ user: User }>('/auth/me')).user;
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
    staleTime: Infinity,
    retry: false,
  });

  const reset = useCallback(() => {
    qc.clear();
    qc.setQueryData(qk.me, null);
  }, [qc]);

  useEffect(() => {
    window.addEventListener(SESSION_EXPIRED_EVENT, reset);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, reset);
  }, [reset]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      isLoading,
      login: async (email, password) => {
        const res = await api.post<{ user: User }>('/auth/login', { email, password });
        qc.setQueryData(qk.me, res.user);
      },
      register: async (input) => {
        const res = await api.post<{ user: User }>('/auth/register', input);
        qc.setQueryData(qk.me, res.user);
      },
      logout: async () => {
        await api.post('/auth/logout').catch(() => undefined);
        reset();
      },
      setUser: (u) => qc.setQueryData(qk.me, u),
    }),
    [user, isLoading, qc, reset],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** Current user, guaranteed non-null (use only below <RequireAuth>). */
export function useUser(): User {
  const { user } = useAuth();
  if (!user) throw new Error('useUser called while signed out');
  return user;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return <>{children}</>;
}

/** Send signed-in users away from /login and /register. */
export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const next = new URLSearchParams(useLocation().search).get('next');
  if (isLoading) return null;
  // Only follow same-origin relative paths (open-redirect guard).
  const safe = next && next.startsWith('/') && !next.startsWith('//') ? next : '/app';
  return user ? <Navigate to={safe} replace /> : <>{children}</>;
}
