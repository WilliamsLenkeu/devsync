import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { can, type Action, type WorkspaceRole } from '@devsync/shared';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Project, ProjectMember } from '@/lib/types';
import { ProjectOverviewPage } from './ProjectOverview';

const mocks = vi.hoisted(() => ({
  role: 'ADMIN' as WorkspaceRole,
  get: vi.fn<(path: string, params?: unknown) => Promise<unknown>>(),
  page: vi.fn<(path: string, params?: unknown) => Promise<unknown>>(),
  patch: vi.fn<(path: string, body: unknown) => Promise<unknown>>(),
}));

vi.mock('@/lib/workspace', () => ({
  useWorkspace: () => ({
    workspace: { id: 'ws-1', name: 'Acme' },
    can: (action: Action) => can(mocks.role, action),
  }),
}));

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  api: {
    get: mocks.get,
    post: vi.fn(),
    page: mocks.page,
    patch: mocks.patch,
    delete: vi.fn(),
  },
}));

const project: Project = {
  id: 'p1',
  workspaceId: 'ws-1',
  name: 'Web app',
  description: 'The customer portal',
  identifier: 'WEB',
  status: 'ACTIVE',
  taskCounts: { total: 4, done: 1 },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

const member: ProjectMember = {
  userId: 'u1',
  createdAt: '2026-01-01T00:00:00.000Z',
  user: { id: 'u1', name: 'Ada Lovelace', email: 'ada@example.com', avatarUrl: null },
};

const renderPage = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={['/w/ws-1/projects/p1']}>
        <Routes>
          <Route path="/w/:workspaceId/projects/:projectId" element={<ProjectOverviewPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

beforeEach(() => {
  mocks.role = 'ADMIN';
  mocks.get.mockReset();
  mocks.page.mockReset();
  mocks.patch.mockReset();
  mocks.get.mockImplementation(async (path) => {
    if (path === '/projects/p1') return project;
    if (path === '/projects/p1/tasks') return [];
    if (path === '/projects/p1/members') return [member];
    if (path === '/workspaces/ws-1/members') return [member];
    throw new Error(`unexpected GET ${path}`);
  });
  mocks.page.mockResolvedValue({ data: [], nextCursor: null });
});

describe('ProjectOverviewPage', () => {
  it('shows progress, members and activity for viewers without manage actions', async () => {
    mocks.role = 'VIEWER';

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Web app' })).toBeInTheDocument();
    expect(screen.getByText('1 of 4 tasks done')).toBeInTheDocument();
    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Activity' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^archive$/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/add a workspace member/i)).not.toBeInTheDocument();
  });

  it('lets admins open edit and archive dialogs', async () => {
    const user = userEvent.setup();

    renderPage();

    await user.click(await screen.findByRole('button', { name: /^edit$/i }));
    expect(screen.getByRole('dialog', { name: /edit project/i })).toBeInTheDocument();
    expect(screen.queryByLabelText('Identifier')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    await user.click(screen.getByRole('button', { name: /^archive$/i }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent(/archive .web app./i);
  });
});
