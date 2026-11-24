import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { LandingPage } from './Landing';

vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('gsap', () => ({
  default: {
    registerPlugin: vi.fn(),
    context: (_fn: () => void, _scope?: unknown) => {
      // Skip real timeline in jsdom; reduced-motion path still renders content.
      return { revert: vi.fn() };
    },
    from: vi.fn(),
    set: vi.fn(),
    timeline: () => ({ to: vi.fn().mockReturnThis(), fromTo: vi.fn().mockReturnThis() }),
    utils: { toArray: () => [] },
  },
}));
vi.mock('gsap/ScrollTrigger', () => ({ ScrollTrigger: {} }));

describe('LandingPage', () => {
  it('ships a product reel with real screenshots and full capabilities', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'DevSync' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Product reel' })).toBeInTheDocument();
    expect(screen.getByText(/See what is on you/i)).toBeInTheDocument();
    expect(screen.getByText(/Move work where the team can see it/i)).toBeInTheDocument();
    expect(screen.getByAltText(/Kanban board/i)).toHaveAttribute('src', '/screenshots/03-board.png');
    expect(screen.getByRole('heading', { name: /What ships today/i })).toBeInTheDocument();
    expect(screen.getByText('API tokens')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Create account' })[0]).toHaveAttribute('href', '/register');
    expect(screen.queryByText(/mcpServers/i)).not.toBeInTheDocument();
  });
});
