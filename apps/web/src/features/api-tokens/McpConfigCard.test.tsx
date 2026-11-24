import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { McpConfigCard } from './McpConfigCard';

describe('McpConfigCard', () => {
  it('stays collapsed and secondary by default', () => {
    const { container } = render(<McpConfigCard token="dsk_test" />);
    const details = container.querySelector('details');
    expect(details).not.toBeNull();
    expect(details?.open).toBe(false);
    expect(screen.getByText(/Optional: MCP for AI agents/)).toBeInTheDocument();
    expect(screen.getByText('Show')).toBeInTheDocument();
  });
});
