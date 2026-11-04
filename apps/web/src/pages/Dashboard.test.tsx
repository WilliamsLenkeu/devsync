import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { can, type Action, type WorkspaceRole } from '@devsync/shared';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Dashboard } from '@/lib/types';
import { DashboardPage } from './Dashboard';

const mocks = vi.hoisted(() => ({
  role: 'MEMBER' as WorkspaceRole,
  get: vi.fn<(path: string, params?: unknown) => Promise<unknown>>(),
}));

vi.mock('@/lib/workspace', () => ({
  useWorkspace: () => ({
    workspace: { id: 'ws-1', name: 'Acme' },
    can: (action: Action) => can(mocks.role, action),
  }),
}));

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  api: { get: mocks.get, post: vi.fn(), page: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const empty: Dashboard = {
  totals: { total: 0, completed: 0, inProgress: 0, overdue: 0 },
  assignedToMe: { count: 0, tasks: [] },
  projectProgress: [],
  recentActivity: [],
};

const populated: Dashboard = {
  totals: { total: 12, completed: 5, inProgress: 3, overdue: 2 },
  assignedToMe: {
    count: 1,
    tasks: [
      {
        id: 't1',
        projectId: 'p1',
        number: 7,
        key: 'WEB-7',
        title: 'Fix login redirect',
        description: null,
        status: 'IN_PROGRESS',
        priority: 'URGENT',
        position: 1,
        dueDate: '2020-01-01T12:00:00.000Z',
        assignee: null,
        reporter: { id: 'u2', name: 'Ada', avatarUrl: null },
        labels: [],
        commentCount: 0,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
  },
  projectProgress: [{ projectId: 'p1', name: 'Web app', identifier: 'WEB', total: 4, done: 1 }],
  recentActivity: [],
};

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );

beforeEach(() => {
  mocks.role = 'MEMBER';
  mocks.get.mockReset();
});

describe('DashboardPage', () => {
  it('invites a new workspace to create its first project', async () => {
    mocks.get.mockResolvedValue(empty);

    renderPage();

    expect(await screen.findByRole('button', { name: /create your first project/i })).toBeInTheDocument();
    expect(mocks.get).toHaveBeenCalledWith('/workspaces/ws-1/dashboard');
  });

  it('hides the create call-to-action from viewers', async () => {
    mocks.role = 'VIEWER';
    mocks.get.mockResolvedValue(empty);

    renderPage();

    expect(await screen.findByRole('heading', { name: 'No projects yet' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /create your first project/i })).not.toBeInTheDocument();
  });

  it('links assigned tasks to their board sheet and shows overdue totals', async () => {
    mocks.get.mockResolvedValue(populated);

    renderPage();

    expect(await screen.findByRole('link', { name: 'Fix login redirect' })).toHaveAttribute(
      'href',
      '/w/ws-1/projects/p1/board?task=t1',
    );
    expect(screen.getByText('Overdue · 1 Jan 2020')).toBeInTheDocument();
    expect(screen.getByText('Overdue').nextElementSibling).toHaveTextContent('2');
  });
});
