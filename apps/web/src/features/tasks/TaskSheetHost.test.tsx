import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useSearchParams } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskSheetHost } from './TaskSheetHost';

const mocks = vi.hoisted(() => ({
  get: vi.fn<(path: string) => Promise<unknown>>(),
  page: vi.fn(async () => ({ data: [], nextCursor: null })),
}));

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  api: {
    get: mocks.get,
    post: vi.fn(),
    page: mocks.page,
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/lib/workspace', () => ({
  useWorkspace: () => ({
    workspace: { id: 'ws-1', name: 'Acme', role: 'MEMBER' },
    can: () => true,
  }),
}));

vi.mock('@/lib/auth', () => ({
  useUser: () => ({ id: 'u1', name: 'Ada', email: 'ada@ex.com', avatarUrl: null, createdAt: '' }),
  useAuth: () => ({ user: { id: 'u1' } }),
}));

function Probe() {
  const [params] = useSearchParams();
  return <p data-testid="qs">{params.toString()}</p>;
}

const task = {
  id: 't1',
  projectId: 'p1',
  number: 1,
  key: 'WEB-1',
  title: 'Ship board',
  description: null,
  status: 'TODO',
  priority: 'MEDIUM',
  position: 1,
  dueDate: null,
  assignee: null,
  reporter: { id: 'u1', name: 'Ada', avatarUrl: null },
  labels: [],
  commentCount: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

beforeEach(() => {
  mocks.get.mockReset();
  mocks.get.mockImplementation(async (path) => {
    if (path === '/tasks/t1') return task;
    if (path === '/projects/p1')
      return {
        ...task,
        id: 'p1',
        name: 'Web',
        identifier: 'WEB',
        status: 'ACTIVE',
        workspaceId: 'ws-1',
        description: null,
        taskCounts: { total: 1, done: 0 },
      };
    if (path === '/projects/p1/members') return [];
    if (path === '/tasks/t1/comments') return [];
    if (path === '/workspaces/ws-1/members') return [];
    throw new Error(`unexpected ${path}`);
  });
  mocks.page.mockResolvedValue({ data: [], nextCursor: null });
});

describe('TaskSheetHost', () => {
  it('opens on ?task= and clears the param on close', async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter initialEntries={['/w/ws-1/board?q=login&task=t1']}>
          <Routes>
            <Route
              path="/w/:workspaceId/board"
              element={
                <>
                  <Probe />
                  <TaskSheetHost />
                </>
              }
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByDisplayValue('Ship board')).toBeInTheDocument();
    expect(screen.getByTestId('qs').textContent).toContain('task=t1');

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.getByTestId('qs').textContent).toBe('q=login');
  });
});
