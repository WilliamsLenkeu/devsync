import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
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
  beforeEach(() => post.mockReset());

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
});
