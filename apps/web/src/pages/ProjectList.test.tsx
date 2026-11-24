import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { can, type WorkspaceRole } from '@devsync/shared';
import type { Action } from '@devsync/shared';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Project } from '@/lib/types';
import { ProjectListPage } from './ProjectList';

const mocks = vi.hoisted(() => ({
  role: 'MEMBER' as WorkspaceRole,
  get: vi.fn<(path: string, params?: unknown) => Promise<unknown>>(),
  post: vi.fn<(path: string, body: unknown) => Promise<unknown>>(),
}));

vi.mock('@/lib/workspace', () => ({
  useWorkspace: () => ({
    workspace: { id: 'ws-1', name: 'Acme' },
    can: (action: Action) => can(mocks.role, action),
  }),
}));

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  api: { get: mocks.get, post: mocks.post, page: vi.fn(), patch: vi.fn(), delete: vi.fn() },
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

const renderPage = (ui: ReactNode) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );

beforeEach(() => {
  mocks.role = 'MEMBER';
  mocks.get.mockReset();
  mocks.post.mockReset();
});

describe('ProjectListPage', () => {
  it('lists projects and hides "Create project" from viewers', async () => {
    mocks.role = 'VIEWER';
    mocks.get.mockResolvedValue([project]);

    renderPage(<ProjectListPage />);

    expect(await screen.findByRole('heading', { name: 'Web app' })).toBeInTheDocument();
    expect(mocks.get).toHaveBeenCalledWith('/workspaces/ws-1/projects', expect.anything());
    expect(screen.queryByRole('button', { name: /create project/i })).not.toBeInTheDocument();
  });

  it('suggests the identifier from the name and creates the project', async () => {
    const user = userEvent.setup();
    mocks.get.mockResolvedValue([]);
    mocks.post.mockResolvedValue({ ...project, id: 'p2', name: 'Dev Sync Web', identifier: 'DSW' });

    renderPage(<ProjectListPage />);
    await user.click(
      (await screen.findAllByRole('button', { name: /create project/i }))[0] as HTMLElement,
    );
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Name'), 'Dev Sync Web');
    expect(within(dialog).getByLabelText('Identifier')).toHaveValue('DSW');

    await user.click(within(dialog).getByRole('button', { name: 'Create project' }));

    await waitFor(() =>
      expect(mocks.post).toHaveBeenCalledWith('/workspaces/ws-1/projects', {
        name: 'Dev Sync Web',
        identifier: 'DSW',
      }),
    );
  });

  it('shows an empty state with a create call-to-action when there are no projects', async () => {
    mocks.get.mockResolvedValue([]);

    renderPage(<ProjectListPage />);

    expect(await screen.findByRole('heading', { name: 'No projects yet' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /create project/i })).toHaveLength(2);
  });
});
