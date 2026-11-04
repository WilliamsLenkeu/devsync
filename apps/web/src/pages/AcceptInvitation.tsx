import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useDocumentTitle } from '@/components/layout/useDocumentTitle';
import { Button } from '@/components/ui/button';
import { api, errorMessage } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type { Workspace } from '@/lib/types';

export function AcceptInvitationPage() {
  useDocumentTitle('Accept invitation');
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const qc = useQueryClient();
  const navigate = useNavigate();
  const started = useRef(false);

  const accept = useMutation({
    mutationFn: () => api.post<Workspace>('/invitations/accept', { token }),
    onSuccess: (ws) => {
      void qc.invalidateQueries({ queryKey: qk.workspaces });
      void qc.invalidateQueries({ queryKey: qk.myInvitations });
      toast.success(`Joined ${ws.name}`);
      navigate(`/w/${ws.id}`, { replace: true });
    },
  });
  const { mutate } = accept;

  // Ref guard: StrictMode runs effects twice and a token can only be consumed once.
  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    mutate();
  }, [token, mutate]);

  if (!token) {
    return (
      <Result
        title="Invitation link incomplete"
        message="This link is missing its invitation token. Open the link again from your email or ask for a new invitation."
      />
    );
  }
  if (accept.isError) {
    return <Result title="Invitation not accepted" message={errorMessage(accept.error)} />;
  }
  return (
    <div role="status" aria-live="polite" className="grid min-h-[60dvh] place-items-center p-6">
      <p className="text-sm text-muted-foreground">Joining workspace…</p>
    </div>
  );
}

function Result({ title, message }: { title: string; message: string }) {
  return (
    <div className="grid min-h-[60dvh] place-items-center p-6">
      <div className="max-w-md text-center">
        <h1 className="text-lg font-semibold tracking-tight text-balance">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground text-pretty">{message}</p>
        <Button asChild variant="outline" className="mt-6">
          <Link to="/app">Back to workspaces</Link>
        </Button>
      </div>
    </div>
  );
}
