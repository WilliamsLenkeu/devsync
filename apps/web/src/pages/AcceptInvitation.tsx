import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useDocumentTitle } from '@/components/layout/useDocumentTitle';
import { Button } from '@/components/ui/button';
import { AuthShell } from '@/features/auth/AuthShell';
import { api, errorMessage } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type { Workspace } from '@/lib/types';

type Phase =
  | { kind: 'empty' }
  | { kind: 'loading' }
  | { kind: 'success' }
  | { kind: 'error'; error: unknown };

export function AcceptInvitationPage() {
  useDocumentTitle('Accept invitation');
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const qc = useQueryClient();
  const navigate = useNavigate();
  const started = useRef(false);
  const [phase, setPhase] = useState<Phase>(token ? { kind: 'loading' } : { kind: 'empty' });

  // Ref guard: StrictMode re-runs effects; a token can only be consumed once.
  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    void (async () => {
      try {
        const ws = await api.post<Workspace>('/invitations/accept', { token });
        void qc.invalidateQueries({ queryKey: qk.workspaces });
        void qc.invalidateQueries({ queryKey: qk.myInvitations });
        toast.success(`Joined ${ws.name}`);
        setPhase({ kind: 'success' });
        navigate(`/w/${ws.id}`, { replace: true });
      } catch (error) {
        setPhase({ kind: 'error', error });
      }
    })();
  }, [token, qc, navigate]);

  if (phase.kind === 'empty') {
    return (
      <AuthShell
        title="Invitation link incomplete"
        description="This link is missing its invitation token. Open the link again from your email or ask for a new invitation."
      >
        <Button
          asChild
          variant="outline"
          className="min-h-10 w-full border-[#DEE2E6] bg-[#E9ECEF] text-[#212529] hover:bg-[#DEE2E6] sm:min-h-9"
        >
          <Link to="/app">Back to workspaces</Link>
        </Button>
      </AuthShell>
    );
  }

  if (phase.kind === 'error') {
    return (
      <AuthShell
        title="Invitation not accepted"
        description={errorMessage(phase.error, 'This invitation could not be accepted.')}
      >
        <Button
          asChild
          variant="outline"
          className="min-h-10 w-full border-[#DEE2E6] bg-[#E9ECEF] text-[#212529] hover:bg-[#DEE2E6] sm:min-h-9"
        >
          <Link to="/app">Back to workspaces</Link>
        </Button>
      </AuthShell>
    );
  }

  if (phase.kind === 'success') {
    return (
      <AuthShell title="You're in" description="Opening your workspace…">
        <p role="status" aria-live="polite" className="text-sm text-[#6C757D]">
          Redirecting…
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Accepting invitation"
      description="Joining the workspace from your invite link."
    >
      <p role="status" aria-live="polite" aria-busy="true" className="text-sm text-[#6C757D]">
        Joining workspace…
      </p>
    </AuthShell>
  );
}
