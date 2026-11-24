import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AcceptInvitationPage } from './AcceptInvitation';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  api: { post },
}));

describe('AcceptInvitationPage', () => {
  beforeEach(() => {
    post.mockReset();
  });

  it('consumes the token exactly once, even under StrictMode, then opens the workspace', async () => {
    post.mockResolvedValue({ id: 'ws1', name: 'Acme' });
    render(
      <StrictMode>
        <QueryClientProvider client={new QueryClient()}>
          <MemoryRouter initialEntries={['/invitations/accept?token=tok123']}>
            <Routes>
              <Route path="/invitations/accept" element={<AcceptInvitationPage />} />
              <Route path="/w/:workspaceId" element={<p>Workspace opened</p>} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </StrictMode>,
    );

    expect(await screen.findByText('Workspace opened')).toBeInTheDocument();
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith('/invitations/accept', { token: 'tok123' });
  });

  it('explains a missing token clearly', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/invitations/accept']}>
          <AcceptInvitationPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Invitation link incomplete' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to workspaces' })).toHaveAttribute('href', '/app');
    expect(post).not.toHaveBeenCalled();
  });

  it('surfaces acceptance failures', async () => {
    let rejectPost!: (reason: Error) => void;
    post.mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectPost = reject;
        }),
    );
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/invitations/accept?token=bad']}>
          <AcceptInvitationPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByRole('status')).toHaveTextContent(/Joining workspace/i);
    rejectPost(new Error('Invitation expired'));

    expect(await screen.findByRole('heading', { name: 'Invitation not accepted' })).toBeInTheDocument();
    expect(screen.getByText('Invitation expired')).toBeInTheDocument();
  });

  it('shows a loading state while accepting', async () => {
    post.mockImplementation(() => new Promise(() => {}));
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/invitations/accept?token=pending']}>
          <AcceptInvitationPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Accepting invitation' })).toBeInTheDocument();
    });
    expect(screen.getByRole('status')).toHaveTextContent(/Joining workspace/i);
  });
});
